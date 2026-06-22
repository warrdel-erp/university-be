import { Op, Sequelize } from 'sequelize';
import * as model from '../models/index.js';
import { buildScope, scoped } from '../utility/scoped.js';

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
  try {
    const result = await scoped(model.timeTableRoutineModel).create(data, { transaction });
    return result;
  } catch (error) {
    console.error("Error in create create time table:", error);
    throw error;
  }
}

export async function getTimeTableCreateDetails() {
  try {
    const result = await scoped(model.timeTableRoutineModel).findAll({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
      include: [
        {
          model: model.timeTableStructureModel,
          as: "timeTableCreateName",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updated"] },
          include: [
            {
              model: model.timeTableStructurePeriodsModel,
              as: "timeTableName",
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updated"] }
            }
          ]
        },
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
        {
          model: model.classSectionModel,
          as: 'timeTableClassSection',
          attributes: ["section", "class", "section_id", "class_sections_id"],
          include: [
            {
              model: model.sessionModel,
              as: 'classSession',
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            }
          ]
        },
        {
          model: model.acedmicYearModel,
          as: 'acedmicYearTimeTable',
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
        },
      ]
    });
    return result;
  } catch (error) {
    console.error(`Error in getting time table create:`, error);
    throw error;
  };
};

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
  classSectionsId,
  timeTableType
) {


  const whereClause = {
    ...(courseId && { courseId }),
    ...(classSectionsId && { classSectionsId }),
    ...(timeTableType && { timeTableType }),
    // ...(universityId && { universityId }),
  };
  return await scoped(model.timeTableRoutineModel).findAll({
    where: whereClause,
    include: [
      {
        model: model.timeTableStructureModel,
        as: "timeTableCreateName",
        include: [
          {
            model: model.timeTableStructurePeriodsModel,
            as: "timeTableName"
          }
        ]
      },
      {
        model: model.courseModel,
        as: "timeTableCourse",
        attributes: ["courseName"]
      },
      {
        model: model.classSectionModel,
        as: "timeTableClassSection"
      }
    ],
    order: [
      [
        { model: model.timeTableStructureModel, as: "timeTableCreateName" },
        { model: model.timeTableStructurePeriodsModel, as: "timeTableName" },
        "timeTableCreationId",
        "ASC"
      ]
    ]
  });
}


