import { Op, Sequelize } from 'sequelize';
import * as model from '../models/index.js'

export async function addTimeTableCreate(data) {
  try {
    const result = await model.timeTableRoutineModel.create(data);
    return result;
  } catch (error) {
    console.error("Error in create create time table:", error);
    throw error;
  }
}

export async function getTimeTableCreateDetails(universityId) {
  try {
    const result = await model.timeTableRoutineModel.findAll({
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
//         const result = await model.timeTableRoutineModel.findAll({
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
  universityId,
  timeTableType
) {


  const whereClause = {
    ...(courseId && { courseId }),
    ...(classSectionsId && { classSectionsId }),
    ...(timeTableType && { timeTableType }),
    // ...(universityId && { universityId }),
  };
  return await model.timeTableRoutineModel.findAll({
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


export async function getSingleTimeTableCreateDetails(courseId, universityId) {
  try {
    const result = await model.timeTableRoutineModel.findAll({
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
    const result = await model.timeTableRoutineModel.update(info, {
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
    const result = await model.timeTableRoutineModel.destroy({
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

export async function checkTeacherConflictRepository(employeeId, day, startTime, endTime) {
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
        }
      ]
    });

  } catch (error) {
    console.error("Error in checkTeacherConflictRepository:", error);
    throw error;
  }
};

export async function changeTimeTableCreate(timeTableCreateId, data) {
  try {
    const result = await model.timeTableRoutineModel.update(data, {
      where: { timeTableCreateId }
    });
    return result;
  } catch (error) {
    console.error(`Error updating time table create  ${timeTableCreateId}:`, error);
    throw error;
  }
};

export async function updatetimeTableCreate(timeTableMappingId, data) {
  try {
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
    const result = await model.classScheduleModel.findOne({
      where: { timeTableMappingId: id }
    });

    return result;
  } catch (error) {
    throw new Error(`Failed to fetch mapping record for ID ${id}`);
  }
}

export async function updateMapping(id, data, transaction) {
  try {
    const result = await model.classScheduleModel.update(data, {
      where: { timeTableMappingId: id },
      transaction
    });

    return result;
  } catch (error) {
    throw new Error(`Failed to update mapping record for ID ${id}`);
  }
};

export async function getTimeTableMappingDetail(universityId, instituteId, role) {
  const whereClause = {
    ...(universityId && { universityId }),
    ...(role === 'Head' && { instituteId }),
  };
  const whereClauseData = {
    ...(role === 'Head' && { instituteId }),
  };
  try {
    const result = await model.classScheduleModel.findAll({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
      include: [
        {
          model: model.teacherSubjectMappingModel,
          as: 'timeTableTeacherSubject',
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updated", "employee_id", "class_subject_mapper_id"] },
          include: [
            {
              model: model.employeeModel,
              as: 'teacherEmployeeData',
              attributes: ["employeeName", "employeeCode", "pickColor", "employeeId"],
              where: whereClauseData
            },
            {
              model: model.classSubjectMapperModel,
              as: 'employeeSubject',
              attributes: ["classSubjectMapperId"],
              where: whereClauseData,
              include: [
                {
                  model: model.subjectModel,
                  as: 'subjects',
                  attributes: ["subjectId", "subjectName", "subjectCode"],
                  where: whereClause
                }
              ]
            }
          ]
        },
        {
          model: model.timeTableRoutineModel,
          as: 'timeTablecreate',
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
          where: whereClauseData,
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
              where: whereClause
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
              where: whereClauseData
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

export async function getTimeTableCellData(courseId, classSectionsId, universityId, instituteId, role) {
  try {
    const whereClause = {
      ...(courseId && { courseId }),
    };
    const whereClauseData = {
      ...(role === 'Head' && { instituteId }),
    };

    const result = await model.timeTableRoutineModel.findAll({
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
          attributes: { exclude: ["createdAt", "updatedAt", "createdBy", "updatedBy", "deletedAt", "teacher_subject_mapping_id", "time_table_create_id", "time_table_creation_id", "class_room_section_id", "elective_subject_id", "subject_id"] },
          include: [
            {
              model: model.timeTableStructurePeriodsModel,
              as: 'timeTablecreation',
              attributes: { exclude: ["createdAt", "updatedAt", "createdBy", "updatedBy", "deletedAt", "time_table_name_id", "course_id"] }
            },
            {
              model: model.teacherSubjectMappingModel,
              as: 'timeTableTeacherSubject',
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updated", "employee_id", "class_subject_mapper_id"] },
              include: [
                {
                  model: model.employeeModel,
                  as: 'teacherEmployeeData',
                  attributes: ["employeeName", "employeeCode", "pickColor", "employeeId"],
                  where: whereClauseData
                },
                {
                  model: model.classSubjectMapperModel,
                  as: 'employeeSubject',
                  attributes: ["classSubjectMapperId"],
                  where: whereClauseData,
                  include: [
                    {
                      model: model.subjectModel,
                      as: 'subjects',
                      attributes: ["subjectId", "subjectName", "subjectCode"],
                    }
                  ]
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

//     const result = await model.timeTableRoutineModel.findAll({
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

export async function getTeacherTimeTable(
  employeeId,
  universityId,
  instituteId,
  role
) {
  try {
    const result = await model.timeTableRoutineModel.findAll({
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
                  model: model.classSubjectMapperModel,
                  as: "employeeSubject",
                  include: [
                    {
                      model: model.subjectModel,
                      as: "subjects"
                    }
                  ]
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

    return await model.timeTableRoutineModel.findAll({
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
                  model: model.classSubjectMapperModel,
                  as: "employeeSubject",
                  include: [
                    {
                      model: model.subjectModel,
                      as: "subjects"
                    }
                  ]
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

export async function publishTimeTableRepository(timeTableCreateId) {
  try {
    const result = await model.timeTableRoutineModel.update(
      { isPublish: true },
      { where: { timeTableCreateId } }
    );

    return result;
  } catch (error) {
    console.error("Error in publishTimeTableRepository:", error);
    throw error;
  }
};

export async function ClassSubjectCount(classSectionsId) {
  try {
    return await model.classSectionModel.findOne({
      where: { classSectionsId },
      include: [
        {
          model: model.semesterModel,
          as: 'semesterDetail',
          include: [
            {
              model: model.classSubjectMapperModel,
              as: 'semestermapping',
              include: [
                {
                  model: model.subjectModel,
                  as: 'subjects'
                }
              ]
            }
          ]
        }
      ]
    });

  } catch (error) {
    console.error("Error in subject Count repository:", error);
    throw error;
  }
};

export async function timeTableData(classSectionsId) {
  try {
    return await model.timeTableRoutineModel.findAll({
      where: { classSectionsId },
      include: [
        {
          model: model.classScheduleModel,
          as: 'timeTablecreate',
          include: [
            {
              model: model.teacherSubjectMappingModel,
              as: "timeTableTeacherSubject",
              include: [
                {
                  model: model.classSubjectMapperModel,
                  as: "employeeSubject",
                  include: [
                    {
                      model: model.subjectModel,
                      as: "subjects"
                    }
                  ]
                }
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
        },
        {
          model: model.timeTableStructureModel,
          as: 'timeTableCreateName'
        }
      ]
    });

  } catch (error) {
    console.error("Error in subject Count time table repository:", error);
    throw error;
  }
};