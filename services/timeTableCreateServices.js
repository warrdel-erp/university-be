import * as timeTableCreateRepository from "../repository/timeTablecreateRepository.js";
import { getSingleTimeTableById, getTimeTableStructureById, getStructureCourseMappingById, getMappedStructuresForCourseSession } from "../repository/timeTableRepository.js";
import { getTeacherDetailsByTeacherSubjectId } from "../repository/teacherSubjectMappingRepository.js";
import {
  getSingleFaculityLoadDetails,
  updateFaculityLoad,
  updateFaculityLoadByEmployeeId,
} from "../repository/faculityLoadRepository.js";
import sequelize from "../database/sequelizeConfig.js";
import { getHolidayStartEndDate } from "../repository/holidayRepository.js";
import { decimalAdd, toMoneyNumber } from "../utility/decimalMoney.js";
import { resolveProgramTerm, resolveTimeTableRoutineSection, stripRoutinePersistPayload } from "../utility/classSectionIncludes.js";
import {
  findClassSectionTermById,
} from "../repository/classSectionTermRepository.js";
import { buildTermName, termsForYear } from "../utility/courseTerms.js";
import { formatQueryDate } from "../utility/helper.js";
import { randomUUID } from "crypto";

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function toDateOnlyString(value) {
  if (value == null || value === '') {
    return null;
  }
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) {
      return match[1];
    }
  }
  return formatQueryDate(value);
}

function assertRoutineDatesWithinStructure(courseMapping, startingDate, endingDate) {
  if (!courseMapping) {
    throw new Error('Invalid mapperId. Map the course to the structure first');
  }

  const mappingStart = toDateOnlyString(courseMapping.startingDate);
  const mappingEnd = toDateOnlyString(courseMapping.endingDate);
  const routineStart = toDateOnlyString(startingDate);
  const routineEnd = toDateOnlyString(endingDate);

  if (!mappingStart || !mappingEnd) {
    throw new Error('Structure course mapping startingDate and endingDate are required');
  }
  if (!routineStart || !routineEnd) {
    throw new Error('startingDate and endingDate are required');
  }
  if (routineStart > routineEnd) {
    throw new Error('Routine endingDate cannot be before startingDate');
  }
  if (routineStart < mappingStart) {
    throw new Error(
      `Routine startingDate (${routineStart}) cannot be before mapping startingDate (${mappingStart})`,
    );
  }
  if (routineEnd > mappingEnd) {
    throw new Error(
      `Routine endingDate (${routineEnd}) cannot be after mapping endingDate (${mappingEnd})`,
    );
  }
}

const COPY_OVERRIDE_FIELDS = [
  'timeTableRoutineId', 'employeeId', 'subjectId', 'electiveSubjectId',
  'teacherSubjectMappingId', 'classRoomSectionId', 'isSameTeacher', 'teacherType',
  'isAttendence', 'isOverridingSyblingElectives', 'timeTableType',
];

const MAPPING_REQUEST_KEYS = [
  'classSectionTermIds', 'slots', 'timeTableCreationIds', 'classSectionsId',
  'classSectionId', 'classSectionTermId', 'sourceTimeTableMappingId',
  'copyTarget', 'copiedFromTimeTableMappingId',
];

function parseWeekOff(raw) {
  if (raw == null) return [];
  let list = raw;
  if (typeof list === 'string') {
    try { list = JSON.parse(list); } catch { return []; }
  }
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const day of list) out.push(String(day).toLowerCase());
  return out;
}

function nextPeriodSlot(periodRows, creationId) {
  let after = false;
  for (const row of periodRows) {
    const p = row.get ? row.get({ plain: true }) : row;
    if (Number(p.timeTableCreationId) === Number(creationId)) { after = true; continue; }
    if (after && !p.isBreak) return p;
  }
  return null;
}

function nextWorkingDay(day, weekOffDays) {
  const start = DAYS.findIndex((d) => d.toLowerCase() === String(day).toLowerCase());
  if (start < 0) throw new Error(`Invalid day: ${day}`);
  for (let i = 1; i <= DAYS.length; i++) {
    const next = DAYS[(start + i) % DAYS.length];
    if (!weekOffDays.includes(next.toLowerCase())) return next;
  }
  throw new Error('No next working day available in this timetable structure');
}

function normalizeSlots(data) {
  const source = Array.isArray(data.slots) && data.slots.length ? data.slots : [data];
  const slots = [];
  for (const slot of source) {
    const timeTableCreationId = Number(slot.timeTableCreationId);
    const period = Number(slot.period);
    if (!timeTableCreationId || !period) {
      throw new Error('timeTableCreationId and period are required');
    }
    slots.push({ timeTableCreationId, period });
  }
  return slots;
}

function resolveTermIds(data, routine) {
  if (Array.isArray(data.classSectionTermIds) && data.classSectionTermIds.length) {
    const ids = [];
    for (const id of data.classSectionTermIds) {
      const num = Number(id);
      if (num) ids.push(num);
    }
    return [...new Set(ids)];
  }
  const single = data.classSectionTermId ?? routine?.classSectionTermId;
  return single != null && single !== '' ? [Number(single)] : [];
}

function applyCopyOverrides(base, request) {
  const payload = { ...base };
  for (const field of COPY_OVERRIDE_FIELDS) {
    const value = request[field];
    if (value != null && value !== '') payload[field] = value;
  }
  return payload;
}

function stripMappingRow(row) {
  for (const key of MAPPING_REQUEST_KEYS) delete row[key];
  return row;
}

function assertRoutineNotStarted(startingDate) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const start = new Date(startingDate);
  start.setHours(0, 0, 0, 0);
  if (now > start) {
    throw new Error('Cannot add or update mapping for a routine after its starting date.');
  }
}

function shapeTimeTableCreateList(rows, course) {
  const coursePlain = course?.get ? course.get({ plain: true }) : course;
  const byYear = {};
  const meta = {
    courseId: coursePlain?.courseId ?? null,
    sessionId: null,
    courseName: coursePlain?.courseName ?? null,
    termType: coursePlain?.termType ?? null,
  };

  for (const row of rows) {
    const plain = row.get({ plain: true });
    const section = plain.classSection;
    if (!section?.year || !plain.term) continue;

    const cs = section.courseSection;
    if (meta.courseName == null && cs?.courseName) meta.courseName = cs.courseName;
    if (meta.termType == null && cs?.termType) meta.termType = cs.termType;
    if (meta.courseId == null && section.courseId != null) meta.courseId = section.courseId;
    if (meta.sessionId == null && section.sessionId != null) meta.sessionId = section.sessionId;

    const year = Number(section.year);
    const term = Number(plain.term);
    const sectionId = Number(plain.classSectionsId);

    if (!byYear[year]) byYear[year] = {};
    if (!byYear[year][sectionId]) {
      byYear[year][sectionId] = {
        classSectionsId: sectionId,
        section: section.section,
        year,
        classSession: section.classSession,
        termsByNum: {},
      };
    }

    byYear[year][sectionId].termsByNum[term] = {
      term,
      termName: coursePlain ? buildTermName(coursePlain.termType, term) : `Term ${term}`,
      classSectionTermId: plain.classSectionTermId,
      classSectionsId: sectionId,
      timeTableRoutines: plain.timeTableRoutines || [],
    };
  }

  const duration = Number(coursePlain?.courseDuration) || 0;
  const yearNumbers = [];
  if (duration > 0) {
    for (let y = 1; y <= duration; y++) yearNumbers.push(y);
  } else {
    for (const y of Object.keys(byYear)) yearNumbers.push(Number(y));
    yearNumbers.sort((a, b) => a - b);
  }

  const years = [];
  for (const yearNum of yearNumbers) {
    const yearBucket = byYear[yearNum] || {};
    const sectionIds = Object.keys(yearBucket).map(Number);
    sectionIds.sort((a, b) => a - b);

    const classSections = [];
    for (const sectionId of sectionIds) {
      const sectionEntry = yearBucket[sectionId];
      const termNumbers = coursePlain
        ? termsForYear(yearNum, coursePlain)
        : Object.keys(sectionEntry.termsByNum).map(Number).sort((a, b) => a - b);

      const semesters = [];
      for (const termNum of termNumbers) {
        const existing = sectionEntry.termsByNum[termNum];
        if (existing) {
          semesters.push(existing);
        } else {
          semesters.push({
            term: termNum,
            termName: coursePlain ? buildTermName(coursePlain.termType, termNum) : `Term ${termNum}`,
            classSectionTermId: null,
            classSectionsId: sectionId,
            timeTableRoutines: [],
          });
        }
      }

      classSections.push({
        classSectionsId: sectionEntry.classSectionsId,
        section: sectionEntry.section,
        year: sectionEntry.year,
        classSession: sectionEntry.classSession,
        semesters,
      });
    }

    classSections.sort((a, b) => String(a.section).localeCompare(String(b.section)));
    years.push({ year: yearNum, classSections });
  }

  return { ...meta, years };
}

export async function resolveRoutinePlacement(data, options = {}) {
  const classSectionTermId = data.classSectionTermId;
  if (classSectionTermId == null || classSectionTermId === '') {
    throw new Error('classSectionTermId is required');
  }

  const termRow = await findClassSectionTermById(Number(classSectionTermId), options);
  if (!termRow) {
    throw new Error('classSectionTermId not found');
  }

  const plain = termRow.get ? termRow.get({ plain: true }) : termRow;
  return {
    ...data,
    classSectionTermId: Number(classSectionTermId),
    classSectionsId:
      plain.classSectionsId
      ?? plain.classSection?.classSectionsId
      ?? null,
    term: plain.term ?? null,
  };
}

function routineScopeWhere(classSectionTermId) {
  return { classSectionTermId: Number(classSectionTermId) };
}

function buildCopyPayload(sourceRow, target, request) {
  const src = sourceRow.get ? sourceRow.get({ plain: true }) : sourceRow;
  const payload = applyCopyOverrides({
    timeTableRoutineId: src.timeTableRoutineId,
    timeTableNameId: src.timeTableNameId,
    timeTableCreationId: target.timeTableCreationId,
    day: target.day,
    period: target.period,
    employeeId: src.employeeId,
    subjectId: src.subjectId,
    electiveSubjectId: src.electiveSubjectId,
    teacherSubjectMappingId: src.teacherSubjectMappingId,
    classRoomSectionId: src.classRoomSectionId,
    isSameTeacher: src.isSameTeacher,
    teacherType: src.teacherType,
    isAttendence: src.isAttendence,
    isOverridingSyblingElectives: src.isOverridingSyblingElectives,
    timeTableType: src.timeTableType,
    copiedFromTimeTableMappingId: src.timeTableMappingId,
  }, request);

  payload.timeTableRoutineId = src.timeTableRoutineId;
  payload.timeTableNameId = src.timeTableNameId;
  payload.timeTableCreationId = target.timeTableCreationId;
  payload.day = target.day;
  payload.period = target.period;
  payload.copiedFromTimeTableMappingId = src.timeTableMappingId;

  return payload;
}