export async function getSingleTimeTableCreateDetails(courseId) {
  try {
    const result = await scoped(model.timeTableRoutineModel).findAll({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
      include: [
        {
          model: model.timeTableStructureModel,
          as: "timeTableCreateName",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updated"] },
          include: [
            {
              model: model.timeTableStructurePeriodsModel,
              as: "timeTableName",
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updated"] }
            }
          ]
        },
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
        {
          model: model.classSectionModel,
          as: 'timeTableClassSection',
          attributes: ["section", "class", "section_id", "class_sections_id"],
        },
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
  } catch (error) {
    console.error(`Error in getting faculity load:`, error);
    throw error;
  };
};

export async function updateTimeTableCreate(faculityLoadId, info) {
  try {
    const result = await scoped(model.timeTableRoutineModel).update(info, {
      where: {
        faculityLoadId: faculityLoadId
      }
    });
    return result;
  } catch (error) {
    console.error(`Error updating faculity load ${faculityLoadId} :`, error);
    throw error;
  }
};

export async function deleteTimeTableCreate(faculityLoadId) {
  try {
    const result = await scoped(model.timeTableRoutineModel).destroy({
      where: { faculityLoadId },
      individualHooks: true
    });
    return { message: `faculity load deleted successfully for time Table Creation Id :-${faculityLoadId}` };
  } catch (error) {
    console.error('Error during soft delete:', error);
    throw new Error('Unable to soft delete account');
  }
};

export async function deletetimeTableMapping(timeTableMappingId) {
  try {
    const schedule = await assertScopedSchedule(timeTableMappingId);
    if (!schedule) {
      throw new Error('Unable to soft delete account');
    }
    const result = await model.classScheduleModel.destroy({
      where: { timeTableMappingId },
      individualHooks: true
    });
    return { message: `time table mapping successfully for time Table Creation Id :-${timeTableMappingId}` };
  } catch (error) {
    console.error('Error during soft delete:', error);
    throw new Error('Unable to soft delete account');
  }
};

export async function addtimeTableMapping(data, transaction) {
  try {
    const routine = await assertScopedRoutine(data.timeTableRoutineId, { transaction });
    if (!routine) {
      throw new Error('Time table routine not found');
    }
    const result = await model.classScheduleModel.create(data, { transaction });
    return result;
  } catch (error) {
    console.error("Error in create mapping of time table:", error);
    throw error;
  }
};

export async function getPeriodInfoRepository(timeTableCreationId) {
  try {
    return await model.timeTableStructurePeriodsModel.findOne({
      where: { timeTableCreationId },
      attributes: ["startTime", "endTime"],
      include: [
        {
          model: model.timeTableStructureModel,
          as: "timeTableName",
          attributes: ["periodLength"]
        }
      ]
    });
  } catch (error) {
    console.error("Error in getPeriodInfoRepository:", error);
    throw error;
  }
};

// export async function checkTeacherConflictRepository(employeeId, day, startTime, endTime) {
//   try {
//     return await model.classScheduleModel.findOne({
//       where: {
//         employeeId,
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

export async function checkTeacherConflictRepository(employeeId, day, startTime, endTime, startingDate, endingDate) {
  try {
    return await model.classScheduleModel.findOne({
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
          attributes: ["startingDate", "endingDate", "classSectionsId"],
          required: true,
          where: {
            [Op.and]: [
              { startingDate: { [Op.lte]: endingDate } },
              { endingDate: { [Op.gte]: startingDate } }
            ],
            ...buildScope(model.timeTableRoutineModel),
          },
          include: [
            {
              model: model.classSectionModel,
              as: "timeTableClassSection",
              attributes: ["section", "class"]
            }
          ]
        }
      ]
    });

  } catch (error) {
    console.error("Error in checkTeacherConflictRepository:", error);
    throw error;
  }
};

export async function getRoutineByIdRepository(timeTableRoutineId) {
  try {
    return await scoped(model.timeTableRoutineModel).findOne({
      where: { timeTableRoutineId },
      attributes: ["startingDate", "endingDate", "isPublish", "classSectionsId"]
    });
  } catch (error) {
    console.error("Error in getRoutineByIdRepository:", error);
    throw error;
  }
};

export async function checkRoomConflictRepository(classRoomSectionId, day, startTime, endTime, startingDate, endingDate) {
  try {
    return await model.classScheduleModel.findOne({
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
          attributes: ["startingDate", "endingDate", "classSectionsId"],
          required: true,
          where: {
            [Op.and]: [
              { startingDate: { [Op.lte]: endingDate } },
              { endingDate: { [Op.gte]: startingDate } }
            ],
            ...buildScope(model.timeTableRoutineModel),
          },
          include: [
            {
              model: model.classSectionModel,
              as: "timeTableClassSection",
              attributes: ["section", "class"]
            }
          ]
        }
      ]
    });

  } catch (error) {
    console.error("Error in checkRoomConflictRepository:", error);
    throw error;
  }
};

export async function getFullRoutineDetailsRepository(timeTableRoutineId) {
  try {
    return await scoped(model.timeTableRoutineModel).findOne({
      where: { timeTableRoutineId },
      include: [
        {
          model: model.classScheduleModel,
          as: 'timeTablecreate'
        }
      ]
    });
  } catch (error) {
    console.error("Error in getFullRoutineDetailsRepository:", error);
    throw error;
  }
};

