import { Op } from 'sequelize';
import * as model from '../models/index.js';
import { buildScope, scoped } from '../utility/scoped.js';
import { classSectionTermsInclude, studentClassSectionTermWithSectionInclude, timeTableRoutineClassSectionInclude, stripRoutinePersistPayload, routineStructureInclude } from '../utility/classSectionIncludes.js';

async function assertScopedRoutine(timeTableRoutineId, options = {}) {
  const { transaction, attributes = ['timeTableRoutineId'] } = options;
  return scoped(model.timeTableRoutineModel).findOne({
    where: { timeTableRoutineId },
    attributes,
    transaction,
  });
}

async function assertScopedSchedule(timeTableCellId, options = {}) {
  const { transaction, attributes = ['timeTableCellId', 'timeTableRoutineId'] } = options;
  return model.timeTableCellModel.findOne({
    where: { timeTableCellId },
    attributes,
    transaction,
    include: [{
      model: model.timeTableRoutineModel,
      as: 'timeTableRoutine',
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
  const routineId = Number(timeTableRoutineId);

  const cells = await model.timeTableCellModel.findAll({
    where: { timeTableRoutineId: routineId },
    attributes: ['timeTableCellId'],
    transaction,
  });

  const mappingIds = [];
  for (const cell of cells) {
    mappingIds.push(cell.timeTableCellId);
  }

  if (mappingIds.length === 0) {
    return 0;
  }

  const dateWiseRows = await model.timeTableCellDateWiseModel.findAll({
    where: { timeTableCellId: { [Op.in]: mappingIds } },
    attributes: ['timeTableCellDateWiseId'],
    transaction,
  });

  const dateWiseIds = [];
  for (const row of dateWiseRows) {
    dateWiseIds.push(row.timeTableCellDateWiseId);
  }

  if (dateWiseIds.length > 0) {
    await model.timeTableCellTeachersDateWiseModel.destroy({
      where: { timeTableCellDateWiseId: { [Op.in]: dateWiseIds } },
      transaction,
    });
    await model.timeTableCellDateWiseModel.destroy({
      where: { timeTableCellDateWiseId: { [Op.in]: dateWiseIds } },
      transaction,
    });
  }

  await model.timeTableCellTeachersModel.destroy({
    where: { timeTableCellId: { [Op.in]: mappingIds } },
    transaction,
  });

  return model.timeTableCellModel.destroy({
    where: { timeTableCellId: { [Op.in]: mappingIds } },
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

export async function deletetimeTableMapping(timeTableCellId, options = {}) {
  const { transaction, deleteCombinedGroup = false } = options;
  const schedule = await assertScopedSchedule(timeTableCellId, {
    transaction,
    attributes: ['timeTableCellId', 'combinedGroupId'],
  });
  if (!schedule) {
    throw new Error('Mapping not found');
  }

  const mappingIds = [timeTableCellId];
  if (deleteCombinedGroup && schedule.combinedGroupId) {
    const siblings = await getMappingsByCombinedGroupIdRepository(schedule.combinedGroupId, { transaction });
    mappingIds.length = 0;
    siblings.forEach((row) => mappingIds.push(row.timeTableCellId));
  }

  await model.timeTableCellTeachersModel.destroy({
    where: { timeTableCellId: { [Op.in]: mappingIds } },
    transaction,
  });

  await model.timeTableCellModel.destroy({
    where: { timeTableCellId: { [Op.in]: mappingIds } },
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

  const cellPayload = { ...data };
  delete cellPayload.userId;
  delete cellPayload.teacherType;
  delete cellPayload.teachers;

  const cell = await model.timeTableCellModel.create(cellPayload, { transaction });

  let teacherRows = [];
  if (Array.isArray(data.teachers) && data.teachers.length > 0) {
    teacherRows = data.teachers;
  } else if (data.userId != null) {
    teacherRows = [{
      userId: data.userId,
      teacherType: data.teacherType || 'Primary',
      isAttendence: data.isAttendence,
    }];
  }

  for (const teacher of teacherRows) {
    await model.timeTableCellTeachersModel.create({
      timeTableCellId: cell.timeTableCellId,
      userId: Number(teacher.userId),
      teacherType: teacher.teacherType || 'Primary',
      isAttendence: teacher.isAttendence != null ? teacher.isAttendence : true,
      createdBy: data.createdBy,
      updatedBy: data.updatedBy,
    }, { transaction });
  }

  return cell;
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
  const conflict = await model.timeTableCellModel.findOne({
    transaction: transaction ?? null,
    where: {
      day,
    },
    include: [
      {
        model: model.timeTableCellTeachersModel,
        as: 'timeTableCellTeachers',
        required: true,
        where: { userId: Number(userId) },
        attributes: ['timeTableCellTeacherId', 'userId', 'teacherType'],
      },
      {
        model: model.timeTableStructurePeriodsModel,
        as: 'timeTablecreation',
        attributes: ['startTime', 'endTime'],
        where: {
          [Op.and]: [
            { startTime: { [Op.lt]: endTime } },
            { endTime: { [Op.gt]: startTime } },
          ],
        },
      },
      {
        model: model.timeTableRoutineModel,
        as: 'timeTableRoutine',
        attributes: ['startingDate', 'endingDate', 'classSectionTermId', 'timeTableRoutineId'],
        required: true,
        where: {
          [Op.and]: [
            { startingDate: { [Op.lte]: endingDate } },
            { endingDate: { [Op.gte]: startingDate } },
          ],
          ...buildScope(model.timeTableRoutineModel),
        },
        include: [
          timeTableRoutineClassSectionInclude({
            sectionAttributes: ['section', 'year'],
          }),
        ],
      },
    ],
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

  const conflict = await model.timeTableCellModel.findOne({
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
        as: 'timeTableRoutine',
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

export async function getMappingByIdRepository(timeTableCellId, options = {}) {
  return await model.timeTableCellModel.findOne({
    where: { timeTableCellId },
    attributes: ['timeTableCellId', 'timeTableRoutineId', 'combinedGroupId', 'timeTableCreationId'],
    transaction: options.transaction,
  });
};

export async function getMappingCopySourceRepository(timeTableCellId, options = {}) {
  return assertScopedSchedule(timeTableCellId, {
    transaction: options.transaction,
    attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
  });
}

export async function getSourceCellMappingsRepository(timeTableCellId, options = {}) {
  const source = await getMappingCopySourceRepository(timeTableCellId, options);
  if (!source) {
    return [];
  }

  return await model.timeTableCellTeachersModel.findAll({
    where: { timeTableCellId: Number(timeTableCellId) },
    attributes: ['timeTableCellTeacherId', 'timeTableCellId', 'userId', 'teacherType', 'isAttendence'],
    transaction: options.transaction,
    order: [['timeTableCellTeacherId', 'ASC']],
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
  return model.timeTableCellModel.findOne({
    where: {
      timeTableRoutineId: Number(timeTableRoutineId),
      day,
      period: Number(period),
      timeTableCreationId: Number(timeTableCreationId),
    },
    attributes: ['timeTableCellId'],
    transaction: options.transaction,
    include: [{
      model: model.timeTableRoutineModel,
      as: 'timeTableRoutine',
      required: true,
      where: buildScope(model.timeTableRoutineModel),
      attributes: ['timeTableRoutineId'],
    }],
  });
}

export async function getMappingsByCombinedGroupIdRepository(combinedGroupId, options = {}) {
  return await model.timeTableCellModel.findAll({
    where: { combinedGroupId },
    attributes: ['timeTableCellId', 'timeTableRoutineId', 'combinedGroupId', 'timeTableCreationId'],
    transaction: options.transaction,
  });
};

function isAllowedCombinedConflict(conflict, options = {}) {
  if (!conflict) return true;

  const {
    allowedClassSectionTermIds = [],
    excludeCombinedGroupId = null,
    excludeRoutineId = null,
    excludeTimeTableCellId = null,
  } = options;
  const routine = conflict.timeTableRoutine;
  const conflictRoutineId = conflict.timeTableRoutineId
    ?? conflict.dataValues?.timeTableRoutineId
    ?? routine?.timeTableRoutineId
    ?? routine?.dataValues?.timeTableRoutineId;

  if (
    excludeTimeTableCellId != null
    && conflict.timeTableCellId != null
    && Number(conflict.timeTableCellId) === Number(excludeTimeTableCellId)
  ) {
    return true;
  }

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
  const conflict = await model.timeTableCellModel.findOne({
    transaction: transaction ?? null,
    where: {
      classRoomSectionId,
      day,
    },
    include: [
      {
        model: model.timeTableStructurePeriodsModel,
        as: 'timeTablecreation',
        attributes: ['startTime', 'endTime'],
        where: {
          [Op.and]: [
            { startTime: { [Op.lt]: endTime } },
            { endTime: { [Op.gt]: startTime } },
          ],
        },
      },
      {
        model: model.timeTableRoutineModel,
        as: 'timeTableRoutine',
        attributes: ['startingDate', 'endingDate', 'classSectionTermId', 'timeTableRoutineId'],
        required: true,
        where: {
          [Op.and]: [
            { startingDate: { [Op.lte]: endingDate } },
            { endingDate: { [Op.gte]: startingDate } },
          ],
          ...buildScope(model.timeTableRoutineModel),
        },
        include: [
          timeTableRoutineClassSectionInclude({
            sectionAttributes: ['section', 'year'],
          }),
        ],
      },
    ],
  });

  if (isAllowedCombinedConflict(conflict, options)) {
    return null;
  }

  return conflict;
};

export async function getFullRoutineDetailsRepository(timeTableRoutineId) {
  return scoped(model.timeTableRoutineModel).findOne({
    where: { timeTableRoutineId: Number(timeTableRoutineId) },
    attributes: [
      'timeTableRoutineId',
      'timetableStructureCourseMapperId',
      'courseId',
      'academicYearId',
      'classSectionTermId',
      'campusId',
      'instituteId',
      'timeTableType',
      'startingDate',
      'endingDate',
      'isPublish',
      'createdBy',
      'updatedBy',
    ],
    include: [
      {
        model: model.timeTableCellModel,
        as: 'timeTableCells',
        attributes: [
          'timeTableCellId',
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
        ],
        include: [
          {
            model: model.timeTableCellTeachersModel,
            as: 'timeTableCellTeachers',
            attributes: ['userId', 'teacherType', 'isAttendence'],
            required: false,
          },
        ],
      },
    ],
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
  return model.timeTableCellModel.bulkCreate(mappings, { transaction });
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

export async function updatetimeTableCreate(timeTableCellId, data) {
  const schedule = await assertScopedSchedule(timeTableCellId);
  if (!schedule) {
    return [0];
  }
  const result = await model.timeTableCellModel.update(data, {
    where: { timeTableCellId },
  });
  return result;
};

export async function findMappingById(id) {
  const result = await assertScopedSchedule(id, {
    attributes: [
      'timeTableCellId',
      'timeTableRoutineId',
      'timeTableCreationId',
      'timeTableNameId',
      'day',
      'period',
      'classRoomSectionId',
      'timeTableType',
      'subjectId',
      'electiveSubjectId',
      'teacherSubjectMappingId',
      'combinedGroupId',
      'isAttendence',
      'isSameTeacher',
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

  const cellData = { ...data };
  delete cellData.userId;
  delete cellData.teacherType;
  delete cellData.timeTableCellTeacherId;

  const teacherType = data.teacherType;
  const teacherAttendence = data.isAttendence;
  const hasTeacherUpdate = teacherType != null || teacherAttendence != null;

  if (Object.keys(cellData).length > 0) {
    await model.timeTableCellModel.update(cellData, {
      where: { timeTableCellId: id },
      transaction,
    });
  }

  if (hasTeacherUpdate) {
    const teacherWhere = { timeTableCellId: id };
    if (data.timeTableCellTeacherId != null) {
      teacherWhere.timeTableCellTeacherId = Number(data.timeTableCellTeacherId);
    } else if (teacherType != null) {
      teacherWhere.teacherType = teacherType;
    }

    const teacherData = { updatedBy: data.updatedBy };
    if (teacherType != null) teacherData.teacherType = teacherType;
    if (teacherAttendence != null) teacherData.isAttendence = teacherAttendence;

    await model.timeTableCellTeachersModel.update(teacherData, {
      where: teacherWhere,
      transaction,
    });
  }

  return [1];
};

export async function addCellTeacherRepository(data, transaction) {
  return model.timeTableCellTeachersModel.create(data, { transaction });
}

export async function findCellTeacherRepository(timeTableCellId, options = {}) {
  const where = { timeTableCellId: Number(timeTableCellId) };
  if (options.teacherType != null) {
    where.teacherType = options.teacherType;
  }
  if (options.userId != null) {
    where.userId = Number(options.userId);
  }
  if (options.timeTableCellTeacherId != null) {
    where.timeTableCellTeacherId = Number(options.timeTableCellTeacherId);
  }

  return model.timeTableCellTeachersModel.findOne({
    where,
    attributes: [
      'timeTableCellTeacherId',
      'timeTableCellId',
      'userId',
      'teacherType',
      'isAttendence',
    ],
    transaction: options.transaction,
  });
}

export async function getTeachersByMappingIdsRepository(mappingIds, options = {}) {
  return model.timeTableCellTeachersModel.findAll({
    where: { timeTableCellId: { [Op.in]: mappingIds } },
    attributes: ['timeTableCellTeacherId', 'timeTableCellId', 'userId', 'teacherType', 'isAttendence'],
    transaction: options.transaction,
  });
}

export async function getTimeTableMappingDetail(timeTableRoutineId) {
  const result = await model.timeTableCellModel.findAll({
    attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
    where: {
      ...(timeTableRoutineId && { timeTableRoutineId }),
    },
    include: [
      {
        model: model.timeTableCellTeachersModel,
        as: 'timeTableCellTeachers',
        attributes: ['timeTableCellTeacherId', 'userId', 'teacherType', 'isAttendence'],
        required: false,
        include: [
          {
            model: model.employeeModel,
            as: 'employeeDetails',
            attributes: ['employeeName', 'employeeCode', 'pickColor', 'employeeId', 'userId'],
            required: false,
          },
        ],
      },
      {
        model: model.teacherSubjectMappingModel,
        as: 'timeTableTeacherSubject',
        attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updated', 'employee_id', 'subject_id'] },
        include: [
          {
            model: model.employeeModel,
            as: 'teacherEmployeeData',
            attributes: ['employeeName', 'employeeCode', 'pickColor', 'employeeId'],
            where: buildScope(model.employeeModel),
            required: false,
          },
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
        model: model.timeTableRoutineModel,
        as: 'timeTableRoutine',
        required: true,
        attributes: { exclude: ['createdAt', 'updatedAt', 'createdBy', 'updatedBy'] },
        where: buildScope(model.timeTableRoutineModel),
        include: [
          routineStructureInclude(),
          {
            model: model.courseModel,
            as: 'timeTableCourse',
            attributes: ['courseName'],
            where: buildScope(model.courseModel),
            required: false,
          },
          {
            model: model.campusModel,
            as: 'timeTableCampus',
            attributes: ['campusName'],
          },
          timeTableRoutineClassSectionInclude({
            sectionAttributes: ['section', 'year', 'classSectionsId'],
            sectionWhere: buildScope(model.classSectionModel),
          }),
          {
            model: model.acedmicYearModel,
            as: 'acedmicYearTimeTable',
            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
          },
        ],
      },
      {
        model: model.classRoomModel,
        as: 'classRoom',
        attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
      },
      {
        model: model.electiveSubjectModel,
        as: 'timeTableElective',
        attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
      },
      {
        model: model.subjectModel,
        as: 'timeTableSubject',
        attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
      },
    ],
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
      routineStructureInclude({ withPeriods: false }),
      {
        model: model.timeTableCellModel,
        as: 'timeTableCells',
        attributes: {
          exclude: [
            'createdAt',
            'updatedAt',
            'createdBy',
            'updatedBy',
            'deletedAt',
            'teacher_subject_mapping_id',
            'time_table_routine_id',
            'time_table_creation_id',
            'class_room_section_id',
            'elective_subject_id',
            'subject_id',
          ],
        },
        include: [
          {
            model: model.timeTableCellTeachersModel,
            as: 'timeTableCellTeachers',
            attributes: ['timeTableCellTeacherId', 'userId', 'teacherType', 'isAttendence'],
            required: false,
            include: [
              {
                model: model.employeeModel,
                as: 'employeeDetails',
                attributes: ['employeeName', 'employeeCode', 'pickColor', 'employeeId', 'userId'],
                required: false,
              },
            ],
          },
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
                attributes: ["employeeName", "employeeCode", "pickColor", "employeeId", "userId"],
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
        ]
      }
    ]
  });
  return result;
};

export async function getTeacherTimeTable(userId) {
  return model.timeTableRoutineModel.findAll({
    where: {
      is_publish: true,
      ...buildScope(model.timeTableRoutineModel),
    },
    attributes: {
      exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'],
    },
    include: [
      {
        model: model.courseModel,
        as: 'timeTableCourse',
        attributes: ['courseId', 'courseName'],
        required: false,
      },
      timeTableRoutineClassSectionInclude({
        sectionAttributes: ['section', 'year', 'classSectionsId'],
      }),
      {
        model: model.timeTableCellModel,
        as: 'timeTableCells',
        required: true,
        attributes: [
          'timeTableCellId',
          'day',
          'period',
          'isSameTeacher',
          'timeTableCreationId',
          'timeTableType',
          'subjectId',
          'electiveSubjectId',
          'teacherSubjectMappingId',
        ],
        include: [
          {
            model: model.timeTableCellTeachersModel,
            as: 'timeTableCellTeachers',
            required: true,
            where: { userId: Number(userId) },
            attributes: ['userId', 'teacherType', 'isAttendence'],
            include: [
              {
                model: model.employeeModel,
                as: 'employeeDetails',
                attributes: ['userId', 'employeeId', 'employeeName', 'employeeCode', 'pickColor'],
                required: false,
              },
            ],
          },
          {
            model: model.timeTableStructurePeriodsModel,
            as: 'timeTablecreation',
            attributes: ['timeTableCreationId', 'periodName', 'startTime', 'endTime'],
          },
          {
            model: model.teacherSubjectMappingModel,
            as: 'timeTableTeacherSubject',
            required: false,
            include: [
              {
                model: model.employeeModel,
                as: 'teacherEmployeeData',
                attributes: ['userId', 'employeeId', 'employeeName', 'employeeCode', 'pickColor'],
                required: false,
              },
              {
                model: model.subjectModel,
                as: 'employeeSubject',
                attributes: ['subjectId', 'subjectName', 'subjectCode'],
                required: false,
              },
            ],
          },
          {
            model: model.subjectModel,
            as: 'timeTableSubject',
            attributes: ['subjectId', 'subjectName', 'subjectCode'],
            required: false,
          },
          {
            model: model.electiveSubjectModel,
            as: 'timeTableElective',
            attributes: ['electiveSubjectId', 'electiveSubjectName', 'electiveSubjectCode'],
            required: false,
          },
        ],
      },
    ],
  });
}

export async function getStudentTimeTableRepository(classSectionTermId, subjectIds) {
  const where = {
    is_publish: true,
    classSectionTermId: Number(classSectionTermId),
  };

  return scoped(model.timeTableRoutineModel).findAll({
    where,
    include: [
      {
        model: model.courseModel,
        as: 'timeTableCourse',
      },
      timeTableRoutineClassSectionInclude(),
      {
        model: model.timeTableCellModel,
        as: 'timeTableCells',
        required: true,
        where: {
          subjectId: subjectIds,
        },
        attributes: [
          'timeTableCellId',
          'day',
          'period',
          'isSameTeacher',
          'timeTableCreationId',
          'timeTableType',
          'subjectId',
          'electiveSubjectId',
          'teacherSubjectMappingId',
        ],
        include: [
          {
            model: model.timeTableStructurePeriodsModel,
            as: 'timeTablecreation',
          },
          {
            model: model.subjectModel,
            as: 'timeTableSubject',
          },
          {
            model: model.timeTableCellTeachersModel,
            as: 'timeTableCellTeachers',
            attributes: ['userId', 'teacherType', 'isAttendence'],
            required: false,
            include: [
              {
                model: model.employeeModel,
                as: 'employeeDetails',
                attributes: ['userId', 'employeeId', 'employeeName', 'employeeCode', 'pickColor'],
                required: false,
              },
            ],
          },
          {
            model: model.teacherSubjectMappingModel,
            as: 'timeTableTeacherSubject',
            include: [
              {
                model: model.employeeModel,
                as: 'teacherEmployeeData',
              },
              {
                model: model.subjectModel,
                as: 'employeeSubject',
                attributes: ['subjectId', 'subjectName', 'subjectCode'],
              },
            ],
          },
          {
            model: model.electiveSubjectModel,
            as: 'timeTableElective',
          },
        ],
      },
    ],
  });
}

export async function publishTimeTableRepository(timeTableRoutineId, options = {}) {
  const { transaction } = options;
  const routine = await assertScopedRoutine(timeTableRoutineId, {
    transaction,
    attributes: ['timeTableRoutineId'],
  });
  if (!routine) {
    return [0];
  }
  return scoped(model.timeTableRoutineModel).update(
    { isPublish: true },
    { where: { timeTableRoutineId: Number(timeTableRoutineId) }, transaction },
  );
}

export async function getRoutineForPublishRepository(timeTableRoutineId, options = {}) {
  return scoped(model.timeTableRoutineModel).findOne({
    where: { timeTableRoutineId: Number(timeTableRoutineId) },
    attributes: [
      'timeTableRoutineId',
      'startingDate',
      'endingDate',
      'isPublish',
      'createdBy',
      'updatedBy',
    ],
    include: [routineStructureInclude({ withPeriods: false })],
    transaction: options.transaction,
  });
}

export async function getRoutineCellsForPublishRepository(timeTableRoutineId, options = {}) {
  return model.timeTableCellModel.findAll({
    where: { timeTableRoutineId: Number(timeTableRoutineId) },
    attributes: [
      'timeTableCellId',
      'day',
      'classRoomSectionId',
      'timeTableRoutineId',
    ],
    include: [
      {
        model: model.timeTableRoutineModel,
        as: 'timeTableRoutine',
        required: true,
        where: buildScope(model.timeTableRoutineModel),
        attributes: ['timeTableRoutineId'],
      },
      {
        model: model.timeTableCellTeachersModel,
        as: 'timeTableCellTeachers',
        attributes: ['userId', 'teacherType', 'isAttendence'],
        required: false,
      },
    ],
    transaction: options.transaction,
  });
}

export async function clearDateWiseForMappingIdsRepository(mappingIds, transaction) {
  if (!mappingIds.length) {
    return;
  }

  const existing = await model.timeTableCellDateWiseModel.findAll({
    where: { timeTableCellId: { [Op.in]: mappingIds } },
    attributes: ['timeTableCellDateWiseId'],
    transaction,
  });

  const dateWiseIds = [];
  for (const row of existing) {
    dateWiseIds.push(row.timeTableCellDateWiseId);
  }

  if (dateWiseIds.length > 0) {
    await model.timeTableCellTeachersDateWiseModel.destroy({
      where: { timeTableCellDateWiseId: { [Op.in]: dateWiseIds } },
      transaction,
    });
  }

  await model.timeTableCellDateWiseModel.destroy({
    where: { timeTableCellId: { [Op.in]: mappingIds } },
    transaction,
  });
}

export async function bulkCreateDateWiseCellsRepository(rows, transaction) {
  if (!rows.length) {
    return [];
  }
  return model.timeTableCellDateWiseModel.bulkCreate(rows, {
    transaction,
    returning: true,
  });
}

export async function bulkCreateDateWiseTeachersRepository(rows, transaction) {
  if (!rows.length) {
    return [];
  }
  return model.timeTableCellTeachersDateWiseModel.bulkCreate(rows, { transaction });
}

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
        model: model.timeTableCellModel,
        as: 'timeTableCells',
        attributes: [
          'timeTableCellId',
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

const ROUTINE_CELL_ATTRIBUTES = [
  'timeTableCellId',
  'timeTableNameId',
  'timeTableCreationId',
  'subjectId',
  'electiveSubjectId',
  'teacherSubjectMappingId',
  'classRoomSectionId',
  'day',
  'period',
  'timeTableType',
  'isAttendence',
  'isSameTeacher',
  'isOverridingSyblingElectives',
  'combinedGroupId',
];

function routineCellTeachersInclude({ userId, required = false } = {}) {
  const include = {
    model: model.timeTableCellTeachersModel,
    as: 'timeTableCellTeachers',
    attributes: ['timeTableCellTeacherId', 'userId', 'teacherType', 'isAttendence'],
    required,
    include: [
      {
        model: model.employeeModel,
        as: 'employeeDetails',
        attributes: ['employeeId', 'userId', 'employeeName', 'pickColor'],
        required: false,
      },
    ],
  };
  if (userId != null) {
    include.where = { userId: Number(userId) };
  }
  return include;
}

function routineCellsInclude({ userId, subjectId, required = false } = {}) {
  const cellWhere = {};
  if (subjectId != null) {
    cellWhere.subjectId = Number(subjectId);
  }

  return {
    model: model.timeTableCellModel,
    as: 'timeTableCells',
    required,
    attributes: ROUTINE_CELL_ATTRIBUTES,
    ...(Object.keys(cellWhere).length > 0 ? { where: cellWhere } : {}),
    include: [
      routineCellTeachersInclude({ userId, required: userId != null }),
      {
        model: model.subjectModel,
        as: 'timeTableSubject',
        attributes: ['subjectId', 'subjectName'],
        required: false,
      },
      {
        model: model.electiveSubjectModel,
        as: 'timeTableElective',
        attributes: ['electiveSubjectId', 'electiveSubjectName'],
        required: false,
      },
      {
        model: model.classRoomModel,
        as: 'classRoom',
        attributes: ['classRoomSectionId', 'roomNumber'],
        required: false,
      },
    ],
  };
}

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
      routineCellsInclude(),
    ],
  });
}

/** @deprecated Use getNormalRoutinesBySectionScopeRepository */
export async function getNormalRoutinesBySectionIdRepository(classSectionsId) {
  return getNormalRoutinesBySectionScopeRepository({ classSectionsId });
}

export async function getElectiveRoutinesByTableNamesRepository(timeTableNameIds, userId) {
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
      routineCellsInclude({ userId }),
    ],
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
      routineCellsInclude(),
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

async function fetchTeacherRoutineContext(userId, courseId, sessionId) {
  return Promise.all([
    scoped(model.employeeModel).findOne({
      where: { userId },
      attributes: ['userId', 'employeeId', 'employeeName', 'employeeCode', 'pickColor'],
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
      routineCellsInclude({
        userId,
        subjectId,
        required: true,
      }),
      teacherClassSectionInclude(courseId, sessionId),
    ],
    order: [['timeTableRoutineId', 'ASC']],
  });
}

async function fetchElectiveCellsForTeacher(
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
      routineCellsInclude({ userId, required: true }),
      teacherClassSectionInclude(courseId, sessionId),
    ],
  });

  const electiveCellsByTableNameId = new Map();
  for (const electiveRoutine of electiveRoutines) {
    const mapping = electiveRoutine.structureCourseMapping;
    const cells = electiveRoutine.timeTableCells || [];
    if (!mapping || mapping.timeTableNameId == null || !cells.length) {
      continue;
    }
    const tableNameId = mapping.timeTableNameId;
    const existing = electiveCellsByTableNameId.get(tableNameId) || [];
    electiveCellsByTableNameId.set(
      tableNameId,
      existing.concat(cells),
    );
  }

  return electiveCellsByTableNameId;
}

export async function getTeacherRoutineBundle(userId, courseId, sessionId, subjectId) {
  const [[employee, course, session, classSections], normalRoutines] = await Promise.all([
    fetchTeacherRoutineContext(userId, courseId, sessionId),
    fetchNormalRoutinesForTeacher(userId, courseId, sessionId, subjectId),
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

  const electiveCellsByTableNameId = await fetchElectiveCellsForTeacher(
    userId,
    courseId,
    sessionId,
    timeTableNameIds,
  );

  const routines = [];
  for (const routine of safeNormalRoutines) {
    const tableNameId = routine.structureCourseMapping.timeTableNameId;
    routines.push({
      routine,
      electiveCells: electiveCellsByTableNameId.get(tableNameId) || [],
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
