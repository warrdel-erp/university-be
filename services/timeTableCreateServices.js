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
import { decimalAdd, decimalSubtract, toMoneyNumber } from "../utility/decimalMoney.js";
import { resolveProgramTerm, resolveTimeTableRoutineSection, stripRoutinePersistPayload } from "../utility/classSectionIncludes.js";
import {
  findClassSectionTermById,
} from "../repository/classSectionTermRepository.js";
import { buildTermName, termsForYear } from "../utility/courseTerms.js";
import { formatQueryDate } from "../utility/helper.js";
import { randomUUID } from "crypto";
import { getTenantStore } from "../utility/requestContext.js";

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
  'timeTableRoutineId', 'userId', 'subjectId', 'electiveSubjectId',
  'teacherSubjectMappingId', 'classRoomSectionId', 'isSameTeacher', 'teacherType',
  'isAttendence', 'isOverridingSyblingElectives', 'timeTableType',
];

const MAPPING_REQUEST_KEYS = [
  'classSectionTermIds', 'slots', 'timeTableCreationIds', 'classSectionsId',
  'classSectionId', 'classSectionTermId', 'sourceTimeTableCellId',
  'copyTarget', 'copiedFromTimeTableCellId',
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

async function normalizeMappingTeacherInput(data, options = {}) {
  const normalized = { ...data };

  if (normalized.userId == null && normalized.employeeId != null) {
    normalized.userId = Number(normalized.employeeId);
  }

  if (
    normalized.userId == null
    && normalized.teacherSubjectMappingId != null
  ) {
    const teacherRows = await getTeacherDetailsByTeacherSubjectId(
      Number(normalized.teacherSubjectMappingId),
    );
    const teacherRow = teacherRows?.[0];
    const teacherPlain = teacherRow?.get ? teacherRow.get({ plain: true }) : teacherRow;
    if (teacherPlain?.userId != null) {
      normalized.userId = Number(teacherPlain.userId);
    }
  }

  if (
    normalized.userId != null
    && (!Array.isArray(normalized.teachers) || normalized.teachers.length === 0)
  ) {
    normalized.teachers = [{
      userId: Number(normalized.userId),
      teacherType: normalized.teacherType || 'Primary',
      isAttendence: normalized.isAttendence != null ? normalized.isAttendence : true,
    }];
  }

  return normalized;
}

function formatMappingCreateResult(cell, extra = {}) {
  const plain = cell?.get ? cell.get({ plain: true }) : cell;
  const teachers = cell?.createdTeachers || plain?.timeTableCellTeachers || [];
  const teacherRows = [];
  for (const teacher of teachers) {
    const teacherPlain = teacher?.get ? teacher.get({ plain: true }) : teacher;
    teacherRows.push(teacherPlain);
  }

  const primaryTeacher = teacherRows[0] || null;

  return {
    timeTableCellId: plain.timeTableCellId,
    timeTableCellTeacherId: primaryTeacher?.timeTableCellTeacherId ?? null,
    timeTableCellTeachers: teacherRows,
    ...extra,
  };
}

function assertRoutineNotStarted(startingDate) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const start = new Date(startingDate);
  start.setHours(0, 0, 0, 0);
  if (now >= start) {
    throw new Error('Cannot add or update mapping for a routine on or after its starting date.');
  }
}

function assertMappingRoutineEditable(routine) {
  if (!routine.isPublish) {
    return;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(routine.startingDate);
  start.setHours(0, 0, 0, 0);
  if (today > start) {
    throw new Error('Cannot edit or delete mapping for a published routine after its starting date.');
  }
}

/**
 * Unpublished draft: week cell (+ teachers) may be deleted anytime.
 * Published: only before/on start date per assertMappingRoutineEditable;
 * date-wise rows (if any) are removed with the cell graph.
 */
function assertMappingDeletable(routine) {
  if (!routine.isPublish) {
    return;
  }
  assertMappingRoutineEditable(routine);
}

function assertRoutineEditable(startingDate) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const start = new Date(startingDate);
  start.setHours(0, 0, 0, 0);
  if (now >= start) {
    throw new Error('Routine cannot be updated on or after its starting date');
  }
}

function shapeRoutineListItem(routine) {
  return {
    name: routine.structureCourseMapping.timeTableStructure.name,
    startingDate: routine.startingDate,
    endingDate: routine.endingDate,
    isPublish: Boolean(routine.isPublish),
  };
}

function buildTermRoutineSummary(routines) {
  let draftRoutineCount = 0;
  let publishedRoutineCount = 0;
  const timeTableRoutines = [];

  if (!routines) {
    return {
      timeTableRoutines,
      draftRoutineCount,
      publishedRoutineCount,
    };
  }

  for (const routine of routines) {
    const row = shapeRoutineListItem(routine);
    timeTableRoutines.push(row);
    if (row.isPublish) {
      publishedRoutineCount += 1;
    } else {
      draftRoutineCount += 1;
    }
  }

  return {
    timeTableRoutines,
    draftRoutineCount,
    publishedRoutineCount,
  };
}