export async function checkRoutineOverlapRepository(classSectionsId, startingDate, endingDate, excludeRoutineId) {
  try {
    return await scoped(model.timeTableRoutineModel).findOne({
      where: {
        classSectionsId,
        ...(excludeRoutineId && { timeTableRoutineId: { [Op.ne]: excludeRoutineId } }),
        [Op.and]: [
          { startingDate: { [Op.lte]: endingDate } },
          { endingDate: { [Op.gte]: startingDate } }
        ]
      }
    });
  } catch (error) {
    console.error("Error in checkRoutineOverlapRepository:", error);
    throw error;
  }
}

export async function bulkCreateMappings(mappings, transaction) {
  try {
    const routineId = mappings[0]?.timeTableRoutineId;
    if (routineId) {
      const routine = await assertScopedRoutine(routineId, { transaction });
      if (!routine) {
        throw new Error('Time table routine not found');
      }
    }
    return await model.classScheduleModel.bulkCreate(mappings, { transaction });
  } catch (error) {
    console.error("Error in bulkCreateMappings:", error);
    throw error;
  }
}

export async function changeTimeTableCreate(timeTableRoutineId, data) {
  try {
    const routine = await assertScopedRoutine(timeTableRoutineId);
    if (!routine) {
      return [0];
    }
    const result = await scoped(model.timeTableRoutineModel).update(data, {
      where: { timeTableRoutineId }
    });
    return result;
  } catch (error) {
    console.error(`Error updating time table create  ${timeTableRoutineId}:`, error);
    throw error;
  }
};

export async function updatetimeTableCreate(timeTableMappingId, data) {
  try {
    const schedule = await assertScopedSchedule(timeTableMappingId);
    if (!schedule) {
      return [0];
    }
    const result = await model.classScheduleModel.update(data, {
      where: { timeTableMappingId }
    });
    return result;
  } catch (error) {
    console.error(`Error updating time table type  ${timeTableMappingId}:`, error);
    throw error;
  }
};

export async function findMappingById(id) {
  try {
    const result = await assertScopedSchedule(id, {
      attributes: ['timeTableMappingId', 'timeTableRoutineId', 'timeTableCreationId', 'employeeId', 'day', 'period'],
    });

    return result;
  } catch (error) {
    throw new Error(`Failed to fetch mapping record for ID ${id}`);
  }
}

export async function updateMapping(id, data, transaction) {
  try {
    const schedule = await assertScopedSchedule(id, { transaction });
    if (!schedule) {
      throw new Error(`Failed to update mapping record for ID ${id}`);
    }
    const result = await model.classScheduleModel.update(data, {
      where: { timeTableMappingId: id },
      transaction
    });

    return result;
  } catch (error) {
    throw new Error(`Failed to update mapping record for ID ${id}`);
  }
};

export async function getTimeTableMappingDetail(timeTableRoutineId) {
  try {
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
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
          where: buildScope(model.timeTableRoutineModel),
          include: [
            {
              model: model.timeTableStructureModel,
              as: "timeTableCreateName",
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
              include: [
                {
                  model: model.timeTableStructurePeriodsModel,
                  as: "timeTableName",
                  attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] }
                }
              ]
            },
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
            {
              model: model.classSectionModel,
              as: 'timeTableClassSection',
              attributes: ["section", "class", "section_id", "class_sections_id"],
              where: buildScope(model.classSectionModel),
              required: false,
            },
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
  } catch (error) {
    console.error(`Error in getting time table create:`, error);
    throw error;
  };
};

export async function getTimeTableCellData(courseId, classSectionsId) {
  try {
    const whereClause = {
      ...(courseId && { courseId }),
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
        {
          model: model.classSectionModel,
          as: 'timeTableClassSection',
          attributes: { exclude: ["createdAt", "updatedAt", "createdBy", "deletedAt", "course_id", "semester_id", "class_id", "acedmic_year_id", "specialization_id", "session_id"] }
        },
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
  } catch (error) {
    console.error("Error in getTimeTableCellData:", error);
    throw error;
  }
};

// export async function getTeacherTimeTable(employeeId,universityId,instituteId,role) {
//   console.log(`>>>>>>>>employeeId`,employeeId);

//   try {

//     const teacherWhere = { employeeId };

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
//                   attributes: ["employeeId", "employeeName", "employeeCode", "pickColor"],
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
//               as: "employeeDetails",
//               attributes: ["employeeId", "employeeName", "employeeCode", "pickColor"],
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
  try {
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
        {
          model: model.classSectionModel,
          as: "timeTableClassSection"
        },
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
  } catch (error) {
    console.error("Error in getTeacherTimeTable:", error);
    throw error;
  }
}




export async function getStudentTimeTableRepository(classSectionsId, subjectIds) {
  try {

    return await scoped(model.timeTableRoutineModel).findAll({
      where: {
        is_publish: true
      },
      include: [
        {
          model: model.courseModel,
          as: "timeTableCourse"
        },
        {
          model: model.classSectionModel,
          as: "timeTableClassSection"
        },
        {
          model: model.classScheduleModel,
          as: "timeTablecreate",
          required: true,
          where: {
            // class_sections_id: classSectionsId,
            subject_id: subjectIds
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

  } catch (error) {
    console.error("Error in getStudentTimeTableRepository:", error);
    throw error;
  }
};

export async function publishTimeTableRepository(timeTableRoutineId) {
  try {
    const routine = await assertScopedRoutine(timeTableRoutineId);
    if (!routine) {
      return [0];
    }
    const result = await scoped(model.timeTableRoutineModel).update(
      { isPublish: true },
      { where: { timeTableRoutineId } }
    );

    return result;
  } catch (error) {
    console.error("Error in publishTimeTableRepository:", error);
    throw error;
  }
};

export async function ClassSubjectCount(classSectionsId) {
  try {
    const section = await scoped(model.classSectionModel).findOne({
      where: { classSectionsId },
      attributes: ['classSectionsId'],
    });
    if (!section) {
      return null;
    }

    const students = await scoped(model.studentModel).findAll({
      where: { classSectionsId },
      attributes: ['studentId'],
    });
    if (!students.length) {
      return { classSectionsId, students: [] };
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
  } catch (error) {
    console.error("Error in subject Count repository:", error);
    throw error;
  }
};

export async function timeTableData(classSectionsId) {
  try {
    return await scoped(model.timeTableRoutineModel).findAll({
      where: {
        classSectionsId,
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
            },
          ],
        },
        {
          model: model.timeTableStructureModel,
          as: 'timeTableCreateName',
          attributes: ['timeTableNameId', 'name', 'instituteId', 'acedmicYearId'],
          where: buildScope(model.timeTableStructureModel),
          required: false,
        },
      ],
    });
  } catch (error) {
    console.error("Error in subject Count time table repository:", error);
    throw error;
  }
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

export async function getNormalRoutinesBySectionIdRepository(classSectionsId) {
  try {
    return await scoped(model.timeTableRoutineModel).findAll({
      where: {
        classSectionsId: classSectionsId,
        timeTableType: 'normal'
      },
      attributes: ['timeTableRoutineId', 'timeTableNameId', 'startingDate', 'endingDate', 'isPublish', 'timeTableType'],
      include: [
        {
          model: model.timeTableStructureModel,
          as: 'timeTableCreateName',
          attributes: ['name', 'timeTableNameId', 'weekOff'],
          include: [
            {
              model: model.timeTableStructurePeriodsModel,
              as: 'timeTableName',
              attributes: ['timeTableCreationId', 'periodName', 'startTime', 'endTime', 'isBreak'],
            }
          ]
        },
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
  } catch (error) {
    console.error("Error in getNormalRoutinesBySectionIdRepository:", error);
    throw error;
  }
}

export async function getElectiveRoutinesByTableNamesRepository(timeTableNameIds, employeeId) {
  try {
    return await scoped(model.timeTableRoutineModel).findAll({
      where: {
        timeTableNameId: { [Op.in]: timeTableNameIds },
        timeTableType: 'elective'
      },
      attributes: ['timeTableRoutineId', 'timeTableNameId', 'timeTableType'],
      include: [
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
  } catch (error) {
    console.error("Error in getElectiveRoutinesByTableNamesRepository:", error);
    throw error;
  }
}

const teacherRoutineStructureInclude = {
  model: model.timeTableStructureModel,
  as: 'timeTableCreateName',
  attributes: ['name', 'timeTableNameId', 'weekOff'],
  where: buildScope(model.timeTableStructureModel),
  required: false,
  include: [
    {
      model: model.timeTableStructurePeriodsModel,
      as: 'timeTableName',
      attributes: ['timeTableCreationId', 'periodName', 'startTime', 'endTime', 'isBreak'],
    },
  ],
};

const teacherClassSectionInclude = (courseId, sessionId) => ({
  model: model.classSectionModel,
  as: 'timeTableClassSection',
  required: true,
  where: {
    courseId,
    sessionId,
    ...buildScope(model.classSectionModel),
  },
  attributes: ['classSectionsId', 'section', 'class', 'semesterId', 'sessionId', 'courseId'],
  include: [
    {
      model: model.courseModel,
      as: 'courseSection',
      attributes: ['courseId', 'courseName', 'courseCode'],
      where: buildScope(model.courseModel),
      required: false,
    },
    {
      model: model.classModel,
      as: 'classGroup',
      attributes: ['classId', 'className', 'term'],
    },
  ],
});

const teacherNormalScheduleInclude = (employeeId) => ({
  model: model.classScheduleModel,
  as: 'timeTablecreate',
  required: true,
  where: { employeeId },
  include: [
    {
      model: model.employeeModel,
      as: 'employeeDetails',
      attributes: ['employeeId', 'employeeName', 'pickColor'],
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
          attributes: ['employeeId', 'employeeName', 'pickColor'],
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
});

const teacherElectiveScheduleInclude = (employeeId) => ({
  model: model.classScheduleModel,
  as: 'timeTablecreate',
  required: true,
  where: { employeeId },
  include: [
    {
      model: model.employeeModel,
      as: 'employeeDetails',
      attributes: ['employeeId', 'employeeName', 'pickColor'],
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

async function fetchTeacherRoutineContext(employeeId, courseId, sessionId) {
  return Promise.all([
    scoped(model.employeeModel).findOne({
      where: { employeeId },
      attributes: ['employeeId', 'employeeName', 'employeeCode', 'pickColor'],
    }),
    scoped(model.courseModel).findOne({
      where: { courseId },
      attributes: ['courseId', 'courseName', 'courseCode'],
    }),
    scoped(model.sessionModel).findOne({
      where: { sessionId },
      attributes: ['sessionId', 'sessionName', 'startingDate', 'endingDate', 'acedmicYearId'],
    }),
    scoped(model.classSectionModel).findAll({
      where: { courseId, sessionId },
      attributes: ['classSectionsId', 'section', 'class', 'semesterId', 'courseId', 'sessionId'],
      include: [
        {
          model: model.classModel,
          as: 'classGroup',
          attributes: ['classId', 'className', 'term'],
        },
      ],
      order: [['class', 'ASC'], ['section', 'ASC']],
    }),
  ]);
}

async function fetchNormalRoutinesForTeacher(employeeId, courseId, sessionId) {
  return scoped(model.timeTableRoutineModel).findAll({
    where: {
      courseId,
      timeTableType: 'normal',
    },
    attributes: [
      'timeTableRoutineId',
      'timeTableNameId',
      'startingDate',
      'endingDate',
      'isPublish',
      'timeTableType',
      'classSectionsId',
      'courseId',
    ],
    include: [
      teacherRoutineStructureInclude,
      teacherNormalScheduleInclude(employeeId),
      teacherClassSectionInclude(courseId, sessionId),
    ],
    order: [['timeTableRoutineId', 'ASC']],
  });
}

async function fetchElectiveScheduleItemsForTeacher(
  employeeId,
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
      timeTableNameId: { [Op.in]: timeTableNameIds },
    },
    attributes: ['timeTableRoutineId', 'timeTableNameId'],
    include: [
      teacherElectiveScheduleInclude(employeeId),
      teacherClassSectionInclude(courseId, sessionId),
    ],
  });

  const electiveItemsByTableNameId = new Map();
  for (const electiveRoutine of electiveRoutines) {
    const items = electiveRoutine.timeTablecreate || [];
    if (!items.length) {
      continue;
    }
    const existing = electiveItemsByTableNameId.get(electiveRoutine.timeTableNameId) || [];
    electiveItemsByTableNameId.set(
      electiveRoutine.timeTableNameId,
      existing.concat(items),
    );
  }

  return electiveItemsByTableNameId;
}

export async function getTeacherRoutineBundle(employeeId, courseId, sessionId) {
  try {
    const [[employee, course, session, classSections], normalRoutines] = await Promise.all([
      fetchTeacherRoutineContext(employeeId, courseId, sessionId),
      fetchNormalRoutinesForTeacher(employeeId, courseId, sessionId),
    ]);

    const timeTableNameIds = [
      ...new Set(normalRoutines.map((routine) => routine.timeTableNameId).filter(Boolean)),
    ];
    const electiveItemsByTableNameId = await fetchElectiveScheduleItemsForTeacher(
      employeeId,
      courseId,
      sessionId,
      timeTableNameIds,
    );

    return {
      employee,
      course,
      session,
      classSections,
      routines: normalRoutines.map((routine) => ({
        routine,
        electiveScheduleItems: electiveItemsByTableNameId.get(routine.timeTableNameId) || [],
      })),
    };
  } catch (error) {
    console.error('Error in getTeacherRoutineBundle:', error);
    throw error;
  }
}

export async function getClassSectionWithCourseRepository(classSectionsId) {
  try {
    return await scoped(model.classSectionModel).findOne({
      where: { classSectionsId: classSectionsId },
      attributes: ['classSectionsId', 'section'],
      include: [
        {
          model: model.courseModel,
          as: 'courseSection',
          attributes: ['courseId', 'courseName', 'courseCode']
        },
        {
          model: model.classModel,
          as: 'classGroup',
          attributes: ['classId', 'className', 'term']
        }

      ]
    });
  } catch (error) {
    console.error("Error in getClassSectionWithCourseRepository:", error);
    throw error;
  }
}


export async function getTodayClassScheduleForEmployee(
  employeeId,
  currentDate,
  dayString,
  sessionId
) {
  try {
    const result = await model.classScheduleModel.findAll({
      raw: true,
      nest: true,
      where: {
        [Op.or]: [
          { employeeId },
        ],
        day: dayString,
      },
      attributes: [
        'timeTableMappingId',
        'timeTableType',
        'day',
        'period',
        [
          Sequelize.literal(`(
            SELECT COUNT(*) 
            FROM attendance AS a 
            WHERE a.time_table_mapping_id = class_schedule_item.time_table_mapping_id 
              AND a.date BETWEEN '${currentDate} 00:00:00' AND '${currentDate} 23:59:59' 
              AND a.attendance_status IN ('Present')
          )`),
          'attendance'
        ]
      ],
      include: [
        {
          model: model.timeTableRoutineModel,
          as: "timeTablecreate",
          required: true,
          attributes: ['timeTableRoutineId'],
          where: {
            is_publish: true,
            startingDate: {
              [Op.lte]: currentDate
            },
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
            {
              model: model.classSectionModel,
              as: "timeTableClassSection",
              required: sessionId ? true : false,
              where: {
                ...(sessionId && { sessionId })
              },
              attributes: [
                'class',
                'section',
                'classSectionsId',
                [
                  Sequelize.literal(`(
                    SELECT COUNT(*)
                    FROM students AS s
                    WHERE s.class_sections_id = \`timeTablecreate->timeTableClassSection\`.\`class_sections_id\`
                    AND s.deleted_at IS NULL
                  )`),
                  'totalStudents'
                ]
              ]
            }
          ]
        },
        {
          model: model.timeTableStructurePeriodsModel,
          as: "timeTablecreation",
          attributes: ['periodName', 'startTime', 'endTime']
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
      ]
    });
    return result;
  } catch (error) {
    console.error("Error in getTodayClassScheduleForEmployee:", error);
    throw error;
  }
}

export async function getPastClassSchedulesForEmployee(
  employeeId,
  acedmicYearId,
  currentDate
) {
  try {
    const result = await model.classScheduleModel.findAll({
      raw: true,
      nest: true,
      where: {
        employeeId,
      },
      attributes: [
        'timeTableMappingId',
        'timeTableType',
        'day',
        'period',
        'isAttendence',
        'isSameTeacher'
      ],
      include: [
        {
          model: model.timeTableRoutineModel,
          as: "timeTablecreate",
          required: true,
          attributes: ['timeTableRoutineId', 'startingDate', 'endingDate'],
          where: {
            is_publish: true,
            acedmicYearId,
            startingDate: {
              [Op.lt]: currentDate
            },
            ...buildScope(model.timeTableRoutineModel),
          },
          include: [
            {
              model: model.courseModel,
              as: "timeTableCourse",
              attributes: ['courseName']
            },
            {
              model: model.classSectionModel,
              as: "timeTableClassSection",
              attributes: [
                'class',
                'section',
                'classSectionsId'
              ]
            }
          ]
        },
        {
          model: model.timeTableStructurePeriodsModel,
          as: "timeTablecreation",
          attributes: ['periodName', 'startTime', 'endTime']
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
    return result;
  } catch (error) {
    console.error("Error in getPastClassSchedulesForEmployee:", error);
    throw error;
  }
}

export async function getUpcomingClassSchedulesForEmployee(
  employeeId,
  acedmicYearId,
  currentDate
) {
  try {
    const result = await model.classScheduleModel.findAll({
      raw: true,
      nest: true,
      where: {
        employeeId,
      },
      attributes: [
        'timeTableMappingId',
        'timeTableType',
        'day',
        'period',
        'isAttendence'
      ],
      include: [
        {
          model: model.timeTableRoutineModel,
          as: "timeTablecreate",
          required: true,
          attributes: ['timeTableRoutineId', 'startingDate', 'endingDate'],
          where: {
            is_publish: true,
            acedmicYearId,
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
            {
              model: model.classSectionModel,
              as: "timeTableClassSection",
              attributes: [
                'class',
                'section',
                'classSectionsId'
              ]
            }
          ]
        },
        {
          model: model.timeTableStructurePeriodsModel,
          as: "timeTablecreation",
          attributes: ['periodName', 'startTime', 'endTime']
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
    return result;
  } catch (error) {
    console.error("Error in getUpcomingClassSchedulesForEmployee:", error);
    throw error;
  }
}

export async function getUniqueClassSectionSubjectsForEmployee(employeeId, acedmicYearId) {
  try {
    const schedules = await model.classScheduleModel.findAll({
      where: {
        employeeId,
      },
      include: [
        {
          model: model.timeTableRoutineModel,
          as: "timeTablecreate",
          required: true,
          where: {
            ...(acedmicYearId && { acedmicYearId }),
            ...buildScope(model.timeTableRoutineModel),
          },
          include: [
            {
              model: model.courseModel,
              as: "timeTableCourse",
              attributes: ['courseName', 'courseId']
            },
            {
              model: model.classSectionModel,
              as: "timeTableClassSection",
              attributes: ['class', 'section', 'classSectionsId']
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
          model: model.employeeModel,
          as: "employeeDetails",
          attributes: ['employeeId', 'employeeName']
        }
      ]
    });

    return schedules;
  } catch (error) {
    console.error("Error in getUniqueClassSectionSubjectsForEmployee:", error);
    throw error;
  }
}

export async function getEmployeeRecurringSchedules(employeeId, acedmicYearId) {
  try {
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
            acedmicYearId,
            ...buildScope(model.timeTableRoutineModel),
          }
        }
      ]
    });
  } catch (error) {
    console.error("Error in getEmployeeRecurringSchedules:", error);
    throw error;
  }
}
