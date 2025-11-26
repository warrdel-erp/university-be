import { Op } from 'sequelize';
import * as model from '../models/index.js'

export async function addTimeTableCreate(data,transaction) {
    try {
        const result = await model.timeTableCreateModel.create(data,{transaction});
        return result;
    } catch (error) {
        console.error("Error in create create time table:", error);
        throw error;
    }
}

export async function getTimeTableCreateDetails(universityId) {
    try {
        const result = await model.timeTableCreateModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
            include:[
                {
                    model:model.timeTableNameModel,
                    as:"timeTableCreateName",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updated"]},
                    include:[
                        {
                            model:model.timeTableCreationModel,
                            as:"timeTableName",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updated"]}
                        }
                    ]
                },
                {
                    model:model.courseModel,
                    as: 'timeTableCourse',
                    attributes: ["courseName"],
                },
                {
                    model:model.campusModel,
                    as: 'timeTableCampus',
                    attributes: ["campusName"],
                },
                {
                    model:model.classSectionModel,
                    as: 'timeTableClassSection',
                    attributes: ["section","class","section_id","class_sections_id"],
                    include:[
                        {
                            model:model.sessionModel,
                            as:'classSession',
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                        }
                    ]
                },
                {
                    model:model.acedmicYearModel,
                    as: 'acedmicYearTimeTable',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                },
            ]
        });
        return result;
    } catch (error) {
        console.error(`Error in getting time table create:`, error);
        throw error;
    };
};