function shapeTimeTableCreateList(rows, course) {
  const coursePlain = course?.get ? course.get({ plain: true }) : course;
  const byYear = {};
  let draftRoutineCount = 0;
  let publishedRoutineCount = 0;
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

    const termRoutineSummary = buildTermRoutineSummary(plain.timeTableRoutines);

    draftRoutineCount += termRoutineSummary.draftRoutineCount;
    publishedRoutineCount += termRoutineSummary.publishedRoutineCount;

    byYear[year][sectionId].termsByNum[term] = {
      term,
      termName: coursePlain ? buildTermName(coursePlain.termType, term) : `Term ${term}`,
      classSectionTermId: plain.classSectionTermId,
      classSectionsId: sectionId,
      draftRoutineCount: termRoutineSummary.draftRoutineCount,
      publishedRoutineCount: termRoutineSummary.publishedRoutineCount,
      timeTableRoutines: termRoutineSummary.timeTableRoutines,
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
    const sectionIds = [];
    const sectionKeys = Object.keys(yearBucket);
    for (const key of sectionKeys) {
      sectionIds.push(Number(key));
    }
    sectionIds.sort((a, b) => a - b);

    const classSections = [];
    for (const sectionId of sectionIds) {
      const sectionEntry = yearBucket[sectionId];
      let termNumbers = [];
      if (coursePlain) {
        termNumbers = termsForYear(yearNum, coursePlain);
      } else {
        const termKeys = Object.keys(sectionEntry.termsByNum);
        for (const key of termKeys) {
          termNumbers.push(Number(key));
        }
        termNumbers.sort((a, b) => a - b);
      }

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
            draftRoutineCount: 0,
            publishedRoutineCount: 0,
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

  return {
    ...meta,
    years,
    draftRoutineCount,
    publishedRoutineCount,
  };
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

function buildCopyPayload(sourceRow, target, request, teachers) {
  const src = sourceRow.get ? sourceRow.get({ plain: true }) : sourceRow;
  const payload = applyCopyOverrides({
    timeTableRoutineId: src.timeTableRoutineId,
    timeTableNameId: src.timeTableNameId,
    timeTableCreationId: target.timeTableCreationId,
    day: target.day,
    period: target.period,
    subjectId: src.subjectId,
    electiveSubjectId: src.electiveSubjectId,
    teacherSubjectMappingId: src.teacherSubjectMappingId,
    classRoomSectionId: src.classRoomSectionId,
    isSameTeacher: src.isSameTeacher,
    isAttendence: src.isAttendence,
    isOverridingSyblingElectives: src.isOverridingSyblingElectives,
    timeTableType: src.timeTableType,
    copiedFromTimeTableCellId: src.timeTableCellId,
  }, request);

  payload.timeTableRoutineId = src.timeTableRoutineId;
  payload.timeTableNameId = src.timeTableNameId;
  payload.timeTableCreationId = target.timeTableCreationId;
  payload.day = target.day;
  payload.period = target.period;
  payload.copiedFromTimeTableCellId = src.timeTableCellId;

  // When copying from an existing cell (sourceTimeTableCellId),
  // we must copy the entire cell including all its teacher rows.
  // Only override teachers when this is NOT a copy operation.
  const isCopyOperation = request.sourceTimeTableCellId != null;
  if (!isCopyOperation && request.userId != null) {
    payload.teachers = [{
      userId: Number(request.userId),
      teacherType: request.teacherType || 'Primary',
      isAttendence: request.isAttendence != null ? request.isAttendence : true,
    }];
  } else {
    payload.teachers = teachers;
  }

  return payload;
}

async function resolveCopyPayloads(data, options) {
  const sourceId = Number(data.sourceTimeTableCellId);
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

  const sourceTeachers = await timeTableCreateRepository.getSourceCellMappingsRepository(
    sourceId,
    options,
  );
  const teachers = [];
  for (const row of sourceTeachers) {
    const teacher = row.get ? row.get({ plain: true }) : row;
    teachers.push({
      userId: Number(teacher.userId),
      teacherType: teacher.teacherType || 'Primary',
      isAttendence: teacher.isAttendence != null ? teacher.isAttendence : true,
    });
  }

  const target = { day, period, timeTableCreationId };
  return [buildCopyPayload(source, target, data, teachers)];
}

function throwSlotConflictError(message) {
  const error = new Error(message);
  error.statusCode = 409;
  throw error;
}

async function assertNoSlotConflicts({
  userId,
  classRoomSectionId,
  day,
  periodInfo,
  startingDate,
  endingDate,
  conflictOptions,
  electiveSubjectId,
  courseId,
  excludeRoutineId,
  transaction,
}) {
  if (!periodInfo || !periodInfo.startTime || !periodInfo.endTime) {
    const error = new Error('Period startTime and endTime are required for conflict checks');
    error.statusCode = 400;
    throw error;
  }

  const { startTime, endTime } = periodInfo;
  const mergedOptions = {
    ...conflictOptions,
    ...(excludeRoutineId != null && { excludeRoutineId }),
  };

  if (userId) {
    const conflict = await timeTableCreateRepository.checkTeacherConflictRepository(
      userId,
      day,
      startTime,
      endTime,
      startingDate,
      endingDate,
      mergedOptions,
      transaction,
    );
    if (conflict) {
      throwSlotConflictError('Teacher conflict: teacher already scheduled for this slot');
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
      mergedOptions,
      transaction,
    );
    if (conflict) {
      throwSlotConflictError('Room conflict: classroom already occupied for this slot');
    }
  }

  if (electiveSubjectId && courseId) {
    const conflict = await timeTableCreateRepository.checkElectiveSubjectConflictRepository(
      electiveSubjectId,
      courseId,
      day,
      startTime,
      endTime,
      startingDate,
      endingDate,
      mergedOptions,
      transaction,
    );
    if (conflict) {
      throwSlotConflictError('Elective conflict: subject already scheduled for this slot');
    }
  }
}

async function addFacultyLoadForEmployee(userId, periodLength, transaction) {
  if (!userId || periodLength <= 0) {
    return;
  }

  const facultyLoad = await getSingleFaculityLoadDetails(userId);
  const existingLoad = toMoneyNumber(
    facultyLoad?.[0]?.dataValues?.currentLoad ?? facultyLoad?.[0]?.currentLoad,
  );
  await updateFaculityLoadByEmployeeId(
    userId,
    { currentLoad: decimalAdd(existingLoad, periodLength) },
    transaction,
  );
}

async function subtractFacultyLoadForEmployee(employeeId, periodLength, transaction) {
  if (!employeeId || periodLength <= 0) {
    return;
  }

  const facultyLoad = await getSingleFaculityLoadDetails(employeeId);
  const existingLoad = toMoneyNumber(
    facultyLoad?.[0]?.dataValues?.currentLoad ?? facultyLoad?.[0]?.currentLoad,
  );
  await updateFaculityLoadByEmployeeId(
    employeeId,
    { currentLoad: Math.max(0, decimalSubtract(existingLoad, periodLength)) },
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
  if (courseId != null) {
    course = await timeTableCreateRepository.findCourseById(courseId);
  } else if (rows.length > 0) {
    const first = rows[0].get({ plain: true });
    course = first.classSection.courseSection;
  }

  return shapeTimeTableCreateList(rows, course);
}

export async function getSingletimeTableCreateDetails(courseId) {
  const result = await timeTableCreateRepository.getSingleTimeTableCreateDetails(courseId);

  return result;
}

export async function getTimeTableByCourseAndSection(courseId, classSectionTermId, timeTableType) {
  if (timeTableType === 'elective') {
    return getElectiveRoutineGridByCourseId(courseId);
  }

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

export async function deleteTimeTableRoutine(timeTableRoutineId) {
  const routine = await timeTableCreateRepository.getRoutineByIdRepository(timeTableRoutineId);
  if (!routine) {
    throw new Error('Routine not found');
  }

  // Allow delete (draft or published) only before startingDate.
  assertRoutineEditable(routine.startingDate);

  const transaction = await sequelize.transaction();
  try {
    const deletedScheduleCount = await timeTableCreateRepository.deleteSchedulesByRoutineIdRepository(
      timeTableRoutineId,
      { transaction },
    );
    const deletedRoutineCount = await timeTableCreateRepository.deleteTimeTableRoutineRepository(
      timeTableRoutineId,
      { transaction },
    );
    if (!deletedRoutineCount) {
      throw new Error('Routine not found');
    }

    await transaction.commit();
    return {
      message: 'Routine deleted successfully',
      timeTableRoutineId: Number(timeTableRoutineId),
      deletedScheduleCount,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function deletetimeTableMapping(timeTableCellId, options = {}) {
  const transaction = await sequelize.transaction();

  try {
    const schedule = await timeTableCreateRepository.getMappingByIdRepository(
      timeTableCellId,
      { transaction },
    );
    if (!schedule) {
      const error = new Error('Mapping not found');
      error.statusCode = 404;
      throw error;
    }

    const routine = await timeTableCreateRepository.getRoutineByIdRepository(
      schedule.timeTableRoutineId,
      { transaction },
    );
    if (!routine) {
      const error = new Error('Routine not found');
      error.statusCode = 404;
      throw error;
    }

    assertMappingDeletable(routine);

    const periodInfo = await timeTableCreateRepository.getPeriodInfoRepository(
      schedule.timeTableCreationId,
      { transaction },
    );
    const periodLength = toMoneyNumber(periodInfo?.timeTableName?.periodLength ?? 0);

    const mappingIds = [Number(timeTableCellId)];
    if (options.deleteCombinedGroup && schedule.combinedGroupId) {
      const siblings = await timeTableCreateRepository.getMappingsByCombinedGroupIdRepository(
        schedule.combinedGroupId,
        { transaction },
      );
      mappingIds.length = 0;
      for (const row of siblings) {
        mappingIds.push(Number(row.timeTableCellId));
      }
    }

    const teachers = await timeTableCreateRepository.getTeachersByMappingIdsRepository(
      mappingIds,
      { transaction },
    );

    const result = await timeTableCreateRepository.deletetimeTableMapping(timeTableCellId, {
      ...options,
      transaction,
    });

    for (const teacher of teachers) {
      await subtractFacultyLoadForEmployee(teacher.userId, periodLength, transaction);
    }

    await transaction.commit();
    return {
      ...result,
      isPublish: Boolean(routine.isPublish),
      deletedTimeTableCellTeacherIds: result.deletedTimeTableCellTeacherIds,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function addtimeTableMapping(data, createdBy, updatedBy) {
  const transaction = await sequelize.transaction();

  try {
    const request = await normalizeMappingTeacherInput(data, { transaction });

    if (request.sourceTimeTableCellId != null) {
      const copyPayloads = await resolveCopyPayloads(request, { transaction });
      if (!copyPayloads.length) {
        throw new Error(`Source mapping ${data.sourceTimeTableCellId} not found`);
      }

      const firstPayload = copyPayloads[0];
      const routine = await timeTableCreateRepository.getRoutineByIdRepository(
        firstPayload.timeTableRoutineId,
        { transaction },
      );
      if (!routine) {
        throw new Error('Invalid timeTableRoutineId');
      }

      assertMappingRoutineEditable(routine);

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
        const teacherList = Array.isArray(payload.teachers) ? payload.teachers : [];
        if (teacherList.length === 0 && payload.userId != null) {
          teacherList.push({ userId: payload.userId });
        }

        for (const teacher of teacherList) {
          await assertNoSlotConflicts({
            userId: teacher.userId,
            classRoomSectionId: payload.classRoomSectionId,
            day: payload.day,
            periodInfo,
            startingDate: routine.startingDate,
            endingDate: routine.endingDate,
            conflictOptions,
            electiveSubjectId: payload.electiveSubjectId,
            courseId: routine.courseId,
            excludeRoutineId: routine.timeTableRoutineId,
            transaction,
          });
        }

        if (teacherList.length === 0) {
          await assertNoSlotConflicts({
            userId: null,
            classRoomSectionId: payload.classRoomSectionId,
            day: payload.day,
            periodInfo,
            startingDate: routine.startingDate,
            endingDate: routine.endingDate,
            conflictOptions,
            electiveSubjectId: payload.electiveSubjectId,
            courseId: routine.courseId,
            excludeRoutineId: routine.timeTableRoutineId,
            transaction,
          });
        }
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
        createdMappings.push(formatMappingCreateResult(result, {
          timeTableRoutineId: rowData.timeTableRoutineId,
          classSectionTermId: routine.classSectionTermId,
          timeTableCreationId: rowData.timeTableCreationId,
          period: rowData.period,
          day: rowData.day,
          copiedFromTimeTableCellId: payload.copiedFromTimeTableCellId,
        }));
      }

      for (const payload of copyPayloads) {
        const teacherList = Array.isArray(payload.teachers) ? payload.teachers : [];
        if (teacherList.length === 0 && payload.userId != null) {
          teacherList.push({ userId: payload.userId });
        }
        for (const teacher of teacherList) {
          await addFacultyLoadForEmployee(teacher.userId, periodLength, transaction);
        }
      }

      await transaction.commit();
      return {
        isCopy: true,
        copiedFromTimeTableCellId: Number(request.sourceTimeTableCellId),
        mappings: createdMappings,
      };
    }

    const payload = request;

    const {
      timeTableRoutineId,
      day,
      classRoomSectionId,
      userId,
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

    assertMappingRoutineEditable(routine);

    if (payload.timeTableType === 'elective' && !payload.electiveSubjectId) {
      throw new Error('electiveSubjectId is required for elective mapping');
    }

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
        userId,
        classRoomSectionId,
        day,
        periodInfo,
        startingDate: routine.startingDate,
        endingDate: routine.endingDate,
        conflictOptions,
        electiveSubjectId: payload.electiveSubjectId,
        courseId: routine.courseId,
        excludeRoutineId: routine.timeTableRoutineId,
        transaction,
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
        createdMappings.push(formatMappingCreateResult(result, {
          timeTableRoutineId: target.timeTableRoutineId,
          classSectionTermId: target.classSectionTermId,
          timeTableCreationId: slot.timeTableCreationId,
          period: slot.period,
          combinedGroupId,
          copiedFromTimeTableCellId: payload.copiedFromTimeTableCellId ?? null,
        }));
      }
    }

    await addFacultyLoadForEmployee(userId, totalPeriodLength, transaction);

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
    'electiveSubjectId',
    'subjectId',
    'teacherSubjectMappingId',
    'classRoomSectionId',
    'isSameTeacher',
    'day',
    'period',
    'timeTableType',
    'isAttendence',
    'isOverridingSyblingElectives',
    'combinedGroupId',
  ];

  try {
    const previousRoutine = await timeTableCreateRepository.getFullRoutineDetailsRepository(
      previousRoutineId,
      { transaction },
    );

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
    }, { transaction });

    if (overlap) {
      const error = new Error('Routine date range overlaps');
      error.statusCode = 409;
      throw error;
    }

    const previousCells = previousPlain.timeTableCells;
    const periodInfoByCreationId = new Map();
    const conflictOptions = {
      allowedClassSectionTermIds: [],
      excludeCombinedGroupId: null,
      excludeRoutineId: Number(previousRoutineId),
    };

    for (const cell of previousCells) {
      const teachers = cell.timeTableCellTeachers;
      if (teachers.length === 0 && !cell.classRoomSectionId && !cell.electiveSubjectId) {
        continue;
      }

      const creationId = Number(cell.timeTableCreationId);
      let periodInfo = periodInfoByCreationId.get(creationId);
      if (!periodInfo) {
        periodInfo = await timeTableCreateRepository.getPeriodInfoRepository(creationId, { transaction });
        periodInfoByCreationId.set(creationId, periodInfo);
      }

      await assertNoSlotConflicts({
        userId: null,
        classRoomSectionId: cell.classRoomSectionId,
        day: cell.day,
        periodInfo,
        startingDate: start,
        endingDate: end,
        conflictOptions,
        electiveSubjectId: cell.electiveSubjectId,
        courseId: previousPlain.courseId,
        transaction,
      });

      for (const teacher of teachers) {
        await assertNoSlotConflicts({
          userId: teacher.userId,
          classRoomSectionId: null,
          day: cell.day,
          periodInfo,
          startingDate: start,
          endingDate: end,
          conflictOptions,
          electiveSubjectId: null,
          courseId: previousPlain.courseId,
          transaction,
        });
      }
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

    for (const cell of previousCells) {
      const row = {
        timeTableRoutineId: newRoutineId,
        createdBy,
        updatedBy,
        teachers: [],
      };

      for (const field of mappingCloneFields) {
        if (cell[field] !== undefined) {
          row[field] = cell[field];
        }
      }

      for (const teacher of cell.timeTableCellTeachers) {
        row.teachers.push({
          userId: teacher.userId,
          teacherType: teacher.teacherType,
          isAttendence: teacher.isAttendence,
        });
      }

      await timeTableCreateRepository.addtimeTableMapping(row, transaction);

      const periodInfo = periodInfoByCreationId.get(Number(cell.timeTableCreationId));
      const periodLength = toMoneyNumber(periodInfo?.timeTableName?.periodLength ?? 0);
      for (const teacher of row.teachers) {
        await addFacultyLoadForEmployee(teacher.userId, periodLength, transaction);
      }
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

export async function updatetimeTableCreate(timeTableCellId, timeTableType, updatedBy) {
  const cell = await timeTableCreateRepository.findMappingById(Number(timeTableCellId));
  if (!cell) {
    throw new Error(`Mapping ${timeTableCellId} not found`);
  }

  const cellPlain = cell.get ? cell.get({ plain: true }) : cell;
  const routine = await timeTableCreateRepository.getRoutineByIdRepository(cellPlain.timeTableRoutineId);
  if (!routine) {
    throw new Error(`Routine ${cellPlain.timeTableRoutineId} not found`);
  }

  assertMappingRoutineEditable(routine);

  const data = { timeTableType, updatedBy };
  const result = await timeTableCreateRepository.updatetimeTableCreate(Number(timeTableCellId), data);
  return result;
}

async function findTeacherSlotForUpdate(baseMappingId, item, transaction) {
  if (item.timeTableCellTeacherId != null) {
    return timeTableCreateRepository.findCellTeacherRepository(baseMappingId, {
      timeTableCellTeacherId: item.timeTableCellTeacherId,
      transaction,
    });
  }

  if (item.teacherType != null) {
    return timeTableCreateRepository.findCellTeacherRepository(baseMappingId, {
      teacherType: item.teacherType,
      transaction,
    });
  }

  if (item.userId != null) {
    return timeTableCreateRepository.findCellTeacherRepository(baseMappingId, {
      userId: item.userId,
      transaction,
    });
  }

  return null;
}

function buildMappingCellPatch(item, updatedBy) {
  const cellPatch = { updatedBy };

  if (item.subjectId != null) cellPatch.subjectId = Number(item.subjectId);
  if (item.electiveSubjectId != null) cellPatch.electiveSubjectId = Number(item.electiveSubjectId);
  if (item.classRoomSectionId != null) cellPatch.classRoomSectionId = Number(item.classRoomSectionId);
  if (item.teacherSubjectMappingId != null) {
    cellPatch.teacherSubjectMappingId = item.teacherSubjectMappingId;
  }
  if (item.timeTableType != null) cellPatch.timeTableType = item.timeTableType;
  if (item.isOverridingSyblingElectives != null) {
    cellPatch.isOverridingSyblingElectives = item.isOverridingSyblingElectives;
  }
  if (item.isAttendence != null && item.teacherType == null) {
    cellPatch.isAttendence = item.isAttendence;
  }
  if (item.subjectId != null || item.electiveSubjectId != null || item.teacherSubjectMappingId != null) {
    cellPatch.isSameTeacher = false;
  }

  return cellPatch;
}

function hasMappingCellFieldUpdate(item) {
  return item.subjectId != null
    || item.electiveSubjectId != null
    || item.classRoomSectionId != null
    || item.teacherSubjectMappingId != null
    || item.timeTableType != null
    || item.isOverridingSyblingElectives != null
    || (item.isAttendence != null && item.teacherType == null);
}

function hasTeacherSlotUpdate(item) {
  return item.teacherType != null
    || item.timeTableCellTeacherId != null
    || item.userId != null
    || item.isAttendence != null
    || item.isOverridingSyblingElectives != null;
}

async function assignTeacherToMappingCell({
  baseMappingId,
  item,
  periodLength,
  createdBy,
  updatedBy,
  transaction,
}) {
  const cellPatch = buildMappingCellPatch(item, updatedBy);
  if (Object.keys(cellPatch).length > 1) {
    await timeTableCreateRepository.updateMapping(baseMappingId, cellPatch, transaction);
  }

  await addFacultyLoadForEmployee(item.userId, periodLength, transaction);

  await timeTableCreateRepository.addCellTeacherRepository({
    timeTableCellId: baseMappingId,
    userId: Number(item.userId),
    teacherType: item.teacherType || 'Primary',
    isAttendence: item.isAttendence != null ? item.isAttendence : true,
    createdBy,
    updatedBy,
  }, transaction);

  await timeTableCreateRepository.syncTeacherToDateWiseCellsRepository(
    baseMappingId,
    {
      userId: Number(item.userId),
      teacherType: item.teacherType || 'Primary',
      isAttendence: item.isAttendence != null ? item.isAttendence : true,
      createdBy,
      updatedBy,
    },
    { transaction },
  );
}

export async function updateSimpleTeacherMapping(mappingArray, createdBy, updatedBy) {
  const transaction = await sequelize.transaction();

  try {
    const base = mappingArray[0];
    let baseRow = await timeTableCreateRepository.findMappingById(base.timeTableCellId);

    if (!baseRow) {
      throw new Error(`Base mapping ${base.timeTableCellId} not found`);
    }

    baseRow = baseRow.get({ plain: true });
    const baseMappingId = Number(baseRow.timeTableCellId);

    const routineInfo = await timeTableCreateRepository.getRoutineByIdRepository(baseRow.timeTableRoutineId);
    if (!routineInfo) {
      throw new Error(`Routine ${baseRow.timeTableRoutineId} not found`);
    }
    const { startingDate, endingDate } = routineInfo;

    assertMappingRoutineEditable(routineInfo);

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
      (item) => item.isNew === true
        && String(item.teacherType || '').toLowerCase() === 'secondary',
    );

    const effectiveRoomId = base.classRoomSectionId ?? baseRow.classRoomSectionId;
    if (effectiveRoomId && !addingSecondaryTeacher) {
      const roomConflict = await timeTableCreateRepository.checkRoomConflictRepository(
        effectiveRoomId,
        baseRow.day,
        startTime,
        endTime,
        startingDate,
        endingDate,
        { excludeTimeTableCellId: baseMappingId },
      );

      if (roomConflict) {
        throw new Error('Room conflict: classroom already occupied for this slot');
      }
    }

    for (const item of mappingArray) {
      if (item.userId) {
        const conflict = await timeTableCreateRepository.checkTeacherConflictRepository(
          item.userId,
          baseRow.day,
          startTime,
          endTime,
          startingDate,
          endingDate,
          { excludeTimeTableCellId: baseMappingId },
        );

        if (conflict) {
          throw new Error('Teacher conflict: teacher already scheduled for this slot');
        }
      }

      if (item.isNew === true) {
        if (!item.userId) {
          throw new Error('userId is required for new teacher entry');
        }

        if (String(item.teacherType || '').toLowerCase() === 'secondary') {
          const primaryTeacher = await timeTableCreateRepository.findCellTeacherRepository(
            baseMappingId,
            { teacherType: 'Primary', transaction },
          );
          if (!primaryTeacher) {
            throw new Error('Assign primary teacher before adding a secondary teacher');
          }

          const existingSecondary = await timeTableCreateRepository.findCellTeacherRepository(
            baseMappingId,
            { teacherType: 'Secondary', transaction },
          );
          if (existingSecondary) {
            throw new Error('Secondary teacher already assigned for this cell');
          }
        }

        await addFacultyLoadForEmployee(item.userId, periodLength, transaction);

        const cellPatch = buildMappingCellPatch(item, updatedBy);
        if (Object.keys(cellPatch).length > 1) {
          await timeTableCreateRepository.updateMapping(baseMappingId, cellPatch, transaction);
        }

        const teacherType = item.teacherType || 'Secondary';
        const isAttendence = item.isAttendence != null ? item.isAttendence : false;

        await timeTableCreateRepository.addCellTeacherRepository({
          timeTableCellId: baseMappingId,
          userId: Number(item.userId),
          teacherType,
          isAttendence,
          createdBy,
          updatedBy,
        }, transaction);

        await timeTableCreateRepository.syncTeacherToDateWiseCellsRepository(
          baseMappingId,
          {
            userId: Number(item.userId),
            teacherType,
            isAttendence,
            createdBy,
            updatedBy,
          },
          { transaction },
        );
        continue;
      }

      if (!hasTeacherSlotUpdate(item) && !hasMappingCellFieldUpdate(item)) {
        continue;
      }

      if (!hasTeacherSlotUpdate(item)) {
        const cellPatch = buildMappingCellPatch(item, updatedBy);
        if (Object.keys(cellPatch).length > 1) {
          await timeTableCreateRepository.updateMapping(baseMappingId, cellPatch, transaction);
        }
        continue;
      }

      let teacher = await findTeacherSlotForUpdate(baseMappingId, item, transaction);

      if (!teacher) {
        if (!item.userId) {
          throw new Error(`Teacher row not found for mapping ${baseMappingId}`);
        }

        await assignTeacherToMappingCell({
          baseMappingId,
          item,
          periodLength,
          createdBy,
          updatedBy,
          transaction,
        });
        continue;
      }

      const teacherPlain = teacher.get ? teacher.get({ plain: true }) : teacher;
      const cellPatch = buildMappingCellPatch(item, updatedBy);
      if (Object.keys(cellPatch).length > 1) {
        await timeTableCreateRepository.updateMapping(baseMappingId, cellPatch, transaction);
      }

      if (item.userId != null && Number(teacherPlain.userId) !== Number(item.userId)) {
        const previousUserId = Number(teacherPlain.userId);
        await subtractFacultyLoadForEmployee(previousUserId, periodLength, transaction);
        await addFacultyLoadForEmployee(item.userId, periodLength, transaction);
        await timeTableCreateRepository.updateCellTeacherRepository(
          teacherPlain.timeTableCellTeacherId,
          {
            userId: Number(item.userId),
            updatedBy,
          },
          transaction,
        );
        await timeTableCreateRepository.updateDateWiseTeachersUserIdRepository(
          baseMappingId,
          previousUserId,
          Number(item.userId),
          { transaction, updatedBy },
        );
        teacherPlain.userId = Number(item.userId);
      }

      const teacherTypeToSave = item.teacherType != null ? item.teacherType : teacherPlain.teacherType;
      const attendenceToSave = item.isAttendence != null ? item.isAttendence : teacherPlain.isAttendence;
      const noChange = teacherPlain.teacherType === teacherTypeToSave
        && teacherPlain.isAttendence === attendenceToSave
        && (item.isOverridingSyblingElectives == null
          || baseRow.isOverridingSyblingElectives === item.isOverridingSyblingElectives);

      if (!noChange) {
        await timeTableCreateRepository.updateMapping(
          baseMappingId,
          {
            teacherType: teacherTypeToSave,
            isAttendence: attendenceToSave,
            isOverridingSyblingElectives: item.isOverridingSyblingElectives,
            timeTableCellTeacherId: teacherPlain.timeTableCellTeacherId,
            updatedBy,
          },
          transaction,
        );
      }
    }

    await transaction.commit();
    return { success: true, message: 'Teacher mapping updated successfully' };
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
    const timeTableCreate = item?.timeTableRoutine ?? item?.timeTablecreate;

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
    const sectionRoutine = (item?.timeTableCells || []).reduce((acc, curr) => {
      let dayObj = acc.find((d) => d.day === curr.day);
      if (!dayObj) {
        dayObj = { day: curr.day, period: [] };
        acc.push(dayObj);
      }
      const sameTeacher = curr?.isSameTeacher;
      const subject = sameTeacher
        ? (curr?.timeTableTeacherSubject?.employeeSubject?.subjectName ?? curr?.timeTableTeacherSubject?.employeeSubject?.subjects?.subjectName)
        : curr?.timeTableSubject?.subjectName;

      const subjectCode = sameTeacher
        ? (curr?.timeTableTeacherSubject?.employeeSubject?.subjectCode ?? curr?.timeTableTeacherSubject?.employeeSubject?.subjects?.subjectCode)
        : curr?.timeTableSubject?.subjectCode;

      const subjectId = sameTeacher
        ? (curr?.timeTableTeacherSubject?.employeeSubject?.subjectId ?? curr?.timeTableTeacherSubject?.employeeSubject?.subjects?.subjectId)
        : curr?.timeTableSubject?.subjectId;

      const teachers = curr?.timeTableCellTeachers?.length
        ? curr.timeTableCellTeachers
        : [null];

      let existPeriod = dayObj.period.find((d) => d.timeTableCreationId === curr?.timeTableCreationId);

      for (const teacher of teachers) {
        const employeeDetails = teacher?.employeeDetails;
        const teacherName = sameTeacher
          ? curr?.timeTableTeacherSubject?.teacherEmployeeData?.employeeName
          : employeeDetails?.employeeName;
        const employeeCode = sameTeacher
          ? curr?.timeTableTeacherSubject?.teacherEmployeeData?.employeeCode
          : employeeDetails?.employeeCode;
        const userId = sameTeacher
          ? curr?.timeTableTeacherSubject?.teacherEmployeeData?.userId
          : employeeDetails?.userId;
        const pickColor = sameTeacher
          ? curr?.timeTableTeacherSubject?.teacherEmployeeData?.pickColor
          : employeeDetails?.pickColor;

        const mappingEntry = {
          timeTableCellId: curr?.timeTableCellId,
          employeeName: teacherName || "N/A",
          employeeCode: employeeCode || "",
          pickColor: pickColor || "",
          userId: userId || null,
          teacherType: teacher?.teacherType || null,
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

        if (!existPeriod) {
          existPeriod = {
            timeTableCreationId: curr?.timeTableCreationId,
            periodName: curr?.timeTablecreation?.periodName,
            isBreak: curr?.timeTablecreation?.isBreak,
            periodLength: curr?.timeTablecreation?.periodLength,
            periodGap: curr?.timeTablecreation?.periodGap,
            startTime: curr?.timeTablecreation?.startTime,
            endTime: curr?.timeTablecreation?.endTime,
            mappingData: [mappingEntry],
          };
          dayObj.period.push(existPeriod);
        } else {
          existPeriod.mappingData.push(mappingEntry);
        }
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
//         timeTableCellId,
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
//         timeTableCellId,
//         employeeName: teacherData?.employeeName || "N/A",
//         employeeCode: teacherData?.employeeCode || "",
//         pickColor: teacherData?.pickColor || "",
//         userId: teacherData?.userId || null,
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
//         m.userId === mappingEntry.userId &&
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
    const key = item.structureCourseMapping?.timeTableNameId
      ?? item.timeTableCells?.[0]?.timeTableNameId
      ?? item.timeTableNameId
      ?? `routine-${item.timeTableRoutineId}`;

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

    //  STEP 4: FLATTEN — one mapping entry per cell teacher
    for (const item of itemsToProcess) {
      const course = item.timeTableCourse || {};
      const classSection = resolveTimeTableRoutineSection(item) || {};

      for (const curr of item?.timeTableCells || []) {
        const {
          day,
          isSameTeacher,
          timeTableCellId,
          timeTableCreationId,
          timeTableType,
          timeTablecreation,
          timeTableSubject,
          timeTableTeacherSubject,
          timeTableElective,
          classRoom,
          timeTableCellTeachers,
        } = curr || {};

        let subjectData = null;
        if (isSameTeacher === true) {
          subjectData = timeTableTeacherSubject?.employeeSubject?.subjectId
            ? timeTableTeacherSubject.employeeSubject
            : (timeTableTeacherSubject?.employeeSubject?.subjects || null);
        } else {
          subjectData = timeTableSubject || null;
        }

        const teachers = timeTableCellTeachers?.length
          ? timeTableCellTeachers
          : [null];

        for (const teacher of teachers) {
          const teacherData = isSameTeacher === true
            ? (timeTableTeacherSubject?.teacherEmployeeData || teacher?.employeeDetails || null)
            : (teacher?.employeeDetails || null);

          const mappingEntry = {
            timeTableCellId,
            combinedGroupId: curr?.combinedGroupId ?? null,
            employeeName: teacherData?.employeeName || "N/A",
            employeeCode: teacherData?.employeeCode || "",
            pickColor: teacherData?.pickColor || "",
            userId: teacherData?.userId || teacher?.userId || null,
            teacherType: teacher?.teacherType || null,
            isAttendence: teacher?.isAttendence ?? curr?.isAttendence ?? null,
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
        }
      }
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
          (m) => m.timeTableCellId === mappingEntry.timeTableCellId
            && m.teacherType === mappingEntry.teacherType,
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

const WEEKDAY_BY_JS_INDEX = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const WEEKDAY_ALIASES = {
  sun: 'sunday',
  sunday: 'sunday',
  mon: 'monday',
  monday: 'monday',
  tue: 'tuesday',
  tues: 'tuesday',
  tuesday: 'tuesday',
  wed: 'wednesday',
  wednesday: 'wednesday',
  thu: 'thursday',
  thur: 'thursday',
  thurs: 'thursday',
  thursday: 'thursday',
  fri: 'friday',
  friday: 'friday',
  sat: 'saturday',
  saturday: 'saturday',
};

function normalizeWeekdayKey(value) {
  if (value == null) {
    return null;
  }
  const key = String(value).trim().toLowerCase();
  return WEEKDAY_ALIASES[key] || null;
}

function cellMatchesPeriodDay(cell, period, daysName) {
  if (Number(cell.timeTableCreationId) !== Number(period.timeTableCreationId)) {
    return false;
  }
  const cellDay = normalizeWeekdayKey(cell.day);
  const targetDay = normalizeWeekdayKey(daysName);
  return cellDay != null && cellDay === targetDay;
}

function collectPeriodCells(cells, period, daysName) {
  const result = [];
  const seenCellIds = new Set();

  for (const cell of cells) {
    if (!cellMatchesPeriodDay(cell, period, daysName)) {
      continue;
    }
    const cellId = Number(cell.timeTableCellId);
    if (seenCellIds.has(cellId)) {
      continue;
    }
    seenCellIds.add(cellId);
    result.push(cell);
  }

  result.sort((a, b) => Number(a.timeTableCellId) - Number(b.timeTableCellId));
  return result;
}

function resolveCellSubject(cell) {
  if (cell.isSameTeacher === true && cell.timeTableTeacherSubject?.employeeSubject) {
    const mappedSubject = cell.timeTableTeacherSubject.employeeSubject;
    return {
      subjectId: mappedSubject.subjectId ?? null,
      name: mappedSubject.subjectName ?? 'N/A',
    };
  }

  const subject = cell.timeTableSubject;
  return {
    subjectId: subject?.subjectId ?? null,
    name: subject?.subjectName ?? 'N/A',
  };
}

function weekdayNameFromDateOnly(dateStr) {
  const date = new Date(`${dateStr}T12:00:00`);
  return WEEKDAY_BY_JS_INDEX[date.getDay()];
}

function eachDateInRange(startStr, endStr) {
  const dates = [];
  let current = startStr;
  while (current <= endStr) {
    dates.push(current);
    const next = new Date(`${current}T12:00:00`);
    next.setDate(next.getDate() + 1);
    current = toDateOnlyString(next);
  }
  return dates;
}

export async function publishTimeTableService(timeTableRoutineId) {
  const transaction = await sequelize.transaction();

  try {
    const routine = await timeTableCreateRepository.getRoutineForPublishRepository(
      timeTableRoutineId,
      { transaction },
    );
    if (!routine) {
      throw new Error('Time table create ID not found');
    }

    const plain = routine.get({ plain: true });

    const start = toDateOnlyString(plain.startingDate);
    const end = toDateOnlyString(plain.endingDate);
    if (!start || !end) {
      throw new Error('Routine startingDate and endingDate are required to publish');
    }
    if (start > end) {
      throw new Error('Routine endingDate cannot be before startingDate');
    }

    const actorId = getTenantStore().userId ?? plain.updatedBy ?? plain.createdBy;
    if (!actorId) {
      throw new Error('User id is required to publish time table');
    }

    const weekOff = parseWeekOff(plain.structureCourseMapping?.timeTableStructure?.weekOff);

    const cells = await timeTableCreateRepository.getRoutineCellsForPublishRepository(
      timeTableRoutineId,
      { transaction },
    );

    if (!cells.length) {
      throw new Error('No timetable cells found for this routine');
    }

    const cellsByDay = new Map();
    const mappingIds = [];
    for (const cell of cells) {
      const cellPlain = cell.get({ plain: true });
      mappingIds.push(Number(cellPlain.timeTableCellId));
      const dayKey = normalizeWeekdayKey(cellPlain.day);
      if (!dayKey) {
        continue;
      }
      if (!cellsByDay.has(dayKey)) {
        cellsByDay.set(dayKey, []);
      }
      cellsByDay.get(dayKey).push(cellPlain);
    }

    if (cellsByDay.size === 0) {
      throw new Error('Timetable cells have invalid day values');
    }

    await timeTableCreateRepository.clearDateWiseForMappingIdsRepository(
      mappingIds,
      transaction,
    );

    const planned = [];
    for (const dateStr of eachDateInRange(start, end)) {
      const weekday = normalizeWeekdayKey(weekdayNameFromDateOnly(dateStr));
      if (!weekday || weekOff.includes(weekday)) {
        continue;
      }

      const dayCells = cellsByDay.get(weekday);
      if (!dayCells) {
        continue;
      }

      for (const cell of dayCells) {
        planned.push({ cell, date: dateStr });
      }
    }

    if (!planned.length) {
      throw new Error('No date-wise timetable rows could be generated for this routine');
    }

    const dateWisePayload = [];
    for (const item of planned) {
      dateWisePayload.push({
        timeTableCellId: item.cell.timeTableCellId,
        date: item.date,
        classRoomSectionId: item.cell.classRoomSectionId,
        createdBy: actorId,
        updatedBy: actorId,
      });
    }

    const createdDateWise = await timeTableCreateRepository.bulkCreateDateWiseCellsRepository(
      dateWisePayload,
      transaction,
    );

    const teacherPayload = [];
    for (let i = 0; i < createdDateWise.length; i++) {
      const dateWiseRow = createdDateWise[i];
      const teachers = planned[i].cell.timeTableCellTeachers || [];
      for (const teacher of teachers) {
        teacherPayload.push({
          timeTableCellDateWiseId: dateWiseRow.timeTableCellDateWiseId,
          userId: Number(teacher.userId),
          teacherType: teacher.teacherType,
          isAttendence: teacher.isAttendence,
          createdBy: actorId,
          updatedBy: actorId,
        });
      }
    }

    await timeTableCreateRepository.bulkCreateDateWiseTeachersRepository(
      teacherPayload,
      transaction,
    );

    await timeTableCreateRepository.publishTimeTableRepository(timeTableRoutineId, {
      transaction,
    });

    await transaction.commit();

    const dateWiseByCellId = {};
    for (const item of planned) {
      const cellId = Number(item.cell.timeTableCellId);
      dateWiseByCellId[cellId] = (dateWiseByCellId[cellId] || 0) + 1;
    }

    const cellSummary = [];
    for (const cellId of mappingIds) {
      cellSummary.push({
        timeTableCellId: cellId,
        dateWiseCount: dateWiseByCellId[cellId] || 0,
      });
    }

    return {
      message: 'Time table published successfully',
      timeTableRoutineId: Number(timeTableRoutineId),
      startingDate: start,
      endingDate: end,
      weekCellCount: mappingIds.length,
      dateWiseCount: createdDateWise.length,
      teacherDateWiseCount: teacherPayload.length,
      cells: cellSummary,
    };
  } catch (error) {
    await transaction.rollback();
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new Error('Date-wise timetable row already exists for this cell and date');
    }
    throw error;
  }
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

  if (!subjectsData) {
    throw new Error('classSectionTermId not found');
  }

  const studentSubjects = subjectsFromClassSectionStudents(subjectsData);
  const finalResult = [];

  for (const routine of timeTableData) {
    const mapping = routine.structureCourseMapping;
    if (!mapping || !mapping.timeTableStructure) {
      continue;
    }

    const { countMap, subjectsFromCells } = countSubjectsInRoutine(routine.timeTableCells || []);
    finalResult.push({
      routine,
      mapping,
      countMap,
      subjectsFromCells,
    });
  }

  const cellSubjectLists = [];
  for (const entry of finalResult) {
    cellSubjectLists.push(entry.subjectsFromCells);
  }

  let subjectsList = mergeSubjectLists(studentSubjects, ...cellSubjectLists);

  const unresolvedIds = [];
  for (const subject of subjectsList) {
    if (!subject.subject && !subject.subjectCode) {
      unresolvedIds.push(subject.subjectId);
    }
  }

  if (unresolvedIds.length) {
    const resolvedSubjects = await timeTableCreateRepository.getSubjectsByIds(unresolvedIds);
    subjectsList = mergeSubjectLists(subjectsList, resolvedSubjects);
  }

  const result = [];
  for (const entry of finalResult) {
    const structure = entry.mapping.timeTableStructure;
    const subjects = [];
    for (const subject of subjectsList) {
      subjects.push({
        subjectId: subject.subjectId,
        subject: subject.subject,
        subjectCode: subject.subjectCode,
        count: entry.countMap[subject.subjectId] || 0,
      });
    }

    result.push({
      timeTableNameId: entry.mapping.timeTableNameId,
      timeTableName: structure.name,
      subjects,
    });
  }

  return result;
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
    const normalCells = routine.timeTableCells || [];

    const matchingElectives = [];
    for (const er of electiveRoutines) {
      if (er.structureCourseMapping.timeTableNameId === timeTableNameId) {
        matchingElectives.push(er);
      }
    }
    const electiveCells = [];
    for (const er of matchingElectives) {
      const cells = er.timeTableCells || [];
      for (const cell of cells) {
        electiveCells.push(cell);
      }
    }

    const weekOffList = parseWeekOffList(timeTableCreateName.weekOff);
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

        const periodNormalCells = collectPeriodCells(normalCells, period, daysName);

        const periodElectiveCells = collectPeriodCells(electiveCells, period, daysName);

        let isOverriding = false;
        for (const cell of periodNormalCells) {
          if (cell.isOverridingSyblingElectives === true) {
            isOverriding = true;
            break;
          }
        }

        const scheduleItems = formatNormalCellsAsScheduleItems(periodNormalCells);

        if (!isOverriding) {
          const electiveItems = formatElectiveCellsAsScheduleItems(periodElectiveCells);
          for (const item of electiveItems) {
            scheduleItems.push(item);
          }
        }

        formattedDays.push({
          name: daysName,
          scheduleItems,
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

function mapCellTeachers(cell) {
  const teachers = cell.timeTableCellTeachers || [];
  const mapped = [];

  for (const teacherRow of teachers) {
    const employee = teacherRow.employeeDetails;
    mapped.push({
      employeeId: employee ? employee.employeeId : null,
      userId: teacherRow.userId,
      name: employee ? employee.employeeName : 'N/A',
      color: employee ? employee.pickColor : undefined,
      timeTableCellId: cell.timeTableCellId,
      timeTableCellTeacherId: teacherRow.timeTableCellTeacherId,
      teacherType: teacherRow.teacherType,
      isAttendence: teacherRow.isAttendence,
    });
  }

  if (mapped.length === 0 && cell.isSameTeacher === true) {
    const employee = cell.timeTableTeacherSubject?.teacherEmployeeData;
    if (employee) {
      mapped.push({
        employeeId: employee.employeeId ?? null,
        userId: employee.userId ?? null,
        name: employee.employeeName ?? 'N/A',
        color: employee.pickColor,
        timeTableCellId: cell.timeTableCellId,
        timeTableCellTeacherId: null,
        teacherType: 'Primary',
        isAttendence: cell.isAttendence ?? true,
      });
    }
  }

  return mapped;
}

function formatNormalCellsAsScheduleItems(periodNormalCells) {
  const scheduleItems = [];

  for (const cell of periodNormalCells) {
    const subject = resolveCellSubject(cell);
    const roomName = cell.classRoom ? cell.classRoom.roomNumber : 'N/A';
    const roomId = cell.classRoom ? cell.classRoom.classRoomSectionId : null;

    scheduleItems.push({
      timeTableCellId: cell.timeTableCellId,
      period: cell.period,
      type: 'normal',
      isOverridingSyblingElectives: cell.isOverridingSyblingElectives,
      teachers: mapCellTeachers(cell),
      subject,
      room: { classRoomSectionId: roomId, name: roomName },
    });
  }

  return scheduleItems;
}

function formatElectiveCellsAsScheduleItems(periodElectiveCells) {
  const scheduleItems = [];

  for (const cell of periodElectiveCells) {
    const subject = cell.timeTableElective;
    const subjectName = subject ? subject.electiveSubjectName : 'N/A';
    const subjectId = subject ? subject.electiveSubjectId : null;
    const roomName = cell.classRoom ? cell.classRoom.roomNumber : 'N/A';
    const roomId = cell.classRoom ? cell.classRoom.classRoomSectionId : null;

    scheduleItems.push({
      timeTableCellId: cell.timeTableCellId,
      period: cell.period,
      type: 'elective',
      teachers: mapCellTeachers(cell),
      subject: { electiveSubjectId: subjectId, name: subjectName },
      room: { classRoomSectionId: roomId, name: roomName },
    });
  }

  return scheduleItems;
}

function formatElectiveRoutinePeriods(periods, cells, weekOffList) {
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

      const periodElectiveCells = collectPeriodCells(cells, period, daysName);

      formattedDays.push({
        name: daysName,
        scheduleItems: formatElectiveCellsAsScheduleItems(periodElectiveCells),
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

async function getElectiveRoutineGridByCourseId(courseId) {
  const courseIdNum = Number(courseId);
  const placementMeta = {
    classSectionTermId: null,
    section: null,
    term: null,
    year: null,
    courseId: courseIdNum,
    sessionId: null,
  };

  const electiveRoutines =
    await timeTableCreateRepository.getElectiveRoutinesByCourseIdRepository(courseIdNum);

  const structuresById = new Map();

  for (const routine of electiveRoutines) {
    const mapping = routine.structureCourseMapping;
    const timeTableNameId = mapping.timeTableNameId;
    const timeTableCreateName = mapping.timeTableStructure;
    const periods = timeTableCreateName.timeTableName || [];
    const cells = routine.timeTableCells || [];
    const weekOffList = parseWeekOffList(timeTableCreateName.weekOff);

    if (!structuresById.has(timeTableNameId)) {
      structuresById.set(timeTableNameId, {
        timeTableNameId,
        name: timeTableCreateName.name || 'N/A',
        weekOff: weekOffList,
        timetableStructureCourseMapperId: mapping.timetableStructureCourseMapperId,
        courseId: Number(mapping.courseId),
        sessionId: Number(mapping.sessionId),
        startingDate: mapping.startingDate,
        endingDate: mapping.endingDate,
        routines: [],
      });
    }

    structuresById.get(timeTableNameId).routines.push({
      timeTableRoutineId: routine.timeTableRoutineId,
      timetableStructureCourseMapperId: routine.timetableStructureCourseMapperId,
      isPublished: routine.isPublish,
      startDate: routine.startingDate,
      endDate: routine.endingDate,
      year: null,
      periods: formatElectiveRoutinePeriods(periods, cells, weekOffList),
    });
  }

  const mappedWithoutRoutine = await buildMappedStructuresWithoutRoutines(courseIdNum, null, null);
  for (const mapped of mappedWithoutRoutine) {
    if (!structuresById.has(mapped.timeTableNameId)) {
      structuresById.set(mapped.timeTableNameId, mapped);
    }
  }

  const structures = [];
  for (const structure of structuresById.values()) {
    structures.push(structure);
  }

  return {
    ...placementMeta,
    structures,
    classSection: null,
  };
}

async function buildMappedStructuresWithoutRoutines(courseId, sessionId, classSection) {
  if (courseId == null) {
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

export async function getRoutineByTeacherAndAcademicYear(userId, courseId, sessionId, subjectId) {
  const bundle = await timeTableCreateRepository.getTeacherRoutineBundle(
    userId,
    courseId,
    sessionId,
    subjectId,
  );

  const employee = bundle.employee;
  const course = bundle.course;
  const session = bundle.session;
  const classSections = bundle.classSections;
  const routineRows = bundle.routines;

  const classSectionSummaries = [];
  for (const classSection of classSections) {
    classSectionSummaries.push(mapClassSectionSummary(classSection));
  }

  const common = {
    employee: employee
      ? {
        employeeId: employee.employeeId,
        userId: employee.userId,
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
    classSections: classSectionSummaries,
  };

  if (!routineRows.length) {
    return { ...common, routines: [] };
  }

  const daysList = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const formattedRoutines = [];

  for (const row of routineRows) {
    const routine = row.routine;
    const electiveCells = row.electiveCells;
    const mapping = routine.structureCourseMapping;
    const timeTableCreateName = mapping.timeTableStructure;
    const periods = timeTableCreateName.timeTableName || [];
    const normalCells = routine.timeTableCells || [];
    const classSection = mapRoutineClassSection(resolveTimeTableRoutineSection(routine));
    const weekOffList = parseWeekOffList(timeTableCreateName.weekOff);
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

        const periodNormalCells = collectPeriodCells(normalCells, period, daysName);

        const periodElectiveCells = collectPeriodCells(electiveCells, period, daysName);

        let isOverriding = false;
        for (const cell of periodNormalCells) {
          if (cell.isOverridingSyblingElectives === true) {
            isOverriding = true;
            break;
          }
        }

        const scheduleItems = formatNormalCellsAsScheduleItems(periodNormalCells);

        if (!isOverriding) {
          const electiveItems = formatElectiveCellsAsScheduleItems(periodElectiveCells);
          for (const item of electiveItems) {
            scheduleItems.push(item);
          }
        }

        formattedDays.push({
          name: daysName,
          scheduleItems,
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

    formattedRoutines.push({
      timeTableRoutineId: routine.timeTableRoutineId,
      isPublished: routine.isPublish,
      timeTableNameId: mapping.timeTableNameId,
      name: timeTableCreateName.name || 'N/A',
      startDate: routine.startingDate,
      endDate: routine.endingDate,
      classSection,
      periods: formattedPeriods,
    });
  }

  return { ...common, routines: formattedRoutines };
}
