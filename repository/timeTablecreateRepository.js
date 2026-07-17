import { Op, Sequelize } from 'sequelize';
import * as model from '../models/index.js';
import { buildScope, scoped } from '../utility/scoped.js';
import { ATTENDANCE_PRESENT_STATUSES } from '../constant.js';
import { classSectionTermsInclude, studentClassSectionTermWithSectionInclude, timeTableRoutineClassSectionInclude, stripRoutinePersistPayload, routineStructureInclude } from '../utility/classSectionIncludes.js';

const presentStatusSqlList = ATTENDANCE_PRESENT_STATUSES.map((s) => `'${s}'`).join(', ');

/** DATE-only compare — avoids Sequelize UTC shift on YYYY-MM-DD strings. */
function routineActiveOnDateWhere(currentDate) {
  return {
    is_publish: true,
    [Op.and]: [
      Sequelize.where(Sequelize.fn('DATE', Sequelize.col('starting_date')), { [Op.lte]: currentDate }),
      Sequelize.where(Sequelize.fn('DATE', Sequelize.col('ending_date')), { [Op.gte]: currentDate }),
    ],
  };
}

async function assertScopedRoutine(timeTableRoutineId, options = {}) {
  const { transaction, attributes = ['timeTableRoutineId'] } = options;
  return scoped(model.timeTableRoutineModel).findOne({
    where: { timeTableRoutineId },
    attributes,
    transaction,
  });
}

async function assertScopedSchedule(timeTableMappingId, options = {}) {
  const { transaction, attributes = ['timeTableMappingId', 'timeTableRoutineId'] } = options;
  return model.classScheduleModel.findOne({
    where: { timeTableMappingId },
    attributes,
    transaction,
    include: [{
      model: model.timeTableRoutineModel,
      as: 'timeTablecreate',
      required: true,
      where: buildScope(model.timeTableRoutineModel),
      attributes: ['timeTableRoutineId'],
    }],
  });
}

export async function addTimeTableCreate(data, transaction) {
  const result = await scoped(model.timeTableRoutineModel).create(
    stripRoutinePersistPayload(data),
    { transaction },
  );
  return result;
}

export async function findCourseById(courseId) {
  return scoped(model.courseModel).findOne({
    where: { courseId: Number(courseId) },
    attributes: ['courseId', 'courseName', 'termType', 'courseDuration', 'totalTerms'],
  });
}

export async function findClassSectionTermsWithRoutines({ courseId, sessionId } = {}) {
  const sectionScope = buildScope(model.classSectionModel);
  const sectionWhere = { ...sectionScope };
  if (courseId != null) {
    sectionWhere.courseId = Number(courseId);
  }
  if (sessionId != null) {
    sectionWhere.sessionId = Number(sessionId);
  }

  return model.classSectionTermModel.findAll({
    attributes: ['classSectionTermId', 'term', 'classSectionsId'],
    include: [
      {
        model: model.classSectionModel,
        as: 'classSection',
        where: sectionWhere,
        required: true,
        attributes: [
          'classSectionsId',
          'section',
          'year',
          'courseId',
          'sessionId',
          'academicYearId',
        ],
        include: [
          {
            model: model.sessionModel,
            as: 'classSession',
            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
          },
          {
            model: model.courseModel,
            as: 'courseSection',
            attributes: ['courseId', 'courseName', 'termType', 'courseDuration', 'totalTerms'],
            required: false,
          },
        ],
      },
      {
        model: model.timeTableRoutineModel,
        as: 'timeTableRoutines',
        required: false,
        where: buildScope(model.timeTableRoutineModel),
        attributes: [
          'timeTableRoutineId',
          'startingDate',
          'endingDate',
          'isPublish',
          'classSectionTermId',
        ],
        include: [
          routineStructureInclude({ withPeriods: false }),
        ],
        order: [['startingDate', 'ASC'], ['timeTableRoutineId', 'ASC']],
      },
    ],
    order: [
      [{ model: model.classSectionModel, as: 'classSection' }, 'year', 'ASC'],
      [{ model: model.classSectionModel, as: 'classSection' }, 'section', 'ASC'],
      ['term', 'ASC'],
    ],
  });
}

// export async function getSingleTimeTableCreateDetails(courseId,universityId) {    
//     try {
//         const result = await scoped(model.timeTableRoutineModel).findAll({
//             attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
//             include:[
//                 {
//                     model:model.timeTableStructureModel,
//                     as:"timeTableCreateName",
//                     attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updated"]},
//                     include:[
//                         {
//                             model:model.timeTableStructurePeriodsModel,
//                             as:"timeTableName",
//                             attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updated"]}
//                         }
//                     ]
//                 },
//                 {
//                     model:model.courseModel,
//                     as: 'timeTableCourse',
//                     attributes: ["courseName"],
//                 },
//                 {
//                     model:model.campusModel,
//                     as: 'timeTableCampus',
//                     attributes: ["campusName"],
//                 },
//                 {
//                     model:model.classSectionModel,
//                     as: 'timeTableClassSection',
//                     attributes: ["section","class","section_id","class_sections_id"],
//                 },
//                 {
//                     model:model.acedmicYearModel,
//                     as: 'acedmicYearTimeTable',
//                     attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
//                 },
//             ],
//             where:{
//                 courseId:courseId,
//             }
//         });
//         return result;
//     } catch (error) {
//         console.error(`Error in getting faculity load:`, error);
//         throw error;
//     };
// };

export async function getTimeTableByCourseAndSection(
  courseId,
  classSectionTermId,
  timeTableType,
) {
  const whereClause = {
    ...(courseId && { courseId }),
    ...(classSectionTermId != null && { classSectionTermId: Number(classSectionTermId) }),
    ...(timeTableType && { timeTableType }),
  };
  return await scoped(model.timeTableRoutineModel).findAll({
    where: whereClause,
    include: [
      routineStructureInclude(),
      {
        model: model.courseModel,
        as: "timeTableCourse",
        attributes: ["courseName"]
      },
      timeTableRoutineClassSectionInclude(),
    ],
    order: [
      [
        { model: model.timeTableStructureCourseModel, as: "structureCourseMapping" },
        { model: model.timeTableStructureModel, as: "timeTableStructure" },
        { model: model.timeTableStructurePeriodsModel, as: "timeTableName" },
        "timeTableCreationId",
        "ASC"
      ]
    ]
  });
}


export async function getSingleTimeTableCreateDetails(courseId) {
  const result = await scoped(model.timeTableRoutineModel).findAll({
    attributes: { exclude: ["createdAt", "updatedAt"] },
    include: [
      routineStructureInclude(),
      {
        model: model.courseModel,
        as: 'timeTableCourse',
        attributes: ["courseName"],
      },
      {
        model: model.campusModel,
        as: 'timeTableCampus',
        attributes: ["campusName"],
      },
      timeTableRoutineClassSectionInclude({
        sectionAttributes: ["section", "year", "classSectionsId"],
      }),
      {
        model: model.acedmicYearModel,
        as: 'acedmicYearTimeTable',
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
      },
    ],
    where: {
      courseId: courseId,
    }
  });
  return result;
};

export async function updateTimeTableCreate(faculityLoadId, info) {
  const result = await scoped(model.timeTableRoutineModel).update(info, {
    where: {
      faculityLoadId: faculityLoadId
    }
  });
  return result;
};