async function resolveCopyPayloads(data, options) {
  const sourceId = Number(data.sourceTimeTableMappingId);
  const source = await timeTableCreateRepository.getMappingCopySourceRepository(sourceId, options);
  if (!source) {
    throw new Error(`Source mapping ${sourceId} not found`);
  }

  const src = source.get({ plain: true });
  let day = src.day;
  let period = Number(src.period);
  let timeTableCreationId = Number(src.timeTableCreationId);

  if (data.copyTarget === 'nextPeriod') {
    const periodRows = await timeTableCreateRepository.getStructurePeriodsRepository(
      src.timeTableNameId,
      options,
    );
    const next = nextPeriodSlot(periodRows, src.timeTableCreationId);
    if (!next) {
      throw new Error('No next period available for this timetable structure');
    }
    period += 1;
    timeTableCreationId = Number(next.timeTableCreationId);
  } else if (data.copyTarget === 'nextDay') {
    const structure = await timeTableCreateRepository.getStructureWeekOffRepository(
      src.timeTableNameId,
      options,
    );
    day = nextWorkingDay(src.day, parseWeekOff(structure?.weekOff));
  } else {
    throw new Error('copyTarget must be nextPeriod or nextDay');
  }

  const occupied = await timeTableCreateRepository.findMappingAtSlotRepository(
    {
      timeTableRoutineId: src.timeTableRoutineId,
      day,
      period,
      timeTableCreationId,
    },
    options,
  );
  if (occupied) {
    throw new Error(`Target cell already has a mapping on ${day} period ${period}`);
  }

  const sourceCellMappings = await timeTableCreateRepository.getSourceCellMappingsRepository(
    sourceId,
    options,
  );
  const sourceRows = sourceCellMappings.length ? sourceCellMappings : [source];
  const target = { day, period, timeTableCreationId };
  const payloads = [];

  for (const sourceRow of sourceRows) {
    payloads.push(buildCopyPayload(sourceRow, target, data));
  }

  return payloads;
}

async function assertNoSlotConflicts({
  employeeId,
  classRoomSectionId,
  day,
  periodInfo,
  startingDate,
  endingDate,
  conflictOptions,
  transaction,
}) {
  const { startTime, endTime } = periodInfo;

  if (employeeId) {
    const conflict = await timeTableCreateRepository.checkTeacherConflictRepository(
      employeeId,
      day,
      startTime,
      endTime,
      startingDate,
      endingDate,
      conflictOptions,
      transaction,
    );
    if (conflict) {
      const section = resolveTimeTableRoutineSection(conflict.timeTablecreate);
      throw new Error('Teacher conflict: teacher already scheduled for this slot');
    }
  }

  if (classRoomSectionId) {
    const conflict = await timeTableCreateRepository.checkRoomConflictRepository(
      classRoomSectionId,
      day,
      startTime,
      endTime,
      startingDate,
      endingDate,
      conflictOptions,
      transaction,
    );
    if (conflict) {
      const section = resolveTimeTableRoutineSection(conflict.timeTablecreate);
      throw new Error('Room conflict: classroom already occupied for this slot');
    }
  }
}

async function addFacultyLoadForEmployee(employeeId, periodLength, transaction) {
  if (!employeeId || periodLength <= 0) {
    return;
  }

  const facultyLoad = await getSingleFaculityLoadDetails(employeeId);
  const existingLoad = toMoneyNumber(
    facultyLoad?.[0]?.dataValues?.currentLoad ?? facultyLoad?.[0]?.currentLoad,
  );
  await updateFaculityLoadByEmployeeId(
    employeeId,
    { currentLoad: decimalAdd(existingLoad, periodLength) },
    transaction,
  );
}

async function resolveCombinedRoutineTargets(anchorRoutine, classSectionTermIds, transaction) {
  const targets = [];

  for (const classSectionTermId of classSectionTermIds) {
    if (Number(anchorRoutine.classSectionTermId) === Number(classSectionTermId)) {
      targets.push({
        classSectionTermId: Number(classSectionTermId),
        timeTableRoutineId: anchorRoutine.timeTableRoutineId,
      });
      continue;
    }

    const peerRoutine = await timeTableCreateRepository.findRoutineForCombinedSessionRepository(
      {
        classSectionTermId,
        timetableStructureCourseMapperId: anchorRoutine.timetableStructureCourseMapperId,
        timeTableType: anchorRoutine.timeTableType || 'normal',
        startingDate: anchorRoutine.startingDate,
        endingDate: anchorRoutine.endingDate,
      },
      { transaction },
    );

    if (!peerRoutine) {
      throw new Error(
        `No matching timetable routine found for classSectionTermId ${classSectionTermId}. Create the section routine first.`,
      );
    }

    targets.push({
      classSectionTermId: Number(classSectionTermId),
      timeTableRoutineId: peerRoutine.timeTableRoutineId,
    });
  }

  return targets;
}