export async function getSingleTimeTableCreateDetails(courseId,universityId) {    
    try {
        const result = await model.timeTableCreateModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            include:[
                {
                    model:model.timeTableNameModel,
                    as:"timeTableCreateName",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updated"]},
                    include:[
                        {
                            model:model.timeTableCreationModel,
                            as:"timeTableName",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updated"]}
                        }
                    ]
                },
                {
                    model:model.courseModel,
                    as: 'timeTableCourse',
                    attributes: ["courseName"],
                },
                {
                    model:model.campusModel,
                    as: 'timeTableCampus',
                    attributes: ["campusName"],
                },
                {
                    model:model.classSectionModel,
                    as: 'timeTableClassSection',
                    attributes: ["section","class","section_id","class_sections_id"],
                },
                {
                    model:model.acedmicYearModel,
                    as: 'acedmicYearTimeTable',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                },
            ],
            where:{
                courseId:courseId,
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
        const result = await model.timeTableCreateModel.update(info, {
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

export async function deleteTimeTableCreate (faculityLoadId) {
    try {
        const result = await model.timeTableCreateModel.destroy({
            where: { faculityLoadId },
            individualHooks: true
        });
        return { message: `faculity load deleted successfully for time Table Creation Id :-${faculityLoadId}` };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};

export async function addtimeTableMapping(data,transaction) {
    try {
        const result = await model.timeTableMappingModel.create(data,{transaction});
        return result;
    } catch (error) {
        console.error("Error in create mapping of time table:", error);
        throw error;
    }
};

export async function getPeriodInfoRepository(timeTableCreationId) {
  try {
    return await model.timeTableCreationModel.findOne({
      where: { timeTableCreationId },
      attributes: ["startTime", "endTime", "periodLength"]
    });
  } catch (error) {
    console.error("Error in getPeriodInfoRepository:", error);
    throw error;
  }
}

export async function checkTeacherConflictRepository(employeeId, day, startTime, endTime) {
  try {
    return await model.timeTableMappingModel.findOne({
      where: {
        employeeId,
        day
      },
      include: [
        {
          model: model.timeTableCreationModel,
          as: "timeTablecreation",
          attributes: ["startTime", "endTime"],
          where: {
            [Op.or]: [
              { startTime: { [Op.between]: [startTime, endTime] } },
              { endTime: { [Op.between]: [startTime, endTime] } },
              {
                [Op.and]: [
                  { startTime: { [Op.lte]: startTime } },
                  { endTime: { [Op.gte]: endTime } }
                ]
              }
            ]
          }
        }
      ]
    });
  } catch (error) {
    console.error("Error in checkTeacherConflictRepository:", error);
    throw error;
  }
}


export async function updatetimeTableCreate(timeTableMappingId, data) {
    try {
        const result = await model.timeTableMappingModel.update(data, {
            where: { timeTableMappingId }
        });
        return result; 
    } catch (error) {
        console.error(`Error updating time table type  ${timeTableMappingId}:`, error);
        throw error; 
    }
};

export async function getTimeTableMappingDetail(universityId,instituteId,role) {
        const whereClause = {
            ...(universityId && { universityId }),
            ...(role === 'Head' && { instituteId }),
        };
        const whereClauseData = {
            ...(role === 'Head' && { instituteId }),
        };
    try {
        const result = await model.timeTableMappingModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
            include:[
                {
                    model:model.teacherSubjectMappingModel,
                    as: 'timeTableTeacherSubject',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updated","employee_id","class_subject_mapper_id"]},
                    include:[
                        {
                            model:model.employeeModel,
                            as: 'teacherEmployeeData',
                            attributes: ["employeeName","employeeCode","pickColor","employeeId"],
                            where:whereClauseData
                        },
                        {
                            model:model.classSubjectMapperModel,
                            as: 'employeeSubject',
                            attributes: ["classSubjectMapperId"],
                            where:whereClauseData,
                            include:[
                                {
                                    model:model.subjectModel,
                                    as: 'subjects',
                                    attributes: ["subjectId","subjectName","subjectCode"],
                                    where:whereClause
                                }
                            ]
                        }
                    ]
                },
                {
                    model:model.timeTableCreateModel,
                    as: 'timeTablecreate',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"]},
                    where:whereClauseData,
                    include:[
                        {
                            model:model.timeTableNameModel,
                            as:"timeTableCreateName",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"]},
                            include:[
                                {
                                    model:model.timeTableCreationModel,
                                    as:"timeTableName",
                                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"]}
                                }
                            ]
                        },
                        {
                            model:model.courseModel,
                            as: 'timeTableCourse',
                            attributes: ["courseName"],
                            where:whereClause
                        },
                        {
                            model:model.campusModel,
                            as: 'timeTableCampus',
                            attributes: ["campusName"],
                        },
                        {
                            model:model.classSectionModel,
                            as: 'timeTableClassSection',
                            attributes: ["section","class","section_id","class_sections_id"],
                            where:whereClauseData
                        },
                        {
                            model:model.acedmicYearModel,
                            as: 'acedmicYearTimeTable',
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                        },
                    ],
                },
                {
                    model:model.classRoomModel,
                    as: 'classRoom',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"]}
                },
                {
                    model:model.electiveSubjectModel,
                    as: 'timeTableElective',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"]}
                },
                {
                    model:model.subjectModel,
                    as: 'timeTableSubject',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"]}
                },
                {
                    model:model.employeeModel,
                    as: 'employeeDetails',
                    attributes:  ["employeeName","employeeCode","pickColor","employeeId"]
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

    const result = await model.timeTableCreateModel.findAll({
      attributes: {
        exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy","time_table_name_id","course_id","campus_id","class_sections_id","acedmic_year_id"],
      },
      where: whereClause,
      include:[
        {
            model:model.courseModel,
            as:'timeTableCourse',
            attributes:{exclude:["createdAt","updatedAt","createdBy","deletedAt","affiliated_university_id","institute_id","acedmic_year_id"]}
        },
        {
            model:model.classSectionModel,
            as:'timeTableClassSection',
            attributes:{exclude:["createdAt","updatedAt","createdBy","deletedAt","course_id","semester_id","class_id","acedmic_year_id","specialization_id","session_id"]}
        },
        {
            model:model.timeTableMappingModel,
            as:'timeTablecreate',
            attributes:{exclude:["createdAt","updatedAt","createdBy","updatedBy","deletedAt","teacher_subject_mapping_id","time_table_create_id","time_table_creation_id","class_room_section_id","elective_subject_id","subject_id"]},
            include:[
                {
                    model:model.timeTableCreationModel,
                    as:'timeTablecreation',
                    attributes:{exclude:["createdAt","updatedAt","createdBy","updatedBy","deletedAt","time_table_name_id","course_id"]}
                },
                {
                    model:model.teacherSubjectMappingModel,
                    as: 'timeTableTeacherSubject',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updated","employee_id","class_subject_mapper_id"]},
                    include:[
                        {
                            model:model.employeeModel,
                            as: 'teacherEmployeeData',
                            attributes: ["employeeName","employeeCode","pickColor","employeeId"],
                            where:whereClauseData
                        },
                        {
                            model:model.classSubjectMapperModel,
                            as: 'employeeSubject',
                            attributes: ["classSubjectMapperId"],
                            where:whereClauseData,
                            include:[
                                {
                                    model:model.subjectModel,
                                    as: 'subjects',
                                    attributes: ["subjectId","subjectName","subjectCode"],
                                }
                            ]
                        },
                        
                    ]
                },
                {
                            model:model.classRoomModel,
                            as: 'classRoom',
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy","floor_id"]}
                        },
                        {
                            model:model.electiveSubjectModel,
                            as: 'timeTableElective',
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"]}
                        },
                        {
                            model:model.subjectModel,
                            as: 'timeTableSubject',
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"]}
                        },
                        {
                            model:model.employeeModel,
                            as: 'employeeDetails',
                            attributes:  ["employeeName","employeeCode","pickColor","employeeId"]
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

export async function getTeacherTimeTable(employeeId) {
  try {

    const teacherWhere = { employeeId };

    const result = await model.timeTableCreateModel.findAll({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
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
          model: model.timeTableMappingModel,
          as: "timeTablecreate",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
          required: true,   
          include: [
            {
              model: model.timeTableCreationModel,
              as: "timeTablecreation"
            },
            

            //  ELECTIVE SUBJECT FLOW
            {
              model: model.teacherSubjectMappingModel,
              as: "timeTableTeacherSubject",
              required: false,
              where: teacherWhere,
              include: [
                {
                  model: model.employeeModel,
                  as: "teacherEmployeeData",
                  attributes: ["employeeId", "employeeName", "employeeCode", "pickColor"],
                  where: teacherWhere
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

            //  NORMAL SUBJECT FLOW
            {
              model: model.employeeModel,
              as: "employeeDetails",
              attributes: ["employeeId", "employeeName", "employeeCode", "pickColor"],
              required: false,
              where: teacherWhere
            },

            // SUBJECT DIRECT
            {
              model: model.subjectModel,
              as: "timeTableSubject"
            },

            // ELECTIVE DIRECT SUBJECT
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
};

export async function getStudentTimeTableRepository(classSectionsId, subjectIds) {
  try {

    return await model.timeTableCreateModel.findAll({
        where:{
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
          model: model.timeTableMappingModel,
          as: "timeTablecreate",
          required: true,
          where: {
            // class_sections_id: classSectionsId,
            subject_id: subjectIds
          },
          include: [
            {
              model: model.timeTableCreationModel,
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
    const result = await model.timeTableCreateModel.update(
      { isPublish: true },
      { where: { timeTableCreateId } }
    );

    return result;
  } catch (error) {
    console.error("Error in publishTimeTableRepository:", error);
    throw error;
  }
}