export async function deleteSchedulesByRoutineIdRepository(timeTableRoutineId, options = {}) {
  const { transaction } = options;
  return model.classScheduleModel.destroy({
    where: { timeTableRoutineId: Number(timeTableRoutineId) },
    individualHooks: true,
    transaction,
  });
}

export async function deleteTimeTableRoutineRepository(timeTableRoutineId, options = {}) {
  const { transaction } = options;
  return scoped(model.timeTableRoutineModel).destroy({
    where: { timeTableRoutineId: Number(timeTableRoutineId) },
    transaction,
  });
}

export async function deletetimeTableMapping(timeTableMappingId, options = {}) {
  const { transaction, deleteCombinedGroup = false } = options;
  const schedule = await assertScopedSchedule(timeTableMappingId, {
    transaction,
    attributes: ['timeTableMappingId', 'combinedGroupId'],
  });
  if (!schedule) {
    throw new Error('Mapping not found');
  }

  const mappingIds = [timeTableMappingId];
  if (deleteCombinedGroup && schedule.combinedGroupId) {
    const siblings = await getMappingsByCombinedGroupIdRepository(schedule.combinedGroupId, { transaction });
    mappingIds.length = 0;
    siblings.forEach((row) => mappingIds.push(row.timeTableMappingId));
  }

  await model.classScheduleModel.destroy({
    where: { timeTableMappingId: { [Op.in]: mappingIds } },
    individualHooks: true,
    transaction,
  });

  return {
    message: 'time table mapping deleted successfully',
    deletedMappingIds: mappingIds,
  };
};

export async function addtimeTableMapping(data, transaction) {
  const routine = await assertScopedRoutine(data.timeTableRoutineId, { transaction });
  if (!routine) {
    throw new Error('Time table routine not found');
  }
  const result = await model.classScheduleModel.create(data, { transaction });
  return result;
};

export async function getPeriodInfoRepository(timeTableCreationId) {
  if (timeTableCreationId == null || !Number.isFinite(Number(timeTableCreationId))) {
    return null;
  }

  return await model.timeTableStructurePeriodsModel.findOne({
    where: { timeTableCreationId: Number(timeTableCreationId) },
    attributes: ["startTime", "endTime", "timeTableCreationId"],
    include: [
      {
        model: model.timeTableStructureModel,
        as: "timeTableName",
        attributes: ["periodLength"],
        required: false,
      }
    ]
  });
};

// export async function checkTeacherConflictRepository(userId, day, startTime, endTime) {
//   try {
//     return await model.classScheduleModel.findOne({
//       where: {
//         userId,
//         day
//       },
//       include: [
//         {
//           model: model.timeTableStructurePeriodsModel,
//           as: "timeTablecreation",
//           attributes: ["startTime", "endTime"],
//           where: {
//             [Op.or]: [
//               { startTime: { [Op.between]: [startTime, endTime] } },
//               { endTime: { [Op.between]: [startTime, endTime] } },
//               {
//                 [Op.and]: [
//                   { startTime: { [Op.lte]: startTime } },
//                   { endTime: { [Op.gte]: endTime } }
//                 ]
//               }
//             ]
//           }
//         }
//       ]
//     });
//   } catch (error) {
//     console.error("Error in checkTeacherConflictRepository:", error);
//     throw error;
//   }
// };

export async function checkTeacherConflictRepository(
  userId,
  day,
  startTime,
  endTime,
  startingDate,
  endingDate,
  options = {},
  transaction = null,
) {
  const conflict = await model.classScheduleModel.findOne({
    transaction: transaction ?? null,
    where: {
      employeeId,
      day
    },
    include: [
      {
        model: model.timeTableStructurePeriodsModel,
        as: "timeTablecreation",
        attributes: ["startTime", "endTime"],
        where: {
          [Op.and]: [
            { startTime: { [Op.lt]: endTime } },
            { endTime: { [Op.gt]: startTime } }
          ]
        }
      },
      {
        model: model.timeTableRoutineModel,
        as: "timeTablecreate",
        attributes: ["startingDate", "endingDate", "classSectionTermId"],
        required: true,
        where: {
          [Op.and]: [
            { startingDate: { [Op.lte]: endingDate } },
            { endingDate: { [Op.gte]: startingDate } }
          ],
          ...buildScope(model.timeTableRoutineModel),
        },
        include: [
          timeTableRoutineClassSectionInclude({
            sectionAttributes: ["section", "year"],
          }),
        ]
      }
    ]
  });

  if (isAllowedCombinedConflict(conflict, options)) {
    return null;
  }

  return conflict;
};

export async function checkElectiveSubjectConflictRepository(
  electiveSubjectId,
  courseId,
  day,
  startTime,
  endTime,
  startingDate,
  endingDate,
  options = {},
  transaction = null,
) {
  const { excludeRoutineId = null } = options;

  const routineWhere = {
    courseId: Number(courseId),
    timeTableType: 'elective',
    [Op.and]: [
      { startingDate: { [Op.lte]: endingDate } },
      { endingDate: { [Op.gte]: startingDate } },
    ],
    ...buildScope(model.timeTableRoutineModel),
  };

  if (excludeRoutineId != null) {
    routineWhere.timeTableRoutineId = { [Op.ne]: Number(excludeRoutineId) };
  }

  const conflict = await model.classScheduleModel.findOne({
    transaction: transaction ?? null,
    where: {
      electiveSubjectId: Number(electiveSubjectId),
      day,
      timeTableType: 'elective',
    },
    include: [
      {
        model: model.timeTableStructurePeriodsModel,
        as: 'timeTablecreation',
        attributes: ['startTime', 'endTime'],
        required: true,
        where: {
          [Op.and]: [
            { startTime: { [Op.lt]: endTime } },
            { endTime: { [Op.gt]: startTime } },
          ],
        },
      },
      {
        model: model.timeTableRoutineModel,
        as: 'timeTablecreate',
        attributes: ['timeTableRoutineId', 'courseId', 'startingDate', 'endingDate'],
        required: true,
        where: routineWhere,
      },
    ],
  });

  return conflict;
};

export async function getRoutineByIdRepository(timeTableRoutineId, options = {}) {
  return await scoped(model.timeTableRoutineModel).findOne({
    where: { timeTableRoutineId },
    attributes: [
      'timeTableRoutineId',
      'startingDate',
      'endingDate',
      'isPublish',
      'classSectionTermId',
      'timetableStructureCourseMapperId',
      'timeTableType',
      'courseId',
    ],
    transaction: options.transaction,
  });
};

export async function getSubjectProgramTerm(subjectId, options = {}) {
  if (subjectId == null) {
    return null;
  }

  const row = await scoped(model.subjectModel).findOne({
    where: { subjectId: Number(subjectId) },
    attributes: ['term'],
    transaction: options.transaction,
    raw: true,
  });

  return row?.term != null ? Number(row.term) : null;
}

export async function updateRoutineClassSectionTermId(timeTableRoutineId, classSectionTermId, options = {}) {
  return scoped(model.timeTableRoutineModel).update(
    { classSectionTermId: Number(classSectionTermId) },
    {
      where: { timeTableRoutineId: Number(timeTableRoutineId) },
      transaction: options.transaction,
    },
  );
};

