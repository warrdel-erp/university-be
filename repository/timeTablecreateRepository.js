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

export async function getTimeTableMappingDetail(universityId) {
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
                            attributes: ["employeeName","employeeCode","pickColor"]
                        },
                        {
                            model:model.classSubjectMapperModel,
                            as: 'employeeSubject',
                            attributes: ["classSubjectMapperId"],
                            include:[
                                {
                                    model:model.subjectModel,
                                    as: 'subjects',
                                    attributes: ["subjectName","subjectCode"],
                                }
                            ]
                        }
                    ]
                },
                {
                    model:model.timeTableCreateModel,
                    as: 'timeTablecreate',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"]},
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
                }
            ]
        });
        return result;
    } catch (error) {
        console.error(`Error in getting time table create:`, error);
        throw error;
    };
};