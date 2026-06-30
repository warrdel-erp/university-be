import * as timeTableCreateRepository from "../repository/timeTablecreateRepository.js";
import { getSingleTimeTableById } from "../repository/timeTableRepository.js";
import { getTeacherDetailsByTeacherSubjectId } from "../repository/teacherSubjectMappingRepository.js";
import {
  getSingleFaculityLoadDetails,
  updateFaculityLoad,
  updateFaculityLoadByEmployeeId,
} from "../repository/faculityLoadRepository.js";
import sequelize from "../database/sequelizeConfig.js";
import { getHolidayStartEndDate } from "../repository/holidayRepository.js";
import { decimalAdd, toMoneyNumber } from "../utility/decimalMoney.js";
import { resolveProgramTerm } from "../utility/classSectionIncludes.js";
import {
  findClassSectionTermById,
  resolveClassSectionTermId as resolveClassSectionTermIdFromRepo,
} from "../repository/classSectionTermRepository.js";
import { randomUUID } from "crypto";

async function resolveRoutinePlacement(data, options = {}) {
  const payload = { ...data };

  if (payload.classSectionTermId != null && payload.classSectionTermId !== '') {
    payload.classSectionTermId = Number(payload.classSectionTermId);
    const termRow = await findClassSectionTermById(payload.classSectionTermId, options);
    if (!termRow) {
      throw new Error('classSectionTermId not found');
    }
    const plain = termRow.get ? termRow.get({ plain: true }) : termRow;
    payload.classSectionsId = payload.classSectionsId ?? plain.classSectionsId ?? plain.classSection?.classSectionsId;
    return payload;
  }

  const sectionId = payload.classSectionsId ?? payload.classSectionId ?? null;
  if (sectionId != null && payload.term != null && payload.term !== '') {
    const classSectionTermId = await resolveClassSectionTermIdFromRepo(
      { classSectionsId: sectionId, term: Number(payload.term) },
      options,
    );
    if (!classSectionTermId) {
      throw new Error('classSectionTermId could not be resolved for routine');
    }
    payload.classSectionTermId = classSectionTermId;
    payload.classSectionsId = Number(sectionId);
    return payload;
  }

  if (sectionId != null) {
    payload.classSectionsId = Number(sectionId);
  }

  return payload;
}

function routineScopeWhere({ classSectionTermId, classSectionsId } = {}) {
  if (classSectionTermId != null) {
    return { classSectionTermId: Number(classSectionTermId) };
  }
  if (classSectionsId != null) {
    return { classSectionsId: Number(classSectionsId) };
  }
  return {};
}

export async function resolveClassSectionTermIdForQuery(classSectionsId, term) {
  return resolveClassSectionTermIdFromRepo({
    classSectionsId,
    term: Number(term),
  });
}

function normalizeMappingSlots(data) {
  if (Array.isArray(data.slots) && data.slots.length) {
    return data.slots.map((slot) => {
      const timeTableCreationId = Number(slot.timeTableCreationId);
      const period = Number(slot.period);
      if (!timeTableCreationId || !period) {
        throw new Error('Each slot must include timeTableCreationId and period');
      }
      return { timeTableCreationId, period };
    });
  }

  const timeTableCreationId = Number(data.timeTableCreationId);
  const period = Number(data.period);
  if (!timeTableCreationId || !period) {
    throw new Error('timeTableCreationId and period are required');
  }

  return [{ timeTableCreationId, period }];
}

function normalizeClassSectionTermIds(data, anchorRoutine) {
  const rawIds = Array.isArray(data.classSectionTermIds)
    ? data.classSectionTermIds.map(Number).filter(Boolean)
    : [];

  if (rawIds.length) {
    return [...new Set(rawIds)];
  }

  if (data.classSectionTermId != null && data.classSectionTermId !== '') {
    return [Number(data.classSectionTermId)];
  }

  if (anchorRoutine?.classSectionTermId) {
    return [Number(anchorRoutine.classSectionTermId)];
  }

  return [];
}