export async function findRoutineForCombinedSessionRepository(
  { classSectionTermId, timetableStructureCourseMapperId, timeTableType, startingDate, endingDate },
  options = {},
) {
  return await scoped(model.timeTableRoutineModel).findOne({
    where: {
      classSectionTermId: Number(classSectionTermId),
      timetableStructureCourseMapperId: Number(timetableStructureCourseMapperId),
      timeTableType: timeTableType || 'normal',
      [Op.and]: [
        { startingDate: { [Op.lte]: endingDate } },
        { endingDate: { [Op.gte]: startingDate } },
      ],
    },
    attributes: [
      'timeTableRoutineId',
      'startingDate',
      'endingDate',
      'isPublish',
      'classSectionTermId',
      'timetableStructureCourseMapperId',
      'timeTableType',
    ],
    transaction: options.transaction,
  });
};

export async function getMappingByIdRepository(timeTableMappingId, options = {}) {
  return await model.classScheduleModel.findOne({
    where: { timeTableMappingId },
    attributes: ['timeTableMappingId', 'timeTableRoutineId', 'combinedGroupId', 'employeeId', 'timeTableCreationId'],
    transaction: options.transaction,
  });
};

export async function getMappingCopySourceRepository(timeTableMappingId, options = {}) {
  return assertScopedSchedule(timeTableMappingId, {
    transaction: options.transaction,
    attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
  });
}

export async function getSourceCellMappingsRepository(timeTableMappingId, options = {}) {
  const source = await getMappingCopySourceRepository(timeTableMappingId, options);
  if (!source) {
    return [];
  }

  const src = source.get ? source.get({ plain: true }) : source;
  return await model.classScheduleModel.findAll({
    where: {
      timeTableRoutineId: Number(src.timeTableRoutineId),
      timeTableCreationId: Number(src.timeTableCreationId),
      day: src.day,
      period: Number(src.period),
    },
    attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
    transaction: options.transaction,
    include: [{
      model: model.timeTableRoutineModel,
      as: 'timeTablecreate',
      required: true,
      where: buildScope(model.timeTableRoutineModel),
      attributes: ['timeTableRoutineId'],
    }],
    order: [['timeTableMappingId', 'ASC']],
  });
}

export async function getStructurePeriodsRepository(timeTableNameId, options = {}) {
  return scoped(model.timeTableStructurePeriodsModel).findAll({
    where: { timeTableNameId: Number(timeTableNameId) },
    attributes: ['timeTableCreationId', 'periodName', 'isBreak', 'isCourse', 'startTime', 'endTime'],
    order: [['timeTableCreationId', 'ASC']],
    transaction: options.transaction,
  });
}

export async function getStructureWeekOffRepository(timeTableNameId, options = {}) {
  return scoped(model.timeTableStructureModel).findOne({
    where: { timeTableNameId: Number(timeTableNameId) },
    attributes: ['weekOff'],
    transaction: options.transaction,
  });
}

export async function findMappingAtSlotRepository(
  { timeTableRoutineId, day, period, timeTableCreationId },
  options = {},
) {
  return scoped(model.classScheduleModel).findOne({
    where: {
      timeTableRoutineId: Number(timeTableRoutineId),
      day,
      period: Number(period),
      timeTableCreationId: Number(timeTableCreationId),
    },
    attributes: ['timeTableMappingId'],
    transaction: options.transaction,
  });
}

export async function getMappingsByCombinedGroupIdRepository(combinedGroupId, options = {}) {
  return await model.classScheduleModel.findAll({
    where: { combinedGroupId },
    attributes: ['timeTableMappingId', 'timeTableRoutineId', 'combinedGroupId', 'timeTableCreationId'],
    transaction: options.transaction,
  });
};

function isAllowedCombinedConflict(conflict, options = {}) {
  if (!conflict) return true;

  const {
    allowedClassSectionTermIds = [],
    excludeCombinedGroupId = null,
    excludeRoutineId = null,
  } = options;
  const routine = conflict.timeTablecreate;
  const conflictRoutineId = conflict.timeTableRoutineId
    ?? conflict.dataValues?.timeTableRoutineId
    ?? routine?.timeTableRoutineId
    ?? routine?.dataValues?.timeTableRoutineId;

  if (
    excludeRoutineId != null
    && conflictRoutineId != null
    && Number(conflictRoutineId) === Number(excludeRoutineId)
  ) {
    return true;
  }

  const conflictTermId = routine?.classSectionTermId ?? routine?.dataValues?.classSectionTermId;

  if (
    allowedClassSectionTermIds.length > 0
    && conflictTermId != null
    && allowedClassSectionTermIds.map(Number).includes(Number(conflictTermId))
  ) {
    return true;
  }

  const groupId = conflict.combinedGroupId ?? conflict.dataValues?.combinedGroupId;
  if (excludeCombinedGroupId && groupId === excludeCombinedGroupId) {
    return true;
  }

  return false;
}

export async function checkRoomConflictRepository(
  classRoomSectionId,
  day,
  startTime,
  endTime,
  startingDate,
  endingDate,
  options = {},
  transaction = null,
) {
  const conflict = await model.classScheduleModel.findOne({
    transaction: transaction ?? null,
    where: {
      classRoomSectionId,
      day
    },
    include: [
      {
        model: model.timeTableStructurePeriodsModel,
        as: "timeTablecreation",
        attributes: ["startTime", "endTime"],
        where: {
          [Op.and]: [
            { startTime: { [Op.lt]: endTime } },
            { endTime: { [Op.gt]: startTime } }
          ]
        }
      },
      {
        model: model.timeTableRoutineModel,
        as: "timeTablecreate",
        attributes: ["startingDate", "endingDate", "classSectionTermId"],
        required: true,
        where: {
          [Op.and]: [
            { startingDate: { [Op.lte]: endingDate } },
            { endingDate: { [Op.gte]: startingDate } }
          ],
          ...buildScope(model.timeTableRoutineModel),
        },
        include: [
          timeTableRoutineClassSectionInclude({
            sectionAttributes: ["section", "year"],
          }),
        ]
      }
    ]
  });

  if (isAllowedCombinedConflict(conflict, options)) {
    return null;
  }

  return conflict;
};

export async function getFullRoutineDetailsRepository(timeTableRoutineId) {
  return await scoped(model.timeTableRoutineModel).findOne({
    where: { timeTableRoutineId },
    include: [
      {
        model: model.classScheduleModel,
        as: 'timeTablecreate'
      }
    ]
  });
};

export async function checkRoutineOverlapRepository({
  classSectionTermId,
  startingDate,
  endingDate,
  excludeRoutineId,
}) {
  if (classSectionTermId == null) {
    return null;
  }

  return await scoped(model.timeTableRoutineModel).findOne({
    where: {
      classSectionTermId: Number(classSectionTermId),
      ...(excludeRoutineId && { timeTableRoutineId: { [Op.ne]: excludeRoutineId } }),
      [Op.and]: [
        { startingDate: { [Op.lte]: endingDate } },
        { endingDate: { [Op.gte]: startingDate } },
      ],
    },
  });
}

export async function bulkCreateMappings(mappings, transaction) {
  const routineId = mappings[0]?.timeTableRoutineId;
  if (routineId) {
    const routine = await assertScopedRoutine(routineId, { transaction });
    if (!routine) {
      throw new Error('Time table routine not found');
    }
  }
  return await model.classScheduleModel.bulkCreate(mappings, { transaction });
}