export async function addtimeTableCreate(data, createdBy, updatedBy) {
  const transaction = await sequelize.transaction();

  try {
    data.createdBy = createdBy;
    data.updatedBy = updatedBy;

    const timeTableType = data.timeTableType ?? 'normal';

    const courseMapping = await getStructureCourseMappingById(
      data.timetableStructureCourseMapperId,
      { transaction },
    );
    if (!courseMapping) {
      throw new Error('Invalid mapperId. Map the course to the structure first');
    }

    if (timeTableType === 'normal' && (data.classSectionTermId == null || data.classSectionTermId === '')) {
      throw new Error('classSectionTermId is required');
    }

    let placement = { ...data };
    if (data.classSectionTermId != null && data.classSectionTermId !== '') {
      placement = await resolveRoutinePlacement(data, { transaction });
    }

    if (timeTableType === 'normal' && !placement.classSectionTermId) {
      throw new Error('classSectionTermId is required');
    }

    if (placement.classSectionTermId) {
      const termRow = await findClassSectionTermById(placement.classSectionTermId, { transaction });
      if (!termRow) {
        throw new Error('classSectionTermId not found');
      }
      const section = termRow.get({ plain: true }).classSection;
      if (!section) {
        throw new Error('class section not found for classSectionTermId');
      }
      if (Number(section.courseId) !== Number(courseMapping.courseId)) {
        throw new Error('classSectionTermId course does not match structure course mapping');
      }
      if (Number(section.sessionId) !== Number(courseMapping.sessionId)) {
        throw new Error('classSectionTermId session does not match structure course mapping');
      }
      placement.courseId = section.courseId;
    } else if (!placement.courseId) {
      placement.courseId = courseMapping.courseId;
    }

    if (!placement.courseId) {
      throw new Error('courseId is required — resolve from classSectionTermId or course mapping');
    }

    delete placement.term;
    delete placement.classSectionId;
    delete placement.classSectionsId;
    delete placement.sessionId;
    delete placement.timeTableNameId;

    if (placement.startingDate && placement.endingDate) {
      assertRoutineDatesWithinStructure(
        courseMapping,
        placement.startingDate,
        placement.endingDate,
      );
      placement.startingDate = toDateOnlyString(placement.startingDate);
      placement.endingDate = toDateOnlyString(placement.endingDate);
    } else {
      throw new Error('startingDate and endingDate are required');
    }

    placement.timetableStructureCourseMapperId = courseMapping.timetableStructureCourseMapperId;

    if (
      placement.classSectionTermId
      && placement.startingDate
      && placement.endingDate
    ) {
      const overlap = await timeTableCreateRepository.checkRoutineOverlapRepository({
        classSectionTermId: placement.classSectionTermId,
        startingDate: placement.startingDate,
        endingDate: placement.endingDate,
        excludeRoutineId: placement.timeTableRoutineId,
      });

      if (overlap) {
        throw new Error('Routine already exists for this section in the selected date range');
      }
    }

    let result;

    if (placement.timeTableRoutineId && placement.previousDate) {
      await timeTableCreateRepository.changeTimeTableCreate(
        placement.timeTableRoutineId,
        {
          endingDate: placement.previousDate,
          updatedBy,
        },
        transaction
      );

      const { timeTableRoutineId, previousDate, ...newCreateData } = placement;

      result = await timeTableCreateRepository.addTimeTableCreate(
        newCreateData,
        transaction
      );
    } else {
      result = await timeTableCreateRepository.addTimeTableCreate(
        placement,
        transaction
      );
    }

    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function gettimeTableCreateDetails(query = {}) {
  const courseId = query.courseId != null ? Number(query.courseId) : null;
  const sessionId = query.sessionId != null ? Number(query.sessionId) : null;

  const rows = await timeTableCreateRepository.findClassSectionTermsWithRoutines({
    courseId,
    sessionId,
  });

  let course = null;
  if (courseId) {
    course = await timeTableCreateRepository.findCourseById(courseId);
  }

  return shapeTimeTableCreateList(rows, course);
}

export async function getSingletimeTableCreateDetails(courseId) {
  const result = await timeTableCreateRepository.getSingleTimeTableCreateDetails(courseId);

  return result;
}

export async function getTimeTableByCourseAndSection(courseId, classSectionTermId, timeTableType) {
  const data = await timeTableCreateRepository.getTimeTableByCourseAndSection(
    courseId,
    classSectionTermId,
    timeTableType,
  );

  if (!Array.isArray(data) || !data.length) return [];

  const result = [];
  for (const item of data) {
    const mapping = item.structureCourseMapping;
    const structure = mapping.timeTableStructure;
    let weekOff = structure.weekOff;
    if (typeof weekOff === 'string') {
      weekOff = JSON.parse(weekOff);
    }
    if (!Array.isArray(weekOff)) {
      weekOff = [];
    }

    const periods = [];
    for (const period of structure.timeTableName || []) {
      periods.push({
        startTime: period.startTime,
        endTime: period.endTime,
        timeTableCreationId: period.timeTableCreationId,
        type: period.type,
        periodGap: period.periodGap,
        periodLength: period.periodLength,
        isBreak: period.isBreak,
        periodName: period.periodName,
        classSectionsId: item.classSectionsId,
        classSectionTermId: item.classSectionTermId,
      });
    }

    const section = resolveTimeTableRoutineSection(item);
    const firstPeriod = structure.timeTableName && structure.timeTableName[0];

    result.push({
      timeTableRoutineId: item.timeTableRoutineId,
      timeTableType: item.timeTableType,
      name: structure.name,
      isPublish: item.isPublish,
      timeTableNameId: mapping.timeTableNameId,
      timetableStructureCourseMapperId: item.timetableStructureCourseMapperId,
      maximumPeriod: firstPeriod ? firstPeriod.maximumPeriod : undefined,
      isCourse: firstPeriod ? firstPeriod.isCourse : undefined,
      weekOff,
      courseId: item.courseId,
      classSectionsId: section ? section.classSectionsId : null,
      classSectionTermId: item.classSectionTermId,
      classSectionsName: section ? section.section : undefined,
      courseName: item.timeTableCourse ? item.timeTableCourse.courseName : undefined,
      startingDate: item.startingDate,
      endingDate: item.endingDate,
      timeTableClassSectionTerm: item.timeTableClassSectionTerm,
      timeTableClassSection: section,
      periods,
    });
  }

  return result;
}

export async function updateTimeTableCreate(TimeTableCreateId, info, updatedBy) {
  info.updatedBy = updatedBy;
  const data = await timeTableCreateRepository.updateTimeTableCreate(TimeTableCreateId, info);
  return data;
}

export async function deleteTimeTableCreate(TimeTableCreateId) {
  return await timeTableCreateRepository.deleteTimeTableCreate(TimeTableCreateId);
}

export async function deletetimeTableMapping(timeTableMappingId, options = {}) {
  return await timeTableCreateRepository.deletetimeTableMapping(timeTableMappingId, options);
}

export async function addtimeTableMapping(data, createdBy, updatedBy) {
  const transaction = await sequelize.transaction();

  try {
    if (data.sourceTimeTableMappingId != null) {
      const copyPayloads = await resolveCopyPayloads(data, { transaction });
      if (!copyPayloads.length) {
        throw new Error(`Source mapping ${data.sourceTimeTableMappingId} not found`);
      }

      const firstPayload = copyPayloads[0];
      const routine = await timeTableCreateRepository.getRoutineByIdRepository(
        firstPayload.timeTableRoutineId,
        { transaction },
      );
      if (!routine) {
        throw new Error('Invalid timeTableRoutineId');
      }

      assertRoutineNotStarted(routine.startingDate);

      const periodInfo = await timeTableCreateRepository.getPeriodInfoRepository(
        firstPayload.timeTableCreationId,
      );
      if (!periodInfo) {
        throw new Error(`Invalid timeTableCreationId: ${firstPayload.timeTableCreationId}`);
      }

      const periodLength = toMoneyNumber(periodInfo.timeTableName?.periodLength ?? 0);
      const conflictOptions = {
        allowedClassSectionTermIds: [Number(routine.classSectionTermId)],
        excludeCombinedGroupId: null,
      };

      for (const payload of copyPayloads) {
        await assertNoSlotConflicts({
          employeeId: payload.employeeId,
          classRoomSectionId: payload.classRoomSectionId,
          day: payload.day,
          periodInfo,
          startingDate: routine.startingDate,
          endingDate: routine.endingDate,
          conflictOptions,
        });
      }

      const createdMappings = [];
      for (const payload of copyPayloads) {
        const rowData = stripMappingRow({
          ...payload,
          createdBy,
          updatedBy,
        });

        if (rowData.timeTableType === 'elective') {
          rowData.isSameTeacher = false;
        }

        const result = await timeTableCreateRepository.addtimeTableMapping(rowData, transaction);
        createdMappings.push({
          timeTableMappingId: result.timeTableMappingId,
          timeTableRoutineId: rowData.timeTableRoutineId,
          classSectionTermId: routine.classSectionTermId,
          timeTableCreationId: rowData.timeTableCreationId,
          period: rowData.period,
          day: rowData.day,
          copiedFromTimeTableMappingId: payload.copiedFromTimeTableMappingId,
        });
      }

      for (const payload of copyPayloads) {
        await addFacultyLoadForEmployee(payload.employeeId, periodLength, transaction);
      }

      await transaction.commit();
      return {
        isCopy: true,
        copiedFromTimeTableMappingId: Number(data.sourceTimeTableMappingId),
        mappings: createdMappings,
      };
    }

    const payload = data;

    const {
      timeTableRoutineId,
      day,
      classRoomSectionId,
      employeeId,
      combinedGroupId: existingCombinedGroupId,
    } = payload;

    if (!timeTableRoutineId) {
      throw new Error('timeTableRoutineId is required');
    }

    const routine = await timeTableCreateRepository.getRoutineByIdRepository(
      timeTableRoutineId,
      { transaction },
    );
    if (!routine) {
      throw new Error('Invalid timeTableRoutineId');
    }

    const termIds = resolveTermIds(payload, routine);

    assertRoutineNotStarted(routine.startingDate);

    const slots = normalizeSlots(payload);
    const isCombined = termIds.length > 1;
    const combinedGroupId = isCombined ? (existingCombinedGroupId || randomUUID()) : null;

    // With term id(s): normal / combined section flow.
    // Without term id: still allow mapping on this routine (e.g. elective with null classSectionTermId).
    let routineTargets;
    if (termIds.length > 0) {
      routineTargets = await resolveCombinedRoutineTargets(routine, termIds, transaction);
    } else {
      routineTargets = [{
        classSectionTermId: routine.classSectionTermId != null
          ? Number(routine.classSectionTermId)
          : null,
        timeTableRoutineId: Number(timeTableRoutineId),
      }];
    }

    const conflictOptions = {
      allowedClassSectionTermIds: termIds,
      excludeCombinedGroupId: existingCombinedGroupId || null,
    };

    let totalPeriodLength = 0;
    const createdMappings = [];

    for (const slot of slots) {
      const periodInfo = await timeTableCreateRepository.getPeriodInfoRepository(slot.timeTableCreationId);
      if (!periodInfo) {
        throw new Error(`Invalid timeTableCreationId: ${slot.timeTableCreationId}`);
      }

      totalPeriodLength = decimalAdd(
        totalPeriodLength,
        toMoneyNumber(periodInfo.timeTableName?.periodLength ?? 0),
      );

      await assertNoSlotConflicts({
        employeeId,
        classRoomSectionId,
        day,
        periodInfo,
        startingDate: routine.startingDate,
        endingDate: routine.endingDate,
        conflictOptions,
      });

      for (const target of routineTargets) {
        const rowData = stripMappingRow({
          ...payload,
          timeTableRoutineId: target.timeTableRoutineId,
          timeTableCreationId: slot.timeTableCreationId,
          period: slot.period,
          combinedGroupId,
          createdBy,
          updatedBy,
        });

        if (rowData.timeTableType === 'elective') {
          rowData.isSameTeacher = false;
        }

        const result = await timeTableCreateRepository.addtimeTableMapping(rowData, transaction);
        createdMappings.push({
          timeTableMappingId: result.timeTableMappingId,
          timeTableRoutineId: target.timeTableRoutineId,
          classSectionTermId: target.classSectionTermId,
          timeTableCreationId: slot.timeTableCreationId,
          period: slot.period,
          combinedGroupId,
          copiedFromTimeTableMappingId: payload.copiedFromTimeTableMappingId ?? null,
        });
      }
    }

    await addFacultyLoadForEmployee(employeeId, totalPeriodLength, transaction);

    await transaction.commit();

    if (isCombined || slots.length > 1) {
      return {
        isCombined,
        combinedGroupId,
        classSectionTermIds: termIds,
        mappings: createdMappings,
      };
    }

    return createdMappings[0];
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function cloneTimeTableRoutine(
  previousRoutineId,
  startingDate,
  endingDate,
  createdBy,
  updatedBy,
  previousDate,
) {
  const transaction = await sequelize.transaction();

  const routineCloneFields = [
    'timetableStructureCourseMapperId',
    'courseId',
    'academicYearId',
    'classSectionTermId',
    'campusId',
    'instituteId',
    'timeTableType',
  ];

  const mappingCloneFields = [
    'timeTableNameId',
    'timeTableCreationId',
    'employeeId',
    'electiveSubjectId',
    'subjectId',
    'teacherSubjectMappingId',
    'classRoomSectionId',
    'isSameTeacher',
    'day',
    'teacherType',
    'isAttendence',
    'period',
    'timeTableType',
    'isOverridingSyblingElectives',
    'combinedGroupId',
  ];

  try {
    const previousRoutine = await timeTableCreateRepository.getFullRoutineDetailsRepository(previousRoutineId);

    if (!previousRoutine) {
      const error = new Error('Routine not found');
      error.statusCode = 404;
      throw error;
    }

    const previousPlain = previousRoutine.get({ plain: true });
    const start = toDateOnlyString(startingDate);
    const end = toDateOnlyString(endingDate);
    const previousEnd = previousDate != null
      ? toDateOnlyString(previousDate)
      : null;

    const previousMapping = await getStructureCourseMappingById(
      previousPlain.timetableStructureCourseMapperId,
      { transaction },
    );
    if (!previousMapping) {
      const error = new Error('Structure course mapping not found');
      error.statusCode = 404;
      throw error;
    }

    const structure = await getTimeTableStructureById(previousMapping.timeTableNameId, { transaction });
    if (!structure) {
      const error = new Error('timeTableNameId not found');
      error.statusCode = 404;
      throw error;
    }

    assertRoutineDatesWithinStructure(previousMapping, start, end);

    if (previousEnd != null) {
      if (previousEnd < toDateOnlyString(previousPlain.startingDate)) {
        const error = new Error('previousDate before routine start');
        error.statusCode = 400;
        throw error;
      }

      await timeTableCreateRepository.changeTimeTableCreate(
        previousRoutineId,
        {
          endingDate: previousEnd,
          updatedBy,
        },
        transaction,
      );
    }

    const overlap = await timeTableCreateRepository.checkRoutineOverlapRepository({
      classSectionTermId: previousPlain.classSectionTermId,
      startingDate: start,
      endingDate: end,
      excludeRoutineId: previousEnd != null ? previousRoutineId : undefined,
    });

    if (overlap) {
      const error = new Error('Routine date range overlaps');
      error.statusCode = 409;
      throw error;
    }

    const previousMappings = previousRoutine.timeTablecreate || [];
    const periodInfoByCreationId = new Map();
    const conflictOptions = {
      allowedClassSectionTermIds: [],
      excludeCombinedGroupId: null,
    };

    for (const mapping of previousMappings) {
      const mappingPlain = mapping.get ? mapping.get({ plain: true }) : mapping;

      if (!mappingPlain.employeeId && !mappingPlain.classRoomSectionId) {
        continue;
      }

      const creationId = Number(mappingPlain.timeTableCreationId);
      let periodInfo = periodInfoByCreationId.get(creationId);
      if (!periodInfo) {
        periodInfo = await timeTableCreateRepository.getPeriodInfoRepository(creationId);
        periodInfoByCreationId.set(creationId, periodInfo);
      }

      await assertNoSlotConflicts({
        employeeId: mappingPlain.employeeId,
        classRoomSectionId: mappingPlain.classRoomSectionId,
        day: mappingPlain.day,
        periodInfo,
        startingDate: start,
        endingDate: end,
        conflictOptions,
        transaction,
      });
    }

    const newRoutineData = {
      startingDate: start,
      endingDate: end,
      isPublish: false,
      createdBy,
      updatedBy,
      timetableStructureCourseMapperId: previousPlain.timetableStructureCourseMapperId,
    };

    for (const field of routineCloneFields) {
      if (previousPlain[field] !== undefined) {
        newRoutineData[field] = previousPlain[field];
      }
    }

    const newRoutine = await timeTableCreateRepository.addTimeTableCreate(newRoutineData, transaction);
    const newRoutineId = newRoutine.timeTableRoutineId;
    const newMappings = [];

    for (const mapping of previousMappings) {
      const mappingPlain = mapping.get ? mapping.get({ plain: true }) : mapping;
      const row = {
        timeTableRoutineId: newRoutineId,
        createdBy,
        updatedBy,
      };

      for (const field of mappingCloneFields) {
        if (mappingPlain[field] !== undefined) {
          row[field] = mappingPlain[field];
        }
      }

      newMappings.push(row);
    }

    if (newMappings.length > 0) {
      await timeTableCreateRepository.bulkCreateMappings(newMappings, transaction);
    }

    await transaction.commit();
    return newRoutine;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function changeTimeTableCreate(body, updatedBy) {
  const { timeTableRoutineId, classSectionTermId, ...updateData } = body;
  const current = await timeTableCreateRepository.getRoutineByIdRepository(timeTableRoutineId);
  if (!current) {
    throw new Error('Routine not found');
  }
  if (current.isPublish) {
    throw new Error('Published routine cannot be updated');
  }

  let placementFields = { ...updateData };

  if (classSectionTermId != null) {
    const placement = await resolveRoutinePlacement({ classSectionTermId });
    placementFields = {
      ...placementFields,
      classSectionTermId: placement.classSectionTermId,
    };
  }

  if (
    placementFields.startingDate
    || placementFields.endingDate
    || placementFields.classSectionTermId
    || placementFields.courseId
    || placementFields.timetableStructureCourseMapperId
  ) {
    const resolvedTermId = placementFields.classSectionTermId || current.classSectionTermId;
    const start = toDateOnlyString(placementFields.startingDate || current.startingDate);
    const end = toDateOnlyString(placementFields.endingDate || current.endingDate);

    const mapperId = placementFields.timetableStructureCourseMapperId
      || current.timetableStructureCourseMapperId;
    const courseMapping = await getStructureCourseMappingById(mapperId);
    if (!courseMapping) {
      throw new Error('Structure course mapping not found');
    }

    let courseId = placementFields.courseId || current.courseId;

    if (placementFields.classSectionTermId) {
      const termRow = await findClassSectionTermById(placementFields.classSectionTermId);
      if (!termRow) {
        throw new Error('classSectionTermId not found');
      }
      const section = termRow.get({ plain: true }).classSection;
      if (!section) {
        throw new Error('class section not found for classSectionTermId');
      }
      if (Number(section.courseId) !== Number(courseMapping.courseId)) {
        throw new Error('classSectionTermId course does not match structure course mapping');
      }
      if (Number(section.sessionId) !== Number(courseMapping.sessionId)) {
        throw new Error('classSectionTermId session does not match structure course mapping');
      }
      courseId = section.courseId;
      placementFields.courseId = courseId;
    }

    assertRoutineDatesWithinStructure(courseMapping, start, end);

    placementFields.startingDate = start;
    placementFields.endingDate = end;
    placementFields.timetableStructureCourseMapperId = courseMapping.timetableStructureCourseMapperId;
    delete placementFields.timeTableNameId;

    const overlap = await timeTableCreateRepository.checkRoutineOverlapRepository({
      classSectionTermId: resolvedTermId,
      startingDate: start,
      endingDate: end,
      excludeRoutineId: timeTableRoutineId,
    });

    if (overlap) {
      throw new Error('Routine already exists for this section in the selected date range');
    }
  }

  const data = {
    ...placementFields,
    updatedBy,
  };

  const result = await timeTableCreateRepository.changeTimeTableCreate(timeTableRoutineId, data);

  return result;
}

export async function updatetimeTableCreate(timeTableMappingId, timeTableType, updatedBy) {
  const data = { timeTableType, updatedBy };
  const result = await timeTableCreateRepository.updatetimeTableCreate(timeTableMappingId, data);
  return result;
}

export async function updateSimpleTeacherMapping(mappingArray, createdBy, updatedBy) {
  const transaction = await sequelize.transaction();

  try {
    const base = mappingArray[0];
    let baseRow = await timeTableCreateRepository.findMappingById(base.timeTableMappingId);

    if (!baseRow) {
      throw new Error(`Base mapping ${base.timeTableMappingId} not found`);
    }

    baseRow = baseRow.get({ plain: true });

    const routineInfo = await timeTableCreateRepository.getRoutineByIdRepository(baseRow.timeTableRoutineId);
    if (!routineInfo) {
      throw new Error(`Routine ${baseRow.timeTableRoutineId} not found`);
    }
    const { startingDate, endingDate, isPublish } = routineInfo;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sDate = new Date(startingDate);
    sDate.setHours(0, 0, 0, 0);

    if (isPublish && today > sDate) {
      throw new Error("Cannot add or update mapping for a published routine after its starting date.");
    }

    const ttCreationData = await getSingleTimeTableById(baseRow.timeTableCreationId);

    if (!ttCreationData || !ttCreationData[0]) {
      throw new Error(`No timetable found for ID ${baseRow.timeTableCreationId}`);
    }

    const periodLength = toMoneyNumber(ttCreationData[0].dataValues.periodLength);

    const periodInfo = await timeTableCreateRepository.getPeriodInfoRepository(baseRow.timeTableCreationId);
    if (!periodInfo) {
      throw new Error(`Period Info not found for ID ${baseRow.timeTableCreationId}`);
    }
    const { startTime, endTime } = periodInfo;

    const addingSecondaryTeacher = mappingArray.some(
      (item) => item.isNew === true && item.teacherType === 'Secondary',
    );

    // Check room conflict once for the entire batch as they share the same slot
    if (baseRow.classRoomSectionId && !addingSecondaryTeacher) {
      const roomConflict = await timeTableCreateRepository.checkRoomConflictRepository(
        baseRow.classRoomSectionId,
        baseRow.day,
        startTime,
        endTime,
        startingDate,
        endingDate,
      );

      if (roomConflict) {
        const routineSection = resolveTimeTableRoutineSection(roomConflict.timeTablecreate);
        const conflictSection = routineSection?.section || "";
        const conflictClass = routineSection?.year || "";
        throw new Error('Room conflict: classroom already occupied for this slot');
      }
    }

    // LOOP
    for (const item of mappingArray) {
      //  check conflict
      if (item.employeeId) {
        const conflict = await timeTableCreateRepository.checkTeacherConflictRepository(
          item.employeeId,
          baseRow.day,
          startTime,
          endTime,
          startingDate,
          endingDate,
        );

        if (conflict) {
          const routineSection = resolveTimeTableRoutineSection(conflict.timeTablecreate);
          const conflictSection = routineSection?.section || "";
          const conflictClass = routineSection?.year || "";
          throw new Error('Teacher conflict: teacher already scheduled for this slot');
        }
      }
      // conflict logic END

      // ===== CASE 1: update existing mapping =====
      if (item.timeTableMappingId) {
        const dbRow = await timeTableCreateRepository.findMappingById(item.timeTableMappingId);
        if (!dbRow) {
          throw new Error(`Mapping ID ${item.timeTableMappingId} not found`);
        }

        const noChange = dbRow.teacherType === item.teacherType
          && dbRow.isAttendence === item.isAttendence
          && dbRow.isOverridingSyblingElectives === item.isOverridingSyblingElectives;

        if (!noChange) {
          await timeTableCreateRepository.updateMapping(
            item.timeTableMappingId,
            {
              teacherType: item.teacherType,
              isAttendence: item.isAttendence,
              isOverridingSyblingElectives: item.isOverridingSyblingElectives,
              updatedBy,
            },
            transaction,
          );
        }
      }

      // ===== CASE 2: NEW ENTRY =====
      else if (item.isNew === true) {
        if (!item.employeeId) {
          throw new Error("employeeId is required for new teacher entry");
        }

        // update faculty load
        const facLoad = await getSingleFaculityLoadDetails(item.employeeId);
        if (!facLoad || !facLoad[0]) {
          throw new Error(`Faculty load not found for employee ${item.employeeId}`);
        }

        const existingLoad = toMoneyNumber(
          facLoad[0].dataValues?.currentLoad ?? facLoad[0].currentLoad,
        );
        const newLoad = decimalAdd(existingLoad, periodLength);

        await updateFaculityLoadByEmployeeId(item.employeeId, { currentLoad: newLoad }, transaction);

        const newRow = {
          timeTableNameId: Number(baseRow.timeTableNameId || routineInfo.timeTableNameId),
          timeTableRoutineId: baseRow.timeTableRoutineId,
          timeTableCreationId: baseRow.timeTableCreationId,
          subjectId: item.subjectId != null ? Number(item.subjectId) : baseRow.subjectId,
          electiveSubjectId: item.electiveSubjectId != null
            ? Number(item.electiveSubjectId)
            : baseRow.electiveSubjectId,
          teacherSubjectMappingId: item.teacherSubjectMappingId ?? baseRow.teacherSubjectMappingId,
          classRoomSectionId: baseRow.classRoomSectionId,
          day: baseRow.day,
          period: baseRow.period,
          isSameTeacher: false,
          timeTableType: baseRow.timeTableType,
          combinedGroupId: baseRow.combinedGroupId || null,
          employeeId: item.employeeId,
          teacherType: item.teacherType,
          isAttendence: item.isAttendence,
          isOverridingSyblingElectives: item.isOverridingSyblingElectives
            ?? baseRow.isOverridingSyblingElectives,
          createdBy,
          updatedBy,
        };

        await timeTableCreateRepository.addtimeTableMapping(newRow, transaction);
      }
    }

    await transaction.commit();
    return { success: true, message: "Teacher mapping updated successfully" };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function getTimeTableMappingDetail(timeTableRoutineId) {
  const rawResult = await timeTableCreateRepository.getTimeTableMappingDetail(timeTableRoutineId);

  if (!Array.isArray(rawResult) || rawResult.length === 0) {
    return [];
  }

  // Helper: Parse "YYYY-MM-DD" to JS Date object
  function parseISODate(dateStr) {
    if (typeof dateStr !== "string") return null;
    const parts = dateStr.split("-");
    if (parts.length !== 3) return null;
    const [year, month, day] = parts.map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  }

  // Helper: Get array of all dates between two dates
  function getDatesBetween(startDate, endDate) {
    const dates = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  }

  // Helper: Get weekday name from date
  function getWeekdayName(date) {
    return date.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  }

  const result = [];

  for (const rawItem of rawResult) {
    const item = rawItem.toJSON ? rawItem.toJSON() : rawItem;
    const timeTableCreate = item?.timeTablecreate;

    const classSectionTermId = timeTableCreate?.classSectionTermId;
    const startingDateStr = timeTableCreate?.startingDate;
    const endingDateStr = timeTableCreate?.endingDate;

    if (!classSectionTermId || !startingDateStr || !endingDateStr) {
      item.totalClasses = 0;
      result.push(item);
      continue;
    }

    const startingDate = parseISODate(startingDateStr);
    const endingDate = parseISODate(endingDateStr);

    if (!startingDate || !endingDate || startingDate > endingDate) {
      item.totalClasses = 0;
      result.push(item);
      continue;
    }

    const allDates = getDatesBetween(startingDate, endingDate);

    // Week-off days from timetable
    const weekOffDaysSet = new Set();
    const timeTableNameList = timeTableCreate.structureCourseMapping.timeTableStructure.timeTableName || [];

    for (let i = 0; i < timeTableNameList.length; i++) {
      const entry = timeTableNameList[i];
      let weekOff = entry?.weekOff;

      if (!Array.isArray(weekOff)) {
        console.warn("Unexpected weekOff format:", weekOff);
        weekOff = [];
      }

      for (let j = 0; j < weekOff.length; j++) {
        const day = weekOff[j];
        if (typeof day === "string") {
          weekOffDaysSet.add(day.toLowerCase());
        }
      }
    }

    const workingDays = allDates.filter((date) => !weekOffDaysSet.has(getWeekdayName(date)));

    // Holidays
    let holidays = [];
    try {
      holidays = await getHolidayStartEndDate(startingDateStr, endingDateStr);
    } catch (e) {
      console.error("Failed to get holidays:", e);
      holidays = [];
    }

    const holidayDatesSet = new Set();
    if (Array.isArray(holidays)) {
      for (let i = 0; i < holidays.length; i++) {
        const h = holidays[i];
        let holidayDate = null;

        if (h?.date instanceof Date) {
          holidayDate = new Date(h.date.getFullYear(), h.date.getMonth(), h.date.getDate());
        } else if (typeof h?.date === "string") {
          holidayDate = parseISODate(h.date);
        }

        if (holidayDate) {
          holidayDatesSet.add(holidayDate.getTime());
        }
      }
    }

    const finalClassDays = workingDays.filter((date) => !holidayDatesSet.has(date.getTime()));
    item.totalClasses = finalClassDays.length;

    result.push(item);
  }

  return result;
}

export async function getSingletimeTableMappingDetail(courseId) {
  return await timeTableCreateRepository.getSingleTimeTableCreateDetails(courseId);
}

//---------------night

export async function getTimeTableElective(courseId) {
  const allData = await timeTableCreateRepository.getTimeTableCellData(
    Number(courseId),
    null,
  );

  //  Separate normal and elective
  // const normal = allData.filter(
  //   item =>
  //     item.timeTableType === "normal" &&
  //     item.classSectionsId === Number(classSectionsId)
  // );

  const elective = allData.filter((item) => item.timeTableType === "elective" && item.courseId === Number(courseId));

  // const combined = [...normal, ...elective];
  const combined = [...elective];

  //  Format final output
  const formatted = combined.map((item) => {
    const course = item.timeTableCourse || {};
    const classSection = resolveTimeTableRoutineSection(item) || {};

    //  Build sectionRountine only for elective type
    const sectionRoutine = (item?.timeTablecreate || []).reduce((acc, curr) => {
      let dayObj = acc.find((d) => d.day === curr.day);
      if (!dayObj) {
        dayObj = { day: curr.day, period: [] };
        acc.push(dayObj);
      }
      const sameTeacher = curr?.isSameTeacher;
      const subject = sameTeacher
        ? (curr?.timeTableTeacherSubject?.employeeSubject?.subjectName ?? curr?.timeTableTeacherSubject?.employeeSubject?.subjects?.subjectName)
        : curr?.timeTableSubject?.subjectName;

      const teacherName = sameTeacher
        ? curr?.timeTableTeacherSubject?.teacherEmployeeData?.employeeName
        : curr?.employeeDetails?.employeeName;

      const subjectCode = sameTeacher
        ? (curr?.timeTableTeacherSubject?.employeeSubject?.subjectCode ?? curr?.timeTableTeacherSubject?.employeeSubject?.subjects?.subjectCode)
        : curr?.timeTableSubject?.subjectCode;

      const employeeCode = sameTeacher
        ? curr?.timeTableTeacherSubject?.teacherEmployeeData?.employeeCode
        : curr?.employeeDetails?.employeeCode;

      const subjectId = sameTeacher
        ? (curr?.timeTableTeacherSubject?.employeeSubject?.subjectId ?? curr?.timeTableTeacherSubject?.employeeSubject?.subjects?.subjectId)
        : curr?.timeTableSubject?.subjectId;

      const employeeId = sameTeacher
        ? curr?.timeTableTeacherSubject?.teacherEmployeeData?.employeeId
        : curr?.employeeDetails?.employeeId;

      const pickColor = sameTeacher
        ? curr?.timeTableTeacherSubject?.teacherEmployeeData?.pickColor
        : curr?.employeeDetails?.pickColor;

      //  Find or create the period within the day
      let existPeriod = dayObj.period.find((d) => d.timeTableCreationId === curr?.timeTableCreationId);

      //  Common mapping data
      const mappingEntry = {
        timeTableMappingId: curr?.timeTableMappingId,
        employeeName: teacherName || "N/A",
        employeeCode: employeeCode || "",
        pickColor: pickColor || "",
        employeeId: employeeId || null,
        timeTableType: curr?.timeTableType,
        roomId: curr?.classRoom?.classRoomSectionId || null,
        roomName: curr?.classRoom?.roomNumber || null,
        subject: curr?.timeTableElective
          ? {
            subjectId: curr?.timeTableElective?.electiveSubjectId,
            Name: curr?.timeTableElective?.electiveSubjectName,
            Code: curr?.timeTableElective?.electiveSubjectCode,
          }
          : {
            subjectId: subjectId,
            Name: subject,
            Code: subjectCode,
          },
      };

      //  Add new or merge existing period
      if (!existPeriod) {
        dayObj.period.push({
          timeTableCreationId: curr?.timeTableCreationId,
          periodName: curr?.timeTablecreation?.periodName,
          isBreak: curr?.timeTablecreation?.isBreak,
          periodLength: curr?.timeTablecreation?.periodLength,
          periodGap: curr?.timeTablecreation?.periodGap,
          startTime: curr?.timeTablecreation?.startTime,
          endTime: curr?.timeTablecreation?.endTime,
          mappingData: [mappingEntry],
        });
      } else {
        existPeriod.mappingData.push(mappingEntry);
      }

      return acc;
    }, []);

    return {
      courseName: course.courseName || "",
      courseCode: course.courseCode || "",
      courseId: item.courseId || "",
      section: classSection.section || "",
      class: classSection.year != null ? String(classSection.year) : "",
      timeTableType: item.timeTableType,
      classSectionsId: item.classSectionsId || null,
      startingDate: item.startingDate || null,
      endingDate: item.endingDate || null,
      sectionRoutine,
    };
  });

  return { formatted };
}

// export async function getTimeTableCellData(courseId, classSectionsId, universityId, instituteId, role) {
//   const allData = await timeTableCreateRepository.getTimeTableCellData(
//     courseId,
//     classSectionsId,
//     universityId,
//     instituteId,
//     role
//   );
//   console.log(`>>>>>>>allData`,JSON.stringify(allData));

//   // 1. Separate normal and elective to get base metadata
//   const normalItemBase = allData.find(
//     item =>
//       item.timeTableType === "normal" &&
//       item.classSectionsId === Number(classSectionsId)
//   );
//   const electiveItemBase = allData.find(
//     item =>
//       item.timeTableType === "elective" &&
//       item.courseId === Number(courseId)
//   );

//   // 2. Flatten all period mappings from both normal and elective base items
//   const allMappings = [];
//   const itemsToProcess = [normalItemBase, electiveItemBase].filter(Boolean);

//   for (const item of itemsToProcess) {
//     const course = item.timeTableCourse || {};
//     const classSection = resolveTimeTableRoutineSection(item) || {};

//     (item?.timeTablecreate || []).forEach(curr => {
//       const {
//         day,
//         isSameTeacher,
//         timeTableMappingId,
//         timeTableCreationId,
//         timeTableType, // This is the **raw mapping type** (e.g., 'normal', 'elective', 'Both')
//         timeTablecreation,
//         timeTableSubject,
//         employeeDetails,
//         timeTableTeacherSubject,
//         timeTableElective
//       } = curr || {};

//       const sameTeacher = isSameTeacher;

//   let teacherData = null;
//   let subjectData = null;

//     if (sameTeacher === true) {
//       // sameTeacher = true
//       teacherData = timeTableTeacherSubject?.teacherEmployeeData || null;
//       subjectData = timeTableTeacherSubject?.employeeSubject?.subjects || null;
//     } else {
//       // sameTeacher = false
//       teacherData = employeeDetails || null;
//       subjectData = timeTableSubject || null;
//     }

//       // Create the mapping entry
//       const mappingEntry = {
//         timeTableMappingId,
//         employeeName: teacherData?.employeeName || "N/A",
//         employeeCode: teacherData?.employeeCode || "",
//         pickColor: teacherData?.pickColor || "",
//         employeeId: teacherData?.employeeId || null,
//         isTeacher: curr?.isTeacher || null,
//         isAttendence: curr?.isAttendence ?? null,
//         timeTableType, // Use the raw mapping type for the final grouping key
//         subject: timeTableElective
//           ? {
//               subjectId: timeTableElective?.electiveSubjectId,
//               Name: timeTableElective?.electiveSubjectName,
//               Code: timeTableElective?.electiveSubjectCode,
//             }
//           : {
//               subjectId: subjectData?.subjectId,
//               Name: subjectData?.subjectName,
//               Code: subjectData?.subjectCode,
//             },
//       };

//       // Store the flattened mapping along with its period and day metadata
//       allMappings.push({
//         day,
//         timeTableCreationId,
//         periodDetails: timeTablecreation || {},
//         mappingEntry,
//         // Store base course/section data for top-level aggregation
//         baseMetadata: {
//           course,
//           classSection,
//           courseId: item.courseId,
//           classSectionsId: item.classSectionsId,
//           startingDate: item.startingDate,
//           endingDate: item.endingDate,
//         }
//       });
//     });
//   }

//   // 3. Aggregate flattened mappings into final top-level time table structures (formatted)
//   const finalAggregatedRoutines = allMappings.reduce((acc, currentMapping) => {
//     const {
//       day,
//       timeTableCreationId,
//       periodDetails,
//       mappingEntry,
//       baseMetadata
//     } = currentMapping;

//     // Key for top-level grouping is the internal mapping's timeTableType
//     const finalType = mappingEntry.timeTableType;

//     // Find or create the top-level time table object for this type ('normal', 'elective', or 'Both')
//     let timeTableObj = acc.find(t => t.timeTableType === finalType);

//     if (!timeTableObj) {
//       // Create a new base object using the appropriate metadata
//       const sourceItem = finalType === "normal" ? normalItemBase : electiveItemBase || baseMetadata;

//       const course = sourceItem.timeTableCourse || baseMetadata.course || {};
//       const classSection = sourceItem.timeTableClassSection || baseMetadata.classSection || {};

//       timeTableObj = {
//         courseName: course.courseName || "",
//         courseCode: course.courseCode || "",
//         courseId: sourceItem.courseId || baseMetadata.courseId || "",
//         // Use normal section details for 'normal' and 'Both', and null/empty for 'elective'
//         section: finalType !== "elective" ? classSection.section || "" : "",
//         class: finalType !== "elective" ? classSection.class || "" : "",
//         timeTableType: finalType, // Crucial: use the mapping's type here
//         classSectionsId: finalType !== "elective" ? sourceItem.classSectionsId || baseMetadata.classSectionsId || null : null,
//         startingDate: finalType !== "elective" ? sourceItem.startingDate || baseMetadata.startingDate || null : null,
//         endingDate: finalType !== "elective" ? sourceItem.endingDate || baseMetadata.endingDate || null : null,
//         sectionRoutine: [],
//       };
//       acc.push(timeTableObj);
//     }

//     // 4. Group by Day and Period within the chosen timeTableObj
//     let dayObj = timeTableObj.sectionRoutine.find(d => d.day === day);
//     if (!dayObj) {
//       dayObj = { day, period: [] };
//       timeTableObj.sectionRoutine.push(dayObj);
//     }

//     let existPeriod = dayObj.period.find(
//       p => p.timeTableCreationId === timeTableCreationId
//     );

//     if (!existPeriod) {
//       dayObj.period.push({
//         timeTableCreationId,
//         periodName: periodDetails.periodName,
//         isBreak: periodDetails.isBreak,
//         periodLength: periodDetails.periodLength,
//         periodGap: periodDetails.periodGap,
//         startTime: periodDetails.startTime,
//         endTime: periodDetails.endTime,
//         mappingData: [mappingEntry],
//       });
//     } else {
//       // existPeriod.mappingData.push(mappingEntry);
//       const alreadyExists = existPeriod.mappingData.some(m =>
//         m.employeeId === mappingEntry.employeeId &&
//         m.subject.subjectId === mappingEntry.subject.subjectId
//       );

//       if (!alreadyExists) {
//         existPeriod.mappingData.push(mappingEntry);
//       }
//     }

//     return acc;
//   }, []);

//   return { formatted: finalAggregatedRoutines };
// };

// latest change

export async function getTimeTableCellData(courseId, classSectionTermId) {
  const allData = await timeTableCreateRepository.getTimeTableCellData(
    courseId,
    classSectionTermId,
  );

  const filteredBySection = allData.filter((item) =>
    item.dataValues.timeTableType === "normal"
      ? Number(item.classSectionTermId) === Number(classSectionTermId)
      : true,
  );

  // STEP 2: Group by timeTableNameId
  const groupedByTimeTableName = filteredBySection.reduce((acc, item) => {
    const key = item.timeTableNameId;

    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {});

  const finalResult = [];

  // STEP 3: Process EACH timetableNameId separately
  for (const timeTableNameId in groupedByTimeTableName) {
    const groupItems = groupedByTimeTableName[timeTableNameId];

    const normalItemBase = groupItems.find((item) => item.timeTableType === "normal");

    const electiveItemBase = groupItems.find((item) => item.timeTableType === "elective");

    const allMappings = [];
    const itemsToProcess = [normalItemBase, electiveItemBase].filter(Boolean);

    //  STEP 4: FLATTEN (NO CHANGE)
    for (const item of itemsToProcess) {
      const course = item.timeTableCourse || {};
      const classSection = resolveTimeTableRoutineSection(item) || {};

      (item?.timeTablecreate || []).forEach((curr) => {
        const {
          day,
          isSameTeacher,
          timeTableMappingId,
          timeTableCreationId,
          timeTableType,
          timeTablecreation,
          timeTableSubject,
          employeeDetails,
          timeTableTeacherSubject,
          timeTableElective,
          classRoom,
        } = curr || {};

        let teacherData = null;
        let subjectData = null;

        if (isSameTeacher === true) {
          teacherData = timeTableTeacherSubject?.teacherEmployeeData || null;
          subjectData = timeTableTeacherSubject?.employeeSubject?.subjectId
            ? timeTableTeacherSubject.employeeSubject
            : (timeTableTeacherSubject?.employeeSubject?.subjects || null);
        } else {
          teacherData = employeeDetails || null;
          subjectData = timeTableSubject || null;
        }

        const mappingEntry = {
          timeTableMappingId,
          combinedGroupId: curr?.combinedGroupId ?? null,
          employeeName: teacherData?.employeeName || "N/A",
          employeeCode: teacherData?.employeeCode || "",
          pickColor: teacherData?.pickColor || "",
          employeeId: teacherData?.employeeId || null,
          teacherType: curr?.teacherType || null,
          isAttendence: curr?.isAttendence ?? null,
          timeTableType,
          classRoom,
          subject: timeTableElective
            ? {
              subjectId: timeTableElective?.electiveSubjectId,
              Name: timeTableElective?.electiveSubjectName,
              Code: timeTableElective?.electiveSubjectCode,
            }
            : {
              subjectId: subjectData?.subjectId,
              Name: subjectData?.subjectName,
              Code: subjectData?.subjectCode,
            },
        };

        allMappings.push({
          day,
          timeTableCreationId,
          periodDetails: timeTablecreation || {},
          mappingEntry,
          baseMetadata: {
            course,
            classSection,
            courseId: item.courseId,
            classSectionsId: item.classSectionsId,
            classSectionTermId: item.classSectionTermId,
            startingDate: item.startingDate,
            endingDate: item.endingDate,
          },
        });
      });
    }

    // STEP 5: AGGREGATION (NO RESPONSE CHANGE)
    const aggregated = allMappings.reduce((acc, current) => {
      const { day, timeTableCreationId, periodDetails, mappingEntry, baseMetadata } = current;

      const finalType = mappingEntry.timeTableType;

      let timeTableObj = acc.find((t) => t.timeTableType === finalType);

      if (!timeTableObj) {
        const sourceItem = finalType === "normal" ? normalItemBase : electiveItemBase || baseMetadata;

        const course = sourceItem?.timeTableCourse || baseMetadata.course || {};

        const classSection = resolveTimeTableRoutineSection(sourceItem) || baseMetadata.classSection || {};

        timeTableObj = {
          courseName: course.courseName || "",
          courseCode: course.courseCode || "",
          courseId: sourceItem?.courseId || baseMetadata.courseId || "",
          section: finalType !== "elective" ? classSection.section || "" : "",
          class: finalType !== "elective" ? (classSection.year != null ? String(classSection.year) : "") : "",
          timeTableType: finalType,
          classSectionsId:
            finalType !== "elective" ? sourceItem?.classSectionsId || baseMetadata.classSectionsId || null : null,
          startingDate: finalType !== "elective" ? sourceItem?.startingDate || baseMetadata.startingDate || null : null,
          endingDate: finalType !== "elective" ? sourceItem?.endingDate || baseMetadata.endingDate || null : null,
          sectionRoutine: [],
        };

        acc.push(timeTableObj);
      }

      let dayObj = timeTableObj.sectionRoutine.find((d) => d.day === day);
      if (!dayObj) {
        dayObj = { day, period: [] };
        timeTableObj.sectionRoutine.push(dayObj);
      }

      let periodObj = dayObj.period.find((p) => p.timeTableCreationId === timeTableCreationId);

      if (!periodObj) {
        dayObj.period.push({
          timeTableCreationId,
          periodName: periodDetails.periodName,
          isBreak: periodDetails.isBreak,
          periodLength: periodDetails.periodLength,
          periodGap: periodDetails.periodGap,
          startTime: periodDetails.startTime,
          endTime: periodDetails.endTime,
          mappingData: [mappingEntry],
        });
      } else {
        const exists = periodObj.mappingData.some(
          (m) => m.employeeId === mappingEntry.employeeId && m.subject.subjectId === mappingEntry.subject.subjectId,
        );

        if (!exists) {
          periodObj.mappingData.push(mappingEntry);
        }
      }

      return acc;
    }, []);

    finalResult.push(...aggregated);
  }

  return { formatted: finalResult };
}

export async function publishTimeTableService(timeTableRoutineId) {
  const result = await timeTableCreateRepository.publishTimeTableRepository(timeTableRoutineId);

  if (result[0] === 0) {
    throw new Error("Time table create ID not found");
  }

  return { message: "Time table published successfully" };
}

function mergeSubjectLists(...lists) {
  const subjectMap = new Map();

  for (const list of lists) {
    for (const subject of list) {
      if (!subject?.subjectId) continue;
      const subjectId = Number(subject.subjectId);
      const existing = subjectMap.get(subjectId);
      subjectMap.set(subjectId, {
        subjectId,
        subject: existing?.subject || subject.subject || subject.subjectName || null,
        subjectCode: existing?.subjectCode || subject.subjectCode || null,
      });
    }
  }

  return [...subjectMap.values()].sort((a, b) => a.subjectId - b.subjectId);
}

function subjectsFromClassSectionStudents(sectionData) {
  const subjectMap = new Map();

  for (const student of sectionData?.students ?? []) {
    for (const mapping of student.studentSubjectMapper ?? []) {
      const sub = mapping.subjects;
      if (!sub?.subjectId) continue;
      const subjectId = Number(sub.subjectId);
      if (!subjectMap.has(subjectId)) {
        subjectMap.set(subjectId, {
          subjectId,
          subject: sub.subjectName,
          subjectCode: sub.subjectCode,
        });
      }
    }
  }

  return [...subjectMap.values()];
}

function resolveScheduleSubjectId(cell) {
  if (cell?.subjectId) {
    return Number(cell.subjectId);
  }
  if (cell?.timeTableSubject?.subjectId) {
    return Number(cell.timeTableSubject.subjectId);
  }
  if (cell?.timeTableTeacherSubject?.subjectId) {
    return Number(cell.timeTableTeacherSubject.subjectId);
  }
  if (cell?.timeTableTeacherSubject?.employeeSubject?.subjectId) {
    return Number(cell.timeTableTeacherSubject.employeeSubject.subjectId);
  }
  return null;
}

function resolveScheduleSubjectDetails(cell, subjectId) {
  const sub = cell?.timeTableSubject || cell?.timeTableTeacherSubject?.employeeSubject;
  if (sub?.subjectId === subjectId) {
    return {
      subjectId,
      subject: sub.subjectName,
      subjectCode: sub.subjectCode,
    };
  }
  return { subjectId, subject: null, subjectCode: null };
}

function countSubjectsInRoutine(cells = []) {
  const countMap = {};
  const subjectsFromCells = [];
  const countedSlots = new Set();

  for (const cell of cells) {
    if (cell?.timeTablecreation?.isBreak) {
      continue;
    }

    const subjectId = resolveScheduleSubjectId(cell);
    if (!subjectId) {
      continue;
    }

    subjectsFromCells.push(resolveScheduleSubjectDetails(cell, subjectId));

    const slotKey = `${cell.day}-${cell.period}-${subjectId}`;
    if (!countedSlots.has(slotKey)) {
      countMap[subjectId] = (countMap[subjectId] || 0) + 1;
      countedSlots.add(slotKey);
    }
  }

  return { countMap, subjectsFromCells };
}

export async function getSubjectWithCount(classSectionTermId) {
  const [subjectsData, timeTableData] = await Promise.all([
    timeTableCreateRepository.ClassSubjectCount(classSectionTermId),
    timeTableCreateRepository.timeTableData(classSectionTermId),
  ]);

  const studentSubjects = subjectsFromClassSectionStudents(subjectsData);
  const finalResult = [];

  for (const routine of timeTableData) {
    const { countMap, subjectsFromCells } = countSubjectsInRoutine(routine?.timeTablecreate);

    finalResult.push({
      routine,
      countMap,
      subjectsFromCells,
    });
  }

  let subjectsList = mergeSubjectLists(
    studentSubjects,
    ...finalResult.map((entry) => entry.subjectsFromCells),
  );

  const unresolvedIds = subjectsList
    .filter((subject) => !subject.subject && !subject.subjectCode)
    .map((subject) => subject.subjectId);

  if (unresolvedIds.length) {
    const resolvedSubjects = await timeTableCreateRepository.getSubjectsByIds(unresolvedIds);
    subjectsList = mergeSubjectLists(subjectsList, resolvedSubjects);
  }

  return finalResult.map(({ routine, countMap }) => {
    const mapping = routine.structureCourseMapping;
    const structure = mapping.timeTableStructure;
    return {
      timeTableNameId: mapping.timeTableNameId,
      timeTableName: structure.name,
      subjects: subjectsList.map((subject) => ({
        subjectId: subject.subjectId,
        subject: subject.subject,
        subjectCode: subject.subjectCode,
        count: countMap[subject.subjectId] || 0,
      })),
    };
  });
}

export async function getRoutineByClassSectionId(classSectionTermId) {
  const placement = await resolveRoutinePlacement({ classSectionTermId });
  const scope = routineScopeWhere(placement.classSectionTermId);

  const termRow = await findClassSectionTermById(placement.classSectionTermId);
  let classSection = null;
  let section = null;
  if (termRow) {
    const plain = termRow.get ? termRow.get({ plain: true }) : termRow;
    classSection = plain.classSection ?? null;
    section = classSection?.section ?? null;
  }

  const courseId = classSection?.courseId != null ? Number(classSection.courseId) : null;
  const sessionId = classSection?.sessionId != null ? Number(classSection.sessionId) : null;

  const placementMeta = {
    classSectionTermId: placement.classSectionTermId,
    section,
    term: placement.term != null ? Number(placement.term) : null,
    year: classSection?.year != null ? Number(classSection.year) : null,
    courseId,
    sessionId,
  };

  const normalRoutines =
    await timeTableCreateRepository.getNormalRoutinesBySectionScopeRepository(scope);

  if (!normalRoutines || !normalRoutines.length) {
    const structures = await buildMappedStructuresWithoutRoutines(
      courseId,
      sessionId,
      classSection,
    );
    return { ...placementMeta, structures, classSection };
  }

  const timeTableNameIds = [];
  for (const r of normalRoutines) {
    timeTableNameIds.push(r.structureCourseMapping.timeTableNameId);
  }
  const electiveRoutines = await timeTableCreateRepository.getElectiveRoutinesByTableNamesRepository(timeTableNameIds);

  const daysList = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const structuresById = new Map();

  for (const routine of normalRoutines) {
    const mapping = routine.structureCourseMapping;
    const timeTableNameId = mapping.timeTableNameId;
    const timeTableCreateName = mapping.timeTableStructure;
    const periods = timeTableCreateName.timeTableName || [];
    const normalScheduleItems = routine.timeTablecreate || [];

    const matchingElectives = [];
    for (const er of electiveRoutines) {
      if (er.structureCourseMapping.timeTableNameId === timeTableNameId) {
        matchingElectives.push(er);
      }
    }
    const electiveScheduleItems = [];
    for (const er of matchingElectives) {
      const items = er.timeTablecreate || [];
      for (const item of items) {
        electiveScheduleItems.push(item);
      }
    }

    let weekOffList = [];
    try {
      const weekOffRaw = timeTableCreateName.weekOff;
      weekOffList = Array.isArray(weekOffRaw)
        ? weekOffRaw
        : (typeof weekOffRaw === 'string' ? JSON.parse(weekOffRaw) : []);

      if (typeof weekOffList === 'string') {
        weekOffList = JSON.parse(weekOffList);
      }
    } catch (e) {
      weekOffList = [];
    }
    const weekOffLower = [];
    for (const day of weekOffList) {
      weekOffLower.push(String(day).toLowerCase());
    }

    if (!structuresById.has(timeTableNameId)) {
      structuresById.set(timeTableNameId, {
        timeTableNameId,
        name: timeTableCreateName.name || 'N/A',
        weekOff: weekOffList,
        timetableStructureCourseMapperId: mapping.timetableStructureCourseMapperId,
        courseId: mapping.courseId != null ? Number(mapping.courseId) : courseId,
        sessionId: mapping.sessionId != null ? Number(mapping.sessionId) : sessionId,
        startingDate: mapping.startingDate ?? null,
        endingDate: mapping.endingDate ?? null,
        routines: [],
      });
    }

    const formattedPeriods = [];
    for (const period of periods) {
      const formattedDays = [];
      for (const daysName of daysList) {
        if (weekOffLower.includes(daysName.toLowerCase())) {
          formattedDays.push({
            name: daysName,
            isDayOff: true,
          });
          continue;
        }

        if (period.isBreak) {
          formattedDays.push({
            name: daysName,
            isBreak: true,
          });
          continue;
        }

        const periodNormalItems = [];
        for (const si of normalScheduleItems) {
          if (si.timeTableCreationId === period.timeTableCreationId && si.day === daysName) {
            periodNormalItems.push(si);
          }
        }

        const periodElectiveItems = [];
        for (const si of electiveScheduleItems) {
          if (si.timeTableCreationId === period.timeTableCreationId && si.day === daysName) {
            periodElectiveItems.push(si);
          }
        }

        let isOverriding = false;
        for (const item of periodNormalItems) {
          if (item.isOverridingSyblingElectives === true) {
            isOverriding = true;
            break;
          }
        }

        const scheduleItemsMap = [];

        for (const item of periodNormalItems) {
          const teacher = item.employeeDetails;
          const subject = item.timeTableSubject;

          const subjectName = subject?.subjectName || 'N/A';
          const subjectId = subject?.subjectId || null;
          const roomName = item.classRoom?.roomNumber || 'N/A';
          const roomId = item.classRoom?.classRoomSectionId || null;

          let existing = null;
          for (const si of scheduleItemsMap) {
            if (si.type === 'normal' && si.subject.name === subjectName && si.room.name === roomName) {
              existing = si;
              break;
            }
          }

          if (existing) {
            existing.teachers.push({
              employeeId: teacher?.employeeId || null,
              name: teacher?.employeeName || 'N/A',
              timeTableMappingId: item.timeTableMappingId,
              teacherType: item.teacherType,
              isAttendence: item.isAttendence,
            });
          } else {
            scheduleItemsMap.push({
              type: 'normal',
              isOverridingSyblingElectives: item.isOverridingSyblingElectives,
              teachers: [
                {
                  employeeId: teacher?.employeeId || null,
                  name: teacher?.employeeName || 'N/A',
                  color: teacher?.pickColor,
                  timeTableMappingId: item.timeTableMappingId,
                  teacherType: item.teacherType,
                  isAttendence: item.isAttendence,
                },
              ],
              subject: { subjectId, name: subjectName },
              room: { classRoomSectionId: roomId, name: roomName },
            });
          }
        }

        if (!isOverriding) {
          for (const item of periodElectiveItems) {
            const teacher = item.employeeDetails;
            const subject = item.timeTableElective;

            const subjectName = subject?.electiveSubjectName || 'N/A';
            const subjectId = subject?.electiveSubjectId || null;
            const roomName = item.classRoom?.roomNumber || 'N/A';
            const roomId = item.classRoom?.classRoomSectionId || null;

            let existing = null;
            for (const si of scheduleItemsMap) {
              if (si.type === 'elective' && si.subject.name === subjectName && si.room.name === roomName) {
                existing = si;
                break;
              }
            }

            if (existing) {
              existing.teachers.push({
                employeeId: teacher?.employeeId || null,
                name: teacher?.employeeName || 'N/A',
                timeTableMappingId: item.timeTableMappingId,
                teacherType: item.teacherType,
                isAttendence: item.isAttendence,
              });
            } else {
              scheduleItemsMap.push({
                type: 'elective',
                teachers: [{
                  employeeId: teacher?.employeeId || null,
                  name: teacher?.employeeName || 'N/A',
                  timeTableMappingId: item.timeTableMappingId,
                  teacherType: item.teacherType,
                  isAttendence: item.isAttendence,
                }],
                subject: { electiveSubjectId: subjectId, name: subjectName },
                room: { classRoomSectionId: roomId, name: roomName },
              });
            }
          }
        }

        formattedDays.push({
          name: daysName,
          scheduleItems: scheduleItemsMap,
        });
      }

      formattedPeriods.push({
        timeTableCreationId: period.timeTableCreationId,
        name: period.periodName,
        startTime: period.startTime,
        endTime: period.endTime,
        days: formattedDays,
      });
    }

    structuresById.get(timeTableNameId).routines.push({
      timeTableRoutineId: routine.timeTableRoutineId,
      timetableStructureCourseMapperId: routine.timetableStructureCourseMapperId,
      isPublished: routine.isPublish,
      startDate: routine.startingDate,
      endDate: routine.endingDate,
      year: classSection?.year != null ? Number(classSection.year) : null,
      periods: formattedPeriods,
    });
  }

  // Also include course/session mappings that have no routine yet for this section
  if (courseId != null && sessionId != null) {
    const mappedWithoutRoutine = await buildMappedStructuresWithoutRoutines(
      courseId,
      sessionId,
      classSection,
    );
    for (const mapped of mappedWithoutRoutine) {
      if (!structuresById.has(mapped.timeTableNameId)) {
        structuresById.set(mapped.timeTableNameId, mapped);
      }
    }
  }

  const structures = [];
  for (const structure of structuresById.values()) {
    structures.push(structure);
  }

  return { ...placementMeta, structures, classSection };
}

function parseWeekOffList(weekOffRaw) {
  let weekOffList = [];
  try {
    weekOffList = Array.isArray(weekOffRaw)
      ? weekOffRaw
      : (typeof weekOffRaw === 'string' ? JSON.parse(weekOffRaw) : []);
    if (typeof weekOffList === 'string') {
      weekOffList = JSON.parse(weekOffList);
    }
  } catch (e) {
    weekOffList = [];
  }
  return weekOffList;
}

function buildEmptyPeriodGrid(periods, weekOffList) {
  const daysList = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const weekOffLower = [];
  for (const day of weekOffList) {
    weekOffLower.push(String(day).toLowerCase());
  }

  const formattedPeriods = [];
  for (const period of periods) {
    const formattedDays = [];
    for (const daysName of daysList) {
      if (weekOffLower.includes(daysName.toLowerCase())) {
        formattedDays.push({
          name: daysName,
          isDayOff: true,
        });
        continue;
      }
      if (period.isBreak) {
        formattedDays.push({
          name: daysName,
          isBreak: true,
        });
        continue;
      }
      formattedDays.push({
        name: daysName,
        scheduleItems: [],
      });
    }
    formattedPeriods.push({
      timeTableCreationId: period.timeTableCreationId,
      name: period.periodName,
      startTime: period.startTime,
      endTime: period.endTime,
      days: formattedDays,
    });
  }
  return formattedPeriods;
}

async function buildMappedStructuresWithoutRoutines(courseId, sessionId, classSection) {
  if (courseId == null || sessionId == null) {
    return [];
  }

  const rows = await getMappedStructuresForCourseSession(courseId, sessionId);
  const structures = [];

  for (const row of rows) {
    const plain = row.get ? row.get({ plain: true }) : row;
    const structure = plain.timeTableStructure;
    const course = plain.course;
    const session = plain.session;
    const weekOffList = parseWeekOffList(structure.weekOff);
    const periodRows = structure.timeTableName || [];

    structures.push({
      timeTableNameId: plain.timeTableNameId,
      name: structure.name || 'N/A',
      weekOff: weekOffList,
      timetableStructureCourseMapperId: plain.timetableStructureCourseMapperId,
      courseId: plain.courseId,
      courseName: course.courseName,
      courseCode: course.courseCode,
      sessionId: plain.sessionId,
      sessionName: session.sessionName,
      startingDate: plain.startingDate,
      endingDate: plain.endingDate,
      year: classSection?.year != null ? Number(classSection.year) : null,
      routines: [],
      periods: buildEmptyPeriodGrid(periodRows, weekOffList),
    });
  }

  return structures;
}

function mapRoutineClassSection(classSection) {
  if (!classSection) return null;
  const plain = classSection.get ? classSection.get({ plain: true }) : classSection;
  return {
    classSectionsId: plain.classSectionsId,
    section: plain.section,
    class: plain.year != null ? String(plain.year) : null,
    semesterId: null,
    term: resolveProgramTerm(plain),
    course: plain.courseSection
      ? {
        courseId: plain.courseSection.courseId,
        courseName: plain.courseSection.courseName,
        courseCode: plain.courseSection.courseCode,
      }
      : null,
  };
}

function mapClassSectionSummary(classSection) {
  const plain = classSection.get ? classSection.get({ plain: true }) : classSection;
  return {
    classSectionsId: plain.classSectionsId,
    section: plain.section,
    class: plain.year != null ? String(plain.year) : null,
    semesterId: null,
    term: resolveProgramTerm(plain),
  };
}

export async function getRoutineByTeacherAndAcademicYear(employeeId, courseId, sessionId) {
  const {
    employee,
    course,
    session,
    classSections,
    routines: routineRows,
  } = await timeTableCreateRepository.getTeacherRoutineBundle(employeeId, courseId, sessionId);

  const common = {
    employee: employee
      ? {
        employeeId: employee.employeeId,
        employeeName: employee.employeeName,
        employeeCode: employee.employeeCode,
        pickColor: employee.pickColor,
      }
      : null,
    course: course
      ? {
        courseId: course.courseId,
        courseName: course.courseName,
        courseCode: course.courseCode,
      }
      : null,
    session: session
      ? {
        sessionId: session.sessionId,
        sessionName: session.sessionName,
        startingDate: session.startingDate,
        endingDate: session.endingDate,
        academicYearId: session.academicYearId,
      }
      : null,
    classSections: classSections.map(mapClassSectionSummary),
  };

  if (!routineRows.length) {
    return { ...common, routines: [] };
  }

  const daysList = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const formattedRoutines = routineRows.map(({ routine, electiveScheduleItems }) => {
    const timeTableCreateName = routine.structureCourseMapping.timeTableStructure;
    const periods = timeTableCreateName.timeTableName || [];
    const normalScheduleItems = routine.timeTablecreate || [];
    const classSection = mapRoutineClassSection(resolveTimeTableRoutineSection(routine));

    let weekOffList = [];
    try {
      const weekOffRaw = timeTableCreateName.weekOff;
      weekOffList = Array.isArray(weekOffRaw)
        ? weekOffRaw
        : (typeof weekOffRaw === 'string' ? JSON.parse(weekOffRaw) : []);

      if (typeof weekOffList === 'string') {
        weekOffList = JSON.parse(weekOffList);
      }
    } catch (e) {
      weekOffList = [];
    }
    const weekOffLower = weekOffList.map(d => String(d).toLowerCase());

    const formattedPeriods = periods.map(period => {
      const formattedDays = daysList.map(daysName => {
        if (weekOffLower.includes(daysName.toLowerCase())) {
          return {
            name: daysName,
            isDayOff: true,
          };
        }

        if (period.isBreak) {
          return {
            name: daysName,
            isBreak: true,
          };
        }

        // Get items for this period and day (Normal)
        const periodNormalItems = normalScheduleItems.filter(si =>
          si.timeTableCreationId === period.timeTableCreationId && si.day === daysName
        );

        // Get items for this period and day (Elective)
        const periodElectiveItems = electiveScheduleItems.filter(si =>
          si.timeTableCreationId === period.timeTableCreationId && si.day === daysName
        );

        // Check if any normal item in this slot overrides electives
        const isOverriding = periodNormalItems.some(item => item.isOverridingSyblingElectives === true);

        const scheduleItemsMap = [];

        periodNormalItems.forEach(item => {
          let teacher = item.employeeDetails;
          let subject = item?.timeTableSubject;

          if (item.timeTableTeacherSubject) {
            teacher = item.timeTableTeacherSubject.teacherEmployeeData;
            subject = item.timeTableTeacherSubject.employeeSubject?.subjectId
              ? item.timeTableTeacherSubject.employeeSubject
              : item.timeTableTeacherSubject.employeeSubject?.subjects;
          }

          const subjectName = subject?.subjectName || "N/A";
          const subjectId = subject?.subjectId || null;
          const roomName = item.classRoom?.roomNumber || "N/A";
          const roomId = item.classRoom?.classRoomSectionId || null;

          const existing = scheduleItemsMap.find(si => si.type === 'normal' && si.subject.name === subjectName && si.room.name === roomName);
          if (existing) {
            existing.teachers.push({
              employeeId: teacher?.employeeId || null,
              name: teacher?.employeeName || "N/A",
              timeTableMappingId: item.timeTableMappingId,
              teacherType: item.teacherType,
              isAttendence: item.isAttendence
            });
          } else {
            scheduleItemsMap.push({
              type: 'normal',
              isOverridingSyblingElectives: item.isOverridingSyblingElectives,
              teachers: [
                {
                  employeeId: teacher?.employeeId || null,
                  name: teacher?.employeeName || "N/A",
                  color: teacher?.pickColor,
                  timeTableMappingId: item.timeTableMappingId,
                  teacherType: item.teacherType,
                  isAttendence: item.isAttendence
                }
              ],
              subject: { subjectId: subjectId, name: subjectName },
              room: { classRoomSectionId: roomId, name: roomName }
            });
          }
        });

        if (!isOverriding) {
          periodElectiveItems.forEach(item => {
            const teacher = item.employeeDetails;
            const subject = item.timeTableElective;

            const subjectName = subject?.electiveSubjectName || "N/A";
            const subjectId = subject?.electiveSubjectId || null;
            const roomName = item.classRoom?.roomNumber || "N/A";
            const roomId = item.classRoom?.classRoomSectionId || null;

            const existing = scheduleItemsMap.find(si => si.type === 'elective' && si.subject.name === subjectName && si.room.name === roomName);
            if (existing) {
              existing.teachers.push({
                employeeId: teacher?.employeeId || null,
                name: teacher?.employeeName || "N/A",
                timeTableMappingId: item.timeTableMappingId,
                teacherType: item.teacherType,
                isAttendence: item.isAttendence
              });
            } else {
              scheduleItemsMap.push({
                type: 'elective',
                teachers: [{
                  employeeId: teacher?.employeeId || null,
                  name: teacher?.employeeName || "N/A",
                  timeTableMappingId: item.timeTableMappingId,
                  teacherType: item.teacherType,
                  isAttendence: item.isAttendence
                }],
                subject: { electiveSubjectId: subjectId, name: subjectName },
                room: { classRoomSectionId: roomId, name: roomName }
              });
            }
          });
        }

        return {
          name: daysName,
          scheduleItems: scheduleItemsMap
        };
      });

      return {
        timeTableCreationId: period.timeTableCreationId,
        name: period.periodName,
        startTime: period.startTime,
        endTime: period.endTime,
        days: formattedDays
      };
    });

    return {
      timeTableRoutineId: routine.timeTableRoutineId,
      isPublished: routine.isPublish,
      timeTableNameId: routine.structureCourseMapping.timeTableNameId,
      name: timeTableCreateName.name || "N/A",
      startDate: routine.startingDate,
      endDate: routine.endingDate,
      classSection,
      periods: formattedPeriods
    };
  });

  return { ...common, routines: formattedRoutines };
}