async function resolveClassSectionTermIdsForMapping(data, anchorRoutine, options = {}) {
  const direct = normalizeClassSectionTermIds(data, anchorRoutine);
  if (direct.length) {
    return direct;
  }

  const sectionId = data.classSectionsId ?? data.classSectionId ?? anchorRoutine?.classSectionsId;
  if (sectionId == null) {
    return [];
  }

  let term = data.term != null && data.term !== '' ? Number(data.term) : null;
  if (term == null && data.subjectId != null) {
    term = await timeTableCreateRepository.getSubjectProgramTerm(data.subjectId, options);
  }

  if (term == null) {
    return [];
  }

  const classSectionTermId = await resolveClassSectionTermIdFromRepo(
    { classSectionsId: Number(sectionId), term },
    options,
  );
  if (!classSectionTermId) {
    return [];
  }

  if (!anchorRoutine.classSectionTermId && anchorRoutine.timeTableRoutineId) {
    await timeTableCreateRepository.updateRoutineClassSectionTermId(
      anchorRoutine.timeTableRoutineId,
      classSectionTermId,
      options,
    );
    anchorRoutine.classSectionTermId = classSectionTermId;
  }

  return [classSectionTermId];
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
        timeTableNameId: anchorRoutine.timeTableNameId,
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

// export async function addtimeTableCreate(data, createdBy, updatedBy) {
//     const transaction = await sequelize.transaction();

//     try {
//         data.createdBy = createdBy;
//         data.updatedBy = updatedBy;

//        const result =  await timeTableCreateRepository.addTimeTableCreate(data, transaction);
// await timeTableCreateRepository.changeTimeTableCreate(timetableCreateId,{data:previous})
//         await transaction.commit();
//         return result
//     } catch (error) {
//         await transaction.rollback();
//         throw error;
//     }
// };

export async function addtimeTableCreate(data, createdBy, updatedBy) {
  const transaction = await sequelize.transaction();

  try {
    data.createdBy = createdBy;
    data.updatedBy = updatedBy;

    if (data.classSectionsId == null && data.classSectionId != null) {
      data.classSectionsId = data.classSectionId;
    }

    const placement = await resolveRoutinePlacement(data, { transaction });

    if (!placement.courseId && placement.classSectionsId) {
      const section = await timeTableCreateRepository.getClassSectionWithCourseRepository(
        placement.classSectionsId,
      );
      if (section?.courseId) {
        placement.courseId = section.courseId;
      }
    }

    if (
      (placement.classSectionTermId || placement.classSectionsId)
      && placement.startingDate
      && placement.endingDate
    ) {
      const overlap = await timeTableCreateRepository.checkRoutineOverlapRepository({
        classSectionTermId: placement.classSectionTermId,
        classSectionsId: placement.classSectionsId,
        startingDate: placement.startingDate,
        endingDate: placement.endingDate,
        excludeRoutineId: placement.timeTableRoutineId,
      });

      if (overlap) {
        throw new Error(`A routine already exists for this class section term that overlaps with the selected date range (${placement.startingDate} to ${placement.endingDate})`);
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
    if (transaction) await transaction.rollback();
    throw error;
  }
}

export async function gettimeTableCreateDetails() {
    try {
    const result = await timeTableCreateRepository.getTimeTableCreateDetails();
    return result;
  } catch (error) {
    console.error("Error in gettimeTableCreateDetails:", error.message);
    throw new Error(error.message);
  }
}

export async function getSingletimeTableCreateDetails(courseId) {
    try {
    const result = await timeTableCreateRepository.getSingleTimeTableCreateDetails(courseId);

    return result;
  } catch (error) {
    console.error("Error in getSingletimeTableCreateDetails:", error.message);
    throw new Error(error.message);
  }
}

export async function getTimeTableByCourseAndSection(courseId, classSectionsId, timeTableType, classSectionTermId) {
  try {
    const data = await timeTableCreateRepository.getTimeTableByCourseAndSection(
      courseId,
      classSectionsId,
      timeTableType,
      classSectionTermId,
    );

    if (!Array.isArray(data) || !data.length) return [];

    return data.map((item) => {
      const periods =
        item?.timeTableCreateName?.timeTableName?.map((period) => ({
          startTime: period.startTime,
          endTime: period.endTime,
          timeTableCreationId: period.timeTableCreationId,
          type: period.type,
          periodGap: period.periodGap,
          periodLength: period.periodLength,
          weekOff: period.weekOff,
          isBreak: period.isBreak,
          periodName: period.periodName,
          classSectionsId: item.classSectionsId,
          classSectionTermId: item.classSectionTermId,
        })) || [];

      return {
        timeTableRoutineId: item.timeTableRoutineId,
        timeTableType: item.timeTableType,
        name: item?.timeTableCreateName?.name,
        isPublish: item.isPublish,
        timeTableNameId: item?.timeTableCreateName?.timeTableNameId,
        maximumPeriod: item?.timeTableCreateName?.timeTableName?.[0]?.maximumPeriod,
        isCourse: item?.timeTableCreateName?.timeTableName?.[0]?.isCourse,
        courseId: item.courseId,
        classSectionsId: item.classSectionsId,
        classSectionTermId: item.classSectionTermId,
        classSectionsName: item?.timeTableClassSection?.section,
        courseName: item?.timeTableCourse?.courseName,
        startingDate: item.startingDate,
        endingDate: item.endingDate,
        timeTableClassSection: item?.timeTableClassSection,
        periods,
      };
    });
  } catch (error) {
    console.error("Service error:", error);
    throw error;
  }
}

export async function updateTimeTableCreate(TimeTableCreateId, info, updatedBy) {
  try {
    info.updatedBy = updatedBy;
    const data = await timeTableCreateRepository.updateTimeTableCreate(TimeTableCreateId, info);
    return data;
  } catch (error) {
    console.error("Error updating faculity load:", error);
    throw new Error("Failed to update time table");
  }
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
    const {
      timeTableRoutineId,
      day,
      classRoomSectionId,
      employeeId,
      combinedGroupId: existingCombinedGroupId,
    } = data;

    if (!timeTableRoutineId) {
      throw new Error('timeTableRoutineId is required');
    }

    const anchorRoutine = await timeTableCreateRepository.getRoutineByIdRepository(
      timeTableRoutineId,
      { transaction },
    );
    if (!anchorRoutine) {
      throw new Error('Invalid timeTableRoutineId');
    }

    const { startingDate, endingDate } = anchorRoutine;
    const slots = normalizeMappingSlots(data);
    const classSectionTermIds = await resolveClassSectionTermIdsForMapping(
      data,
      anchorRoutine,
      { transaction },
    );
    if (!classSectionTermIds.length) {
      throw new Error(
        'classSectionTermIds could not be resolved from routine. Send classSectionTermId(s), or ensure the routine has classSectionTermId / classSectionsId and the subject or payload includes program term.',
      );
    }

    const isCombined = classSectionTermIds.length > 1;
    const combinedGroupId = isCombined
      ? (existingCombinedGroupId || randomUUID())
      : null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sDate = new Date(startingDate);
    sDate.setHours(0, 0, 0, 0);

    if (today > sDate) {
      throw new Error('Cannot add or update mapping for a routine after its starting date.');
    }

    const routineTargets = await resolveCombinedRoutineTargets(
      anchorRoutine,
      classSectionTermIds,
      transaction,
    );

    const conflictOptions = {
      allowedClassSectionTermIds: classSectionTermIds,
      excludeCombinedGroupId: existingCombinedGroupId || null,
    };

    let totalPeriodLength = 0;
    const createdMappings = [];

    for (const slot of slots) {
      const periodInfo = await timeTableCreateRepository.getPeriodInfoRepository(slot.timeTableCreationId);
      if (!periodInfo) {
        throw new Error(`Invalid timeTableCreationId: ${slot.timeTableCreationId}`);
      }

      const { startTime, endTime } = periodInfo;
      const periodLength = toMoneyNumber(periodInfo.timeTableName?.periodLength ?? 0);
      totalPeriodLength = decimalAdd(totalPeriodLength, periodLength);

      if (employeeId) {
        const conflict = await timeTableCreateRepository.checkTeacherConflictRepository(
          employeeId,
          day,
          startTime,
          endTime,
          startingDate,
          endingDate,
          conflictOptions,
        );
        if (conflict) {
          const conflictSection = conflict.timeTablecreate?.timeTableClassSection?.section || '';
          const conflictClass = conflict.timeTablecreate?.timeTableClassSection?.year || '';
          throw new Error(
            `Teacher Conflict: Teacher already has class on ${day} at ${startTime}-${endTime} in ${conflictClass} - ${conflictSection}`,
          );
        }
      }

      if (classRoomSectionId) {
        const roomConflict = await timeTableCreateRepository.checkRoomConflictRepository(
          classRoomSectionId,
          day,
          startTime,
          endTime,
          startingDate,
          endingDate,
          conflictOptions,
        );
        if (roomConflict) {
          const conflictSection = roomConflict.timeTablecreate?.timeTableClassSection?.section || '';
          const conflictClass = roomConflict.timeTablecreate?.timeTableClassSection?.year || '';
          throw new Error(
            `Room Conflict: Classroom is already occupied on ${day} at ${startTime}-${endTime} by ${conflictClass} - ${conflictSection}`,
          );
        }
      }

      for (const target of routineTargets) {
        const rowData = {
          ...data,
          timeTableRoutineId: target.timeTableRoutineId,
          timeTableCreationId: slot.timeTableCreationId,
          period: slot.period,
          combinedGroupId,
          createdBy,
          updatedBy,
        };

        delete rowData.classSectionTermIds;
        delete rowData.slots;
        delete rowData.timeTableCreationIds;

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
        });
      }
    }

    if (employeeId && totalPeriodLength > 0) {
      const facultyLoad = await getSingleFaculityLoadDetails(employeeId);
      const existingLoad = toMoneyNumber(facultyLoad?.[0]?.currentLoad);
      const currentLoad = decimalAdd(existingLoad, totalPeriodLength);
      await updateFaculityLoadByEmployeeId(employeeId, { currentLoad }, transaction);
    }

    await transaction.commit();

    if (isCombined || slots.length > 1) {
      return {
        isCombined,
        combinedGroupId,
        classSectionTermIds,
        mappings: createdMappings,
      };
    }

    return createdMappings[0];
  } catch (error) {
    await transaction.rollback();
    console.error('Error in addtimeTableMapping:', error);
    throw new Error(error.message);
  }
}