export async function changeTimeTableCreate(timeTableRoutineId, data, transaction) {
  const routine = await assertScopedRoutine(timeTableRoutineId, { transaction });
  if (!routine) {
    return [0];
  }
  const result = await scoped(model.timeTableRoutineModel).update(
    stripRoutinePersistPayload(data),
    {
      where: { timeTableRoutineId },
      transaction,
    },
  );
  return result;
};

export async function updatetimeTableCreate(timeTableMappingId, data) {
  const schedule = await assertScopedSchedule(timeTableMappingId);
  if (!schedule) {
    return [0];
  }
  const result = await model.classScheduleModel.update(data, {
    where: { timeTableMappingId }
  });
  return result;
};

export async function findMappingById(id) {
  const result = await assertScopedSchedule(id, {
    attributes: [
      'timeTableMappingId',
      'timeTableRoutineId',
      'timeTableCreationId',
      'timeTableNameId',
      'employeeId',
      'day',
      'period',
      'classRoomSectionId',
      'timeTableType',
      'subjectId',
      'electiveSubjectId',
      'teacherSubjectMappingId',
      'combinedGroupId',
      'teacherType',
      'isAttendence',
      'isOverridingSyblingElectives',
    ],
  });

  return result;
}

export async function updateMapping(id, data, transaction) {
  const schedule = await assertScopedSchedule(id, { transaction });
  if (!schedule) {
    throw new Error(`Failed to update mapping record for ID ${id}`);
  }
  const result = await model.classScheduleModel.update(data, {
    where: { timeTableMappingId: id },
    transaction
  });

  return result;
};

export async function getTimeTableMappingDetail(timeTableRoutineId) {
  const result = await model.classScheduleModel.findAll({
    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
    where: {
      ...(timeTableRoutineId && { timeTableRoutineId })
    },
    include: [
      {
        model: model.teacherSubjectMappingModel,
        as: 'timeTableTeacherSubject',
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updated", "employee_id", "subject_id"] },
        include: [
          {
            model: model.employeeModel,
            as: 'teacherEmployeeData',
            attributes: ["employeeName", "employeeCode", "pickColor", "employeeId"],
            where: buildScope(model.employeeModel),
            required: false,
          },
          {
            model: model.subjectModel,
            as: 'employeeSubject',
            attributes: ["subjectId", "subjectName", "subjectCode"],
            where: buildScope(model.subjectModel),
            required: false,
          }
        ]
      },
      {
        model: model.timeTableRoutineModel,
        as: 'timeTablecreate',
        required: true,
        attributes: { exclude: ["createdAt", "updatedAt", "createdBy", "updatedBy"] },
        where: buildScope(model.timeTableRoutineModel),
        include: [
          routineStructureInclude(),
          {
            model: model.courseModel,
            as: 'timeTableCourse',
            attributes: ["courseName"],
            where: buildScope(model.courseModel),
            required: false,
          },
          {
            model: model.campusModel,
            as: 'timeTableCampus',
            attributes: ["campusName"],
          },
          timeTableRoutineClassSectionInclude({
            sectionAttributes: ["section", "year", "classSectionsId"],
            sectionWhere: buildScope(model.classSectionModel),
          }),
          {
            model: model.acedmicYearModel,
            as: 'acedmicYearTimeTable',
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
          },
        ],
      },
      {
        model: model.classRoomModel,
        as: 'classRoom',
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] }
      },
      {
        model: model.electiveSubjectModel,
        as: 'timeTableElective',
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] }
      },
      {
        model: model.subjectModel,
        as: 'timeTableSubject',
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] }
      },
      {
        model: model.employeeModel,
        as: 'employeeDetails',
        attributes: ["employeeName", "employeeCode", "pickColor", "employeeId"]
      }
    ]
  });
  return result;
};

export async function getTimeTableCellData(courseId, classSectionTermId) {
  const whereClause = {
    ...(courseId && { courseId }),
    ...(classSectionTermId != null && { classSectionTermId: Number(classSectionTermId) }),
  };

  const result = await scoped(model.timeTableRoutineModel).findAll({
    attributes: {
      exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy", "time_table_name_id", "course_id", "campus_id", "acedmic_year_id"],
    },
    where: whereClause,
    include: [
      {
        model: model.courseModel,
        as: 'timeTableCourse',
        attributes: { exclude: ["createdAt", "updatedAt", "createdBy", "deletedAt", "affiliated_university_id", "institute_id", "acedmic_year_id"] }
      },
      timeTableRoutineClassSectionInclude({
        sectionAttributes: { exclude: ["createdAt", "updatedAt", "createdBy", "deletedAt", "courseId", "semesterId", "classId", "academicYearId", "specializationId", "sessionId"] },
      }),
      {
        model: model.classScheduleModel,
        as: 'timeTablecreate',
        attributes: { exclude: ["createdAt", "updatedAt", "createdBy", "updatedBy", "deletedAt", "teacher_subject_mapping_id", "time_table_routine_id", "time_table_creation_id", "class_room_section_id", "elective_subject_id", "subject_id"] },
        include: [
          {
            model: model.timeTableStructurePeriodsModel,
            as: 'timeTablecreation',
            attributes: { exclude: ["createdAt", "updatedAt", "createdBy", "updatedBy", "deletedAt", "time_table_name_id", "course_id"] }
          },
          {
            model: model.teacherSubjectMappingModel,
            as: 'timeTableTeacherSubject',
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updated", "employee_id", "subject_id"] },
            include: [
              {
                model: model.employeeModel,
                as: 'teacherEmployeeData',
                attributes: ["employeeName", "employeeCode", "pickColor", "employeeId"],
                where: buildScope(model.employeeModel),
                required: false,
              },
              {
                model: model.subjectModel,
                as: 'employeeSubject',
                attributes: ["subjectId", "subjectName", "subjectCode"],
                where: buildScope(model.subjectModel),
                required: false,
              },

            ]
          },
          {
            model: model.classRoomModel,
            as: 'classRoom',
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy", "floor_id"] }
          },
          {
            model: model.electiveSubjectModel,
            as: 'timeTableElective',
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] }
          },
          {
            model: model.subjectModel,
            as: 'timeTableSubject',
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] }
          },
          {
            model: model.employeeModel,
            as: 'employeeDetails',
            attributes: ["employeeName", "employeeCode", "pickColor", "employeeId"]
          }
        ]
      }
    ]
  });
  return result;
};

// export async function getTeacherTimeTable(userId,universityId,instituteId,role) {
//   console.log(`>>>>>>>>userId`,userId);

//   try {

//     const teacherWhere = { userId };

//     const result = await scoped(model.timeTableRoutineModel).findAll({
//       attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
//       where: {
//         is_publish: true
//       },
//       include: [
//         {
//           model: model.courseModel,
//           as: "timeTableCourse"
//         },
//         {
//           model: model.classSectionModel,
//           as: "timeTableClassSection"
//         },
//         {
//           model: model.classScheduleModel,
//           as: "timeTablecreate",
//           attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
//           required: true,   
//           include: [
//             {
//               model: model.timeTableStructurePeriodsModel,
//               as: "timeTablecreation"
//             },


//             //  ELECTIVE SUBJECT FLOW
//             {
//               model: model.teacherSubjectMappingModel,
//               as: "timeTableTeacherSubject",
//               required: false,
//               where: teacherWhere,
//               include: [
//                 {
//                   model: model.employeeModel,
//                   as: "teacherEmployeeData",
//                   attributes: ["userId", "employeeName", "employeeCode", "pickColor"],
//                   where: teacherWhere
//                 },
//                 {
//                   model: model.classSubjectMapperModel,
//                   as: "employeeSubject",
//                   include: [
//                     {
//                       model: model.subjectModel,
//                       as: "subjects"
//                     }
//                   ]
//                 }
//               ]
//             },

//             //  NORMAL SUBJECT FLOW
//             {
//               model: model.employeeModel,
//               as: "user",
//               attributes: ["userId", "employeeName", "employeeCode", "pickColor"],
//               required: false,
//               where: teacherWhere
//             },

//             // SUBJECT DIRECT
//             {
//               model: model.subjectModel,
//               as: "timeTableSubject"
//             },

//             // ELECTIVE DIRECT SUBJECT
//             {
//               model: model.electiveSubjectModel,
//               as: "timeTableElective"
//             }
//           ]
//         }
//       ]
//     });

//     return result;

//   } catch (error) {
//     console.error("Error in getTeacherTimeTable:", error);
//     throw error;
//   }
// };

// import { Op, Sequelize } from "sequelize";

export async function getTeacherTimeTable(employeeId) {
  const result = await scoped(model.timeTableRoutineModel).findAll({
    where: {
      is_publish: true,
      // universityId,
      // instituteId
    },
    include: [
      {
        model: model.courseModel,
        as: "timeTableCourse"
      },
      timeTableRoutineClassSectionInclude(),
      {
        model: model.classScheduleModel,
        as: "timeTablecreate",
        required: true,

        // 🔥 REAL FIX IS HERE
        where: {
          [Op.or]: [
            // NORMAL SUBJECT TEACHER
            { employeeId },

            // ELECTIVE SUBJECT TEACHER (EXISTS)
            Sequelize.literal(`
              EXISTS (
                SELECT 1
                FROM teacher_subject_mapping tsm
                WHERE tsm.teacher_subject_mapping_id = timeTablecreate.teacher_subject_mapping_id
                AND tsm.employee_id = ${employeeId}
              )
            `)
          ]
        },

        include: [
          {
            model: model.timeTableStructurePeriodsModel,
            as: "timeTablecreation"
          },
          {
            model: model.teacherSubjectMappingModel,
            as: "timeTableTeacherSubject",
            include: [
              {
                model: model.employeeModel,
                as: "teacherEmployeeData",
                attributes: [
                  "employeeId",
                  "employeeName",
                  "employeeCode",
                  "pickColor"
                ]
              },
              {
                model: model.subjectModel,
                as: "employeeSubject",
                attributes: ["subjectId", "subjectName", "subjectCode"],
              }
            ]
          },
          {
            model: model.employeeModel,
            as: "employeeDetails",
            attributes: [
              "employeeId",
              "employeeName",
              "employeeCode",
              "pickColor"
            ]
          },
          {
            model: model.subjectModel,
            as: "timeTableSubject"
          },
          {
            model: model.electiveSubjectModel,
            as: "timeTableElective"
          }
        ]
      }
    ]
  });

  return result;
}




export async function getStudentTimeTableRepository(classSectionTermId, subjectIds) {
  const where = {
    is_publish: true,
    classSectionTermId: Number(classSectionTermId),
  };

  return await scoped(model.timeTableRoutineModel).findAll({
    where,
    include: [
      {
        model: model.courseModel,
        as: "timeTableCourse"
      },
      timeTableRoutineClassSectionInclude(),
      {
        model: model.classScheduleModel,
        as: "timeTablecreate",
        required: true,
        where: {
          subject_id: subjectIds,
        },
        include: [
          {
            model: model.timeTableStructurePeriodsModel,
            as: "timeTablecreation"
          },
          {
            model: model.subjectModel,
            as: "timeTableSubject"
          },
          {
            model: model.employeeModel,
            as: "employeeDetails"
          },
          {
            model: model.teacherSubjectMappingModel,
            as: "timeTableTeacherSubject",
            include: [
              {
                model: model.employeeModel,
                as: "teacherEmployeeData"
              },
              {
                model: model.subjectModel,
                as: "employeeSubject",
                attributes: ["subjectId", "subjectName", "subjectCode"],
              }
            ]
          },
          {
            model: model.electiveSubjectModel,
            as: "timeTableElective"
          }
        ]
      }
    ]
  });

};

export async function publishTimeTableRepository(timeTableRoutineId) {
  const routine = await assertScopedRoutine(timeTableRoutineId);
  if (!routine) {
    return [0];
  }
  const result = await scoped(model.timeTableRoutineModel).update(
    { isPublish: true },
    { where: { timeTableRoutineId } }
  );

  return result;
};

export async function ClassSubjectCount(classSectionTermId) {
  const termRow = await scoped(model.classSectionTermModel).findOne({
    where: { classSectionTermId: Number(classSectionTermId) },
    attributes: ['classSectionTermId', 'classSectionsId', 'term'],
  });
  if (!termRow) {
    return null;
  }

  const plainTerm = termRow.get ? termRow.get({ plain: true }) : termRow;
  const classSectionsId = plainTerm.classSectionsId;

  const students = await scoped(model.studentModel).findAll({
    attributes: ['studentId'],
    include: [
      studentClassSectionTermWithSectionInclude({
        classSectionTermId,
        termRequired: true,
      }),
    ],
  });
  if (!students.length) {
    return { classSectionTermId: Number(classSectionTermId), classSectionsId, students: [] };
  }

  const studentIds = students.map((s) => s.studentId);
  const mappings = await model.subjectMapperModel.findAll({
    where: { studentId: { [Op.in]: studentIds } },
    attributes: ['subjectMapperId', 'subjectId', 'studentId'],
  });

  const subjectIds = [...new Set(mappings.map((m) => m.subjectId).filter(Boolean))];
  const subjects = subjectIds.length
    ? await scoped(model.subjectModel).findAll({
      where: { subjectId: { [Op.in]: subjectIds } },
      attributes: ['subjectId', 'subjectName', 'subjectCode'],
    })
    : [];

  const subjectById = new Map(subjects.map((s) => [s.subjectId, s]));

  return {
    classSectionTermId: Number(classSectionTermId),
    classSectionsId,
    students: students.map((student) => ({
      studentId: student.studentId,
      studentSubjectMapper: mappings
        .filter((m) => m.studentId === student.studentId)
        .map((m) => ({
          subjectId: m.subjectId,
          subjects: subjectById.get(m.subjectId) ?? null,
        })),
    })),
  };
};