export async function cloneTimeTableRoutine(previousRoutineId, startingDate, endingDate, createdBy, updatedBy) {
  const transaction = await sequelize.transaction();

  try {
    const previousRoutine = await timeTableCreateRepository.getFullRoutineDetailsRepository(previousRoutineId);

    if (!previousRoutine) {
      throw new Error(`Routine with ID ${previousRoutineId} not found`);
    }

    const formatDate = (date) => {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const start = formatDate(startingDate);
    const end = formatDate(endingDate);

    // Check for routine overlap for the same class section
    const overlap = await timeTableCreateRepository.checkRoutineOverlapRepository({
      classSectionTermId: previousRoutine.classSectionTermId,
      classSectionsId: previousRoutine.classSectionsId,
      startingDate: start,
      endingDate: end,
    });

    if (overlap) {
      throw new Error(`A routine already exists for this class section that overlaps with the selected date range (${start} to ${end})`);
    }

    // Create new routine data from previous one
    const newRoutineData = {
      ...previousRoutine.get({ plain: true }),
      startingDate: start,
      endingDate: end,
      createdBy,
      updatedBy
    };

    // Remove primary key and metadata
    delete newRoutineData.timeTableRoutineId;
    delete newRoutineData.createdAt;
    delete newRoutineData.updatedAt;
    delete newRoutineData.deletedAt;

    const newRoutine = await timeTableCreateRepository.addTimeTableCreate(newRoutineData, transaction);
    const newRoutineId = newRoutine.timeTableRoutineId;

    // Copy mappings
    const previousMappings = previousRoutine.timeTablecreate || [];
    if (previousMappings.length > 0) {
      const newMappings = previousMappings.map(mapping => {
        const m = { ...mapping.get({ plain: true }) };
        delete m.timeTableMappingId;
        delete m.createdAt;
        delete m.updatedAt;
        delete m.deletedAt;
        m.timeTableRoutineId = newRoutineId;
        m.createdBy = createdBy;
        m.updatedBy = updatedBy;
        return m;
      });

      await timeTableCreateRepository.bulkCreateMappings(newMappings, transaction);
    }

    await transaction.commit();
    return newRoutine;

  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("Error in cloneTimeTableRoutine:", error);
    throw error;
  }
}

export async function changeTimeTableCreate(body, updatedBy) {
  try {
    const { timeTableRoutineId, ...updateData } = body;
    const placement = await resolveRoutinePlacement(updateData);

    if (placement.startingDate || placement.endingDate || placement.classSectionTermId || placement.classSectionsId) {
      const current = await timeTableCreateRepository.getRoutineByIdRepository(timeTableRoutineId);
      const classSectionTermId = placement.classSectionTermId || current.classSectionTermId;
      const classSectionsId = placement.classSectionsId || current.classSectionsId;
      const start = placement.startingDate || current.startingDate;
      const end = placement.endingDate || current.endingDate;

      const overlap = await timeTableCreateRepository.checkRoutineOverlapRepository({
        classSectionTermId,
        classSectionsId,
        startingDate: start,
        endingDate: end,
        excludeRoutineId: timeTableRoutineId,
      });

      if (overlap) {
        throw new Error(`A routine already exists for this class section term that overlaps with the selected date range (${start} to ${end})`);
      }
    }

    const data = {
      ...placement,
      updatedBy,
    };

    const result = await timeTableCreateRepository.changeTimeTableCreate(timeTableRoutineId, data);

    return result;
  } catch (error) {
    throw error;
  }
}

export async function updatetimeTableCreate(timeTableMappingId, timeTableType, updatedBy) {
  try {
    const data = { timeTableType, updatedBy };
    const result = await timeTableCreateRepository.updatetimeTableCreate(timeTableMappingId, data);
    return result;
  } catch (error) {
    throw error;
  }
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

    // Check room conflict once for the entire batch as they share the same slot
    if (baseRow.classRoomSectionId) {
      const roomConflict = await timeTableCreateRepository.checkRoomConflictRepository(
        baseRow.classRoomSectionId,
        baseRow.day,
        startTime,
        endTime,
        startingDate,
        endingDate,
      );

      if (roomConflict) {
        const conflictSection = roomConflict.timeTablecreate?.timeTableClassSection?.section || "";
        const conflictClass = roomConflict.timeTablecreate?.timeTableClassSection?.year || "";
        throw new Error(
          `Room Conflict: Classroom is already occupied on ${baseRow.day} at ${startTime}-${endTime} by ${conflictClass} - ${conflictSection}`
        );
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
          const conflictSection = conflict.timeTablecreate?.timeTableClassSection?.section || "";
          const conflictClass = conflict.timeTablecreate?.timeTableClassSection?.year || "";
          throw new Error(
            `Teacher Conflict: Teacher already has class on ${baseRow.day} at ${startTime}-${endTime} in ${conflictClass} - ${conflictSection}`
          );
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
          timeTableNameId: baseRow.timeTableNameId,
          timeTableRoutineId: baseRow.timeTableRoutineId,
          timeTableCreationId: baseRow.timeTableCreationId,
          subjectId: item.subjectId,
          electiveSubjectId: item.electiveSubjectId,
          // teacherSubjectMappingId: '',
          classRoomSectionId: baseRow.classRoomSectionId,
          day: baseRow.day,
          period: baseRow.period,
          isSameTeacher: false,
          timeTableType: baseRow.timeTableType,
          employeeId: item.employeeId,
          teacherType: item.teacherType,
          isAttendence: item.isAttendence,
          isOverridingSyblingElectives: item.isOverridingSyblingElectives,
          createdBy,
          updatedBy,
        };

        await timeTableCreateRepository.addtimeTableMapping(newRow, transaction);
      }
    }

    await transaction.commit();
    return { success: true, message: "Teacher mapping updated successfully" };
  } catch (err) {
    await transaction.rollback();
    console.error("Error in updateSimpleTeacherMapping:", err);
    throw err;
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

    const classSectionsId = timeTableCreate?.classSectionsId;
    const startingDateStr = timeTableCreate?.startingDate;
    const endingDateStr = timeTableCreate?.endingDate;

    if (!classSectionsId || !startingDateStr || !endingDateStr) {
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
    const timeTableNameList = timeTableCreate?.timeTableCreateName?.timeTableName || [];

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
    const classSection = item.timeTableClassSection || {};

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
//     const classSection = item.timeTableClassSection || {};

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

export async function getTimeTableCellData(courseId, classSectionsId) {
  const allData = await timeTableCreateRepository.getTimeTableCellData(
    courseId,
    classSectionsId,
  );

  // STEP 1: Filter by classSectionsId (NOW multiple timetables possible)
  const filteredBySection = allData.filter((item) =>
    item.dataValues.timeTableType === "normal" ? item.classSectionsId === Number(classSectionsId) : true,
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
      const classSection = item.timeTableClassSection || {};

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

        const classSection = sourceItem?.timeTableClassSection || baseMetadata.classSection || {};

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
  try {
    const result = await timeTableCreateRepository.publishTimeTableRepository(timeTableRoutineId);

    if (result[0] === 0) {
      throw new Error("Time table create ID not found");
    }

    return { message: "Time table published successfully" };
  } catch (error) {
    console.error("Error in publishTimeTableService:", error);
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

export async function getSubjectWithCount(classSectionsId) {
  const [subjectsData, timeTableData] = await Promise.all([
    timeTableCreateRepository.ClassSubjectCount(classSectionsId),
    timeTableCreateRepository.timeTableData(classSectionsId),
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

  return finalResult.map(({ routine, countMap }) => ({
    timeTableNameId: routine.timeTableCreateName?.timeTableNameId,
    timeTableName: routine.timeTableCreateName?.name,
    subjects: subjectsList.map((subject) => ({
      subjectId: subject.subjectId,
      subject: subject.subject,
      subjectCode: subject.subjectCode,
      count: countMap[subject.subjectId] || 0,
    })),
  }));
}

export async function getRoutineByClassSectionId({ classSectionTermId, classSectionsId, term }) {
  try {
    const scope = routineScopeWhere({ classSectionTermId, classSectionsId });
    if (!Object.keys(scope).length && classSectionsId != null && term != null) {
      const resolved = await resolveClassSectionTermIdFromRepo({
        classSectionsId,
        term: Number(term),
      });
      if (resolved) {
        scope.classSectionTermId = resolved;
      } else {
        scope.classSectionsId = Number(classSectionsId);
      }
    }

    const [normalRoutines, classSection] = await Promise.all([
      timeTableCreateRepository.getNormalRoutinesBySectionScopeRepository(scope),
      (async () => {
        if (classSectionsId) {
          return timeTableCreateRepository.getClassSectionWithCourseRepository(classSectionsId);
        }
        if (scope.classSectionTermId || classSectionTermId) {
          const termRow = await findClassSectionTermById(scope.classSectionTermId ?? classSectionTermId);
          if (!termRow) return null;
          const plain = termRow.get ? termRow.get({ plain: true }) : termRow;
          return plain.classSection ?? null;
        }
        return null;
      })(),
    ]);

    if (!normalRoutines || !normalRoutines.length) return { routines: [], classSection };

    const timeTableNameIds = normalRoutines.map(r => r.timeTableNameId);
    const electiveRoutines = await timeTableCreateRepository.getElectiveRoutinesByTableNamesRepository(timeTableNameIds);

    const daysList = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const formattedRoutines = normalRoutines.map(routine => {
      const timeTableCreateName = routine.timeTableCreateName || {};
      const periods = timeTableCreateName.timeTableName || [];
      const normalScheduleItems = routine.timeTablecreate || [];

      const matchingElectives = electiveRoutines.filter(er => er.timeTableNameId === routine.timeTableNameId);
      const electiveScheduleItems = matchingElectives.flatMap(er => er.timeTablecreate || []);

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
            const teacher = item.employeeDetails;
            const subject = item?.timeTableSubject;

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

          const scheduleItems = scheduleItemsMap;

          return {
            name: daysName,
            scheduleItems: scheduleItems
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
        timeTableNameId: routine.timeTableNameId,
        name: timeTableCreateName.name || "N/A",
        startDate: routine.startingDate,
        endDate: routine.endingDate,
        periods: formattedPeriods
      };
    });

    return { routines: formattedRoutines, classSection };
  } catch (error) {
    console.error("Error in getRoutineByClassSectionId Service:", error);
    throw error;
  }
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
  try {
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
      const timeTableCreateName = routine.timeTableCreateName || {};
      const periods = timeTableCreateName.timeTableName || [];
      const normalScheduleItems = routine.timeTablecreate || [];
      const classSection = mapRoutineClassSection(routine.timeTableClassSection);

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
        timeTableNameId: routine.timeTableNameId,
        name: timeTableCreateName.name || "N/A",
        startDate: routine.startingDate,
        endDate: routine.endingDate,
        classSection,
        periods: formattedPeriods
      };
    });

    return { ...common, routines: formattedRoutines };
  } catch (error) {
    console.error("Error in getRoutineByTeacherAndAcademicYear Service:", error);
    throw error;
  }
}