export async function timeTableData(classSectionTermId) {
  return await scoped(model.timeTableRoutineModel).findAll({
    where: {
      classSectionTermId: Number(classSectionTermId),
      timeTableType: 'normal',
    },
    include: [
      {
        model: model.classScheduleModel,
        as: 'timeTablecreate',
        attributes: [
          'timeTableMappingId',
          'day',
          'period',
          'subjectId',
          'teacherSubjectMappingId',
          'electiveSubjectId',
          'timeTableCreationId',
        ],
        include: [
          {
            model: model.timeTableStructurePeriodsModel,
            as: 'timeTablecreation',
            attributes: ['isBreak'],
          },
          {
            model: model.teacherSubjectMappingModel,
            as: 'timeTableTeacherSubject',
            attributes: ['teacherSubjectMappingId', 'subjectId'],
            include: [
              {
                model: model.subjectModel,
                as: 'employeeSubject',
                attributes: ['subjectId', 'subjectName', 'subjectCode'],
                where: buildScope(model.subjectModel),
                required: false,
              },
            ],
          },
          {
            model: model.subjectModel,
            as: 'timeTableSubject',
            attributes: ['subjectId', 'subjectName', 'subjectCode'],
            where: buildScope(model.subjectModel),
            required: false,
          },
          {
            model: model.electiveSubjectModel,
            as: 'timeTableElective',
            attributes: ['electiveSubjectId', 'electiveSubjectName'],
            required: false,
          },
        ],
      },
      routineStructureInclude({
        withPeriods: false,
        required: true,
        structureWhere: buildScope(model.timeTableStructureModel),
      }),
    ],
  });
};

export async function getSubjectsByIds(subjectIds) {
  if (!subjectIds?.length) {
    return [];
  }

  return scoped(model.subjectModel).findAll({
    where: { subjectId: { [Op.in]: subjectIds } },
    attributes: ['subjectId', 'subjectName', 'subjectCode'],
  });
};

export async function getNormalRoutinesBySectionScopeRepository(scope = {}) {
  const where = {
    timeTableType: 'normal',
    ...(scope.classSectionTermId != null && { classSectionTermId: Number(scope.classSectionTermId) }),
  };

  return await scoped(model.timeTableRoutineModel).findAll({
    where,
    attributes: ['timeTableRoutineId', 'timetableStructureCourseMapperId', 'startingDate', 'endingDate', 'isPublish', 'timeTableType', 'classSectionTermId'],
    include: [
      routineStructureInclude(),
      {
        model: model.classScheduleModel,
        as: 'timeTablecreate',
        include: [
          {
            model: model.employeeModel,
            as: 'employeeDetails',
            attributes: ['employeeId', 'employeeName', "pickColor"]
          },
          {
            model: model.subjectModel,
            as: 'timeTableSubject',
            attributes: ['subjectId', 'subjectName']
          },
          {
            model: model.classRoomModel,
            as: 'classRoom',
            attributes: ['classRoomSectionId', 'roomNumber']
          },
        ]
      }
    ]
  });
}

/** @deprecated Use getNormalRoutinesBySectionScopeRepository */
export async function getNormalRoutinesBySectionIdRepository(classSectionsId) {
  return getNormalRoutinesBySectionScopeRepository({ classSectionsId });
}

export async function getElectiveRoutinesByTableNamesRepository(timeTableNameIds, employeeId) {
  return await scoped(model.timeTableRoutineModel).findAll({
    where: {
      timeTableType: 'elective',
    },
    attributes: ['timeTableRoutineId', 'timetableStructureCourseMapperId', 'timeTableType'],
    include: [
      {
        model: model.timeTableStructureCourseModel,
        as: 'structureCourseMapping',
        required: true,
        attributes: ['timetableStructureCourseMapperId', 'timeTableNameId'],
        where: {
          timeTableNameId: { [Op.in]: timeTableNameIds },
        },
      },
      {
        model: model.classScheduleModel,
        where: employeeId ? { employeeId } : {},
        as: 'timeTablecreate',
        include: [
          {
            model: model.employeeModel,
            as: 'employeeDetails',
            attributes: ['employeeId', 'employeeName', "pickColor"]
          },
          {
            model: model.electiveSubjectModel,
            as: 'timeTableElective',
            attributes: ['electiveSubjectId', 'electiveSubjectName']
          },
          {
            model: model.classRoomModel,
            as: 'classRoom',
            attributes: ['classRoomSectionId', 'roomNumber']
          },
        ]
      }
    ]
  });
}

export async function getElectiveRoutinesByCourseIdRepository(courseId) {
  return await scoped(model.timeTableRoutineModel).findAll({
    where: {
      courseId: Number(courseId),
      timeTableType: 'elective',
    },
    attributes: [
      'timeTableRoutineId',
      'timetableStructureCourseMapperId',
      'startingDate',
      'endingDate',
      'isPublish',
      'timeTableType',
      'courseId',
    ],
    include: [
      routineStructureInclude(),
      {
        model: model.classScheduleModel,
        as: 'timeTablecreate',
        include: [
          {
            model: model.employeeModel,
            as: 'employeeDetails',
            attributes: ['employeeId', 'employeeName', 'pickColor'],
          },
          {
            model: model.electiveSubjectModel,
            as: 'timeTableElective',
            attributes: ['electiveSubjectId', 'electiveSubjectName'],
          },
          {
            model: model.classRoomModel,
            as: 'classRoom',
            attributes: ['classRoomSectionId', 'roomNumber'],
          },
        ],
      },
    ],
    order: [
      [
        { model: model.timeTableStructureCourseModel, as: 'structureCourseMapping' },
        'timeTableNameId',
        'ASC',
      ],
      ['timeTableRoutineId', 'ASC'],
    ],
  });
}

const teacherRoutineStructureInclude = routineStructureInclude({
  required: true,
  structureWhere: buildScope(model.timeTableStructureModel),
});

const teacherClassSectionInclude = (courseId, sessionId) =>
  timeTableRoutineClassSectionInclude({
    termRequired: true,
    sectionRequired: true,
    sectionWhere: {
      courseId,
      sessionId,
      ...buildScope(model.classSectionModel),
    },
    sectionAttributes: ['classSectionsId', 'section', 'year', 'sessionId', 'courseId'],
    sectionNestedIncludes: [
      {
        model: model.courseModel,
        as: 'courseSection',
        attributes: ['courseId', 'courseName', 'courseCode'],
        where: buildScope(model.courseModel),
        required: false,
      },
      classSectionTermsInclude(),
    ],
  });

const teacherNormalScheduleInclude = (userId, subjectId) => {
  const scheduleWhere = { userId: Number(userId) };
  if (subjectId != null) {
    scheduleWhere.subjectId = Number(subjectId);
  }

  return {
    model: model.classScheduleModel,
    as: 'timeTablecreate',
    required: true,
    where: scheduleWhere,
    include: [
      {
        model: model.employeeModel, as: "employeeDetails",
        attributes: ['userId', 'employeeName', 'pickColor'],
        where: buildScope(model.employeeModel),
        required: false,
      },
      {
        model: model.subjectModel,
        as: 'timeTableSubject',
        attributes: ['subjectId', 'subjectName'],
        where: buildScope(model.subjectModel),
        required: false,
      },
      {
        model: model.classRoomModel,
        as: 'classRoom',
        attributes: ['classRoomSectionId', 'roomNumber'],
      },
      {
        model: model.teacherSubjectMappingModel,
        as: 'timeTableTeacherSubject',
        include: [
          {
            model: model.employeeModel,
            as: 'teacherEmployeeData',
            attributes: ['userId', 'employeeName', 'pickColor'],
            where: buildScope(model.employeeModel),
            required: false,
          },
          {
            model: model.subjectModel,
            as: 'employeeSubject',
            attributes: ['subjectId', 'subjectName'],
            where: buildScope(model.subjectModel),
            required: false,
          },
        ],
      },
    ],
  };
};

const teacherElectiveScheduleInclude = (userId) => ({
  model: model.classScheduleModel,
  as: 'timeTablecreate',
  required: true,
  where: { userId },
  include: [
    {
      model: model.employeeModel, as: "employeeDetails",
      attributes: ['userId', 'employeeName', 'pickColor'],
      where: buildScope(model.employeeModel),
      required: false,
    },
    {
      model: model.electiveSubjectModel,
      as: 'timeTableElective',
      attributes: ['electiveSubjectId', 'electiveSubjectName'],
    },
    {
      model: model.classRoomModel,
      as: 'classRoom',
      attributes: ['classRoomSectionId', 'roomNumber'],
    },
  ],
});

async function fetchTeacherRoutineContext(userId, courseId, sessionId) {
  return Promise.all([
    scoped(model.employeeModel).findOne({
      where: { userId },
      attributes: ['userId', 'employeeName', 'employeeCode', 'pickColor'],
    }),
    scoped(model.courseModel).findOne({
      where: { courseId },
      attributes: ['courseId', 'courseName', 'courseCode'],
    }),
    scoped(model.sessionModel).findOne({
      where: { sessionId },
      attributes: ['sessionId', 'sessionName', 'startingDate', 'endingDate', 'academicYearId'],
    }),
    scoped(model.classSectionModel).findAll({
      where: { courseId, sessionId },
      attributes: ['classSectionsId', 'section', 'year', 'courseId', 'sessionId'],
      include: [
        classSectionTermsInclude(),
      ],
      order: [['year', 'ASC'], ['section', 'ASC']],
    }),
  ]);
}

async function fetchNormalRoutinesForTeacher(userId, courseId, sessionId, subjectId) {
  return scoped(model.timeTableRoutineModel).findAll({
    where: {
      courseId,
      timeTableType: 'normal',
    },
    attributes: [
      'timeTableRoutineId',
      'timetableStructureCourseMapperId',
      'startingDate',
      'endingDate',
      'isPublish',
      'timeTableType',
      'classSectionTermId',
      'courseId',
    ],
    include: [
      teacherRoutineStructureInclude,
      teacherNormalScheduleInclude(userId, subjectId),
      teacherClassSectionInclude(courseId, sessionId),
    ],
    order: [['timeTableRoutineId', 'ASC']],
  });
}

async function fetchElectiveScheduleItemsForTeacher(
  userId,
  courseId,
  sessionId,
  timeTableNameIds,
) {
  if (!timeTableNameIds.length) {
    return new Map();
  }

  const electiveRoutines = await scoped(model.timeTableRoutineModel).findAll({
    where: {
      courseId,
      timeTableType: 'elective',
    },
    attributes: ['timeTableRoutineId', 'timetableStructureCourseMapperId'],
    include: [
      {
        model: model.timeTableStructureCourseModel,
        as: 'structureCourseMapping',
        required: true,
        attributes: ['timetableStructureCourseMapperId', 'timeTableNameId'],
        where: {
          timeTableNameId: { [Op.in]: timeTableNameIds },
        },
      },
      teacherElectiveScheduleInclude(employeeId),
      teacherClassSectionInclude(courseId, sessionId),
    ],
  });

  const electiveItemsByTableNameId = new Map();
  for (const electiveRoutine of electiveRoutines) {
    const mapping = electiveRoutine.structureCourseMapping;
    const items = electiveRoutine.timeTablecreate || [];
    if (!mapping || mapping.timeTableNameId == null || !items.length) {
      continue;
    }
    const tableNameId = mapping.timeTableNameId;
    const existing = electiveItemsByTableNameId.get(tableNameId) || [];
    electiveItemsByTableNameId.set(
      tableNameId,
      existing.concat(items),
    );
  }

  return electiveItemsByTableNameId;
}

export async function getTeacherRoutineBundle(employeeId, courseId, sessionId, subjectId) {
  const [[employee, course, session, classSections], normalRoutines] = await Promise.all([
    fetchTeacherRoutineContext(employeeId, courseId, sessionId),
    fetchNormalRoutinesForTeacher(employeeId, courseId, sessionId, subjectId),
  ]);

  const timeTableNameIds = [];
  const safeNormalRoutines = [];
  for (const routine of normalRoutines) {
    const mapping = routine.structureCourseMapping;
    if (!mapping || mapping.timeTableNameId == null || !mapping.timeTableStructure) {
      continue;
    }
    timeTableNameIds.push(mapping.timeTableNameId);
    safeNormalRoutines.push(routine);
  }

  const electiveItemsByTableNameId = await fetchElectiveScheduleItemsForTeacher(
    employeeId,
    courseId,
    sessionId,
    timeTableNameIds,
  );

  const routines = [];
  for (const routine of safeNormalRoutines) {
    const tableNameId = routine.structureCourseMapping.timeTableNameId;
    routines.push({
      routine,
      electiveScheduleItems: electiveItemsByTableNameId.get(tableNameId) || [],
    });
  }

  return {
    employee,
    course,
    session,
    classSections,
    routines,
  };
}

export async function getClassSectionWithCourseRepository(classSectionsId) {
  return await scoped(model.classSectionModel).findOne({
    where: { classSectionsId: classSectionsId },
    attributes: ['classSectionsId', 'section', 'courseId', 'sessionId'],
    include: [
      {
        model: model.courseModel,
        as: 'courseSection',
        attributes: ['courseId', 'courseName', 'courseCode']
      },
      classSectionTermsInclude(),

    ]
  });
}


export async function getTodayClassScheduleForEmployee(employeeId, currentDate, sessionId) {
  const result = await model.classScheduleModel.findAll({
    raw: true,
    nest: true,
    where: {
      employeeId: Number(employeeId),
    },
    attributes: [
      'timeTableMappingId',
      'timeTableType',
      'day',
      'period',
      'isAttendence',
      'isSameTeacher',
      'timeTableNameId',
      'timeTableCreationId'
    ],
    include: [
      {
        model: model.timeTableRoutineModel,
        as: "timeTablecreate",
        required: true,
        attributes: ['timeTableRoutineId', 'startingDate', 'endingDate'],
        where: {
          ...routineActiveOnDateWhere(currentDate),
          ...buildScope(model.timeTableRoutineModel),
        },
        include: [
          {
            model: model.courseModel,
            as: "timeTableCourse",
            attributes: ['courseId', 'courseName'],
          },
          timeTableRoutineClassSectionInclude({
            sectionRequired: Boolean(sessionId),
            sectionWhere: {
              ...(sessionId && { sessionId }),
            },
            termAttributes: ['classSectionTermId', 'term', 'classSectionsId'],
            sectionAttributes: ['year', 'section', 'classSectionsId'],
          }),
        ],
      },
      {
        model: model.timeTableStructurePeriodsModel,
        as: "timeTablecreation",
        required: true,
        attributes: ['timeTableCreationId', 'periodName', 'startTime', 'endTime'],
      },
      {
        model: model.teacherSubjectMappingModel,
        as: "timeTableTeacherSubject",
        attributes: ['teacherSubjectMappingId'],
        include: [
          {
            model: model.subjectModel,
            as: "employeeSubject",
            attributes: ['subjectId', 'subjectName'],
          },
        ],
      },
      {
        model: model.subjectModel,
        as: "timeTableSubject",
        attributes: ['subjectId', 'subjectName'],
      },
      {
        model: model.electiveSubjectModel,
        as: "timeTableElective",
        attributes: ['electiveSubjectId', 'electiveSubjectName'],
      },
      {
        model: model.classRoomModel,
        as: "classRoom",
        attributes: ['roomNumber'],
      },
    ],
  });
  return result;
}

/**
 * Loads published routine mappings for a teacher where routine.startingDate < currentDate.
 * Used by GET /employee/pastSchedule; service layer expands each mapping into past dates.
 */
export async function getPastClassSchedulesForEmployee(
  userId,
  academicYearId,
  currentDate,
  sessionId
) {
  return await model.classScheduleModel.findAll({
    raw: true,
    nest: true,
    where: {
      userId: Number(userId),
    },
    attributes: [
      'timeTableMappingId',
      'timeTableType',
      'day',
      'period',
      'isAttendence',
      'isSameTeacher',
      'timeTableNameId',
      'timeTableCreationId'
    ],
    include: [
      {
        model: model.timeTableRoutineModel,
        as: "timeTablecreate",
        required: true,
        attributes: ['timeTableRoutineId', 'startingDate', 'endingDate'],
        where: {
          is_publish: true,
          academicYearId,
          startingDate: {
            [Op.lt]: currentDate
          },
          ...buildScope(model.timeTableRoutineModel),
        },
        include: [
          {
            model: model.courseModel,
            as: "timeTableCourse",
            attributes: ['courseId', 'courseName']
          },
          timeTableRoutineClassSectionInclude({
            sectionRequired: Boolean(sessionId),
            sectionWhere: {
              ...(sessionId && { sessionId }),
            },
            termAttributes: ['classSectionTermId', 'term', 'classSectionsId'],
            sectionAttributes: ['year', 'section', 'classSectionsId'],
          })
        ]
      },
      {
        model: model.timeTableStructurePeriodsModel,
        as: "timeTablecreation",
        required: true,
        attributes: ['timeTableCreationId', 'periodName', 'startTime', 'endTime']
      },
      {
        model: model.teacherSubjectMappingModel,
        as: "timeTableTeacherSubject",
        attributes: ['teacherSubjectMappingId'],
        include: [
          {
            model: model.subjectModel,
            as: "employeeSubject",
            attributes: ['subjectId', 'subjectName'],
          }
        ]
      },
      {
        model: model.employeeModel, as: "employeeDetails",
        attributes: [
          "userId",
          "employeeName",
          "employeeCode",
          "pickColor"
        ]
      },
      {
        model: model.subjectModel,
        as: "timeTableSubject",
        attributes: ['subjectId', 'subjectName']
      },
      {
        model: model.electiveSubjectModel,
        as: "timeTableElective",
        attributes: ['electiveSubjectId', 'electiveSubjectName']
      },
      {
        model: model.classRoomModel,
        as: "classRoom",
        attributes: ['roomNumber']
      }
    ],
  });
}

export async function getUpcomingClassSchedulesForEmployee(
  userId,
  academicYearId,
  currentDate
) {
  return await model.classScheduleModel.findAll({
    raw: true,
    nest: true,
    where: {
      userId: Number(userId),
    },
    attributes: [
      'timeTableMappingId',
      'timeTableType',
      'day',
      'period',
      'isAttendence',
      'isSameTeacher',
      'timeTableNameId',
      'timeTableCreationId'
    ],
    include: [
      {
        model: model.timeTableRoutineModel,
        as: "timeTablecreate",
        required: true,
        attributes: ['timeTableRoutineId', 'startingDate', 'endingDate'],
        where: {
          is_publish: true,
          academicYearId,
          endingDate: {
            [Op.gte]: currentDate
          },
          ...buildScope(model.timeTableRoutineModel),
        },
        include: [
          {
            model: model.courseModel,
            as: "timeTableCourse",
            attributes: ['courseName']
          },
          timeTableRoutineClassSectionInclude({
            termAttributes: ['classSectionTermId', 'term', 'classSectionsId'],
            sectionAttributes: ['year', 'section', 'classSectionsId'],
          })
        ]
      },
      {
        model: model.timeTableStructurePeriodsModel,
        as: "timeTablecreation",
        required: true,
        attributes: ['timeTableCreationId', 'periodName', 'startTime', 'endTime']
      },
      {
        model: model.teacherSubjectMappingModel,
        as: "timeTableTeacherSubject",
        attributes: ['teacherSubjectMappingId'],
        include: [
          {
            model: model.subjectModel,
            as: "employeeSubject",
            attributes: ['subjectId', 'subjectName'],
          }
        ]
      },
      {
        model: model.subjectModel,
        as: "timeTableSubject",
        attributes: ['subjectId', 'subjectName']
      },
      {
        model: model.electiveSubjectModel,
        as: "timeTableElective",
        attributes: ['electiveSubjectId', 'electiveSubjectName']
      },
      {
        model: model.classRoomModel,
        as: "classRoom",
        attributes: ['roomNumber']
      }
    ],
  });
}

export async function getUniqueClassSectionSubjectsForEmployee(employeeId, academicYearId) {
  const employee = await model.employeeModel.findOne({
    where: { employeeId: Number(employeeId) },
    attributes: ['employeeId', 'instituteId'],
  });
  if (!employee) {
    return [];
  }

  const schedules = await model.classScheduleModel.findAll({
    where: {
      employeeId: Number(employeeId),
    },
    include: [
      {
        model: model.timeTableRoutineModel,
        as: "timeTablecreate",
        required: true,
        where: {
          instituteId: Number(employee.instituteId),
          academicYearId: Number(academicYearId),
        },
        include: [
          {
            model: model.courseModel,
            as: "timeTableCourse",
            attributes: ['courseName', 'courseId']
          },
          timeTableRoutineClassSectionInclude({
            termAttributes: ['classSectionTermId', 'term', 'classSectionsId'],
            sectionAttributes: ['year', 'section', 'classSectionsId'],
          })
        ]
      },
      {
        model: model.subjectModel,
        as: "timeTableSubject",
        attributes: ['subjectId', 'subjectName']
      },
      {
        model: model.electiveSubjectModel,
        as: "timeTableElective",
        attributes: ['electiveSubjectId', 'electiveSubjectName']
      },
      {
        model: model.employeeModel,
        as: "employeeDetails",
        attributes: [
          'employeeId',
          'employeeName',
          'employeeCode',
          'department',
          'employmentType',
          'pickColor',
          'employeePhoto',
          'userId',
          'campusId',
        ],
      }
    ]
  });

  return schedules;
}

export async function getEmployeeRecurringSchedules(employeeId, academicYearId) {
  return await model.classScheduleModel.findAll({
    where: { employeeId },
    attributes: ['day'],
    include: [
      {
        model: model.timeTableRoutineModel,
        as: 'timeTablecreate',
        required: true,
        attributes: ['startingDate', 'endingDate'],
        where: {
          is_publish: true,
          academicYearId,
          ...buildScope(model.timeTableRoutineModel),
        }
      }
    ]
  });
}

export async function getPeriodsForStructures(timeTableNameIds) {
  return await model.timeTableStructurePeriodsModel.findAll({
    where: {
      timeTableNameId: { [Op.in]: timeTableNameIds }
    },
    attributes: [
      'timeTableCreationId',
      'timeTableNameId',
      'periodName',
      'startTime',
      'endTime',
      'isBreak',
    ],
    order: [['timeTableNameId', 'ASC'], ['timeTableCreationId', 'ASC']],
    raw: true
  });
}
