import * as model from '../models/index.js'

export async function addTimeTableCreate(data,transaction) {
    try {
        const result = await model.timeTableCreateModel.create(data,{transaction});
        return result;
    } catch (error) {
        console.error("Error in create faculity load:", error);
        throw error;
    }
}

export async function getTimeTableCreateDetails(universityId) {
    try {
        const result = await model.timeTableCreateModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
            include:[
                {
                    model:model.timeTableCreationModel,
                    as: 'timeTable',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                } ,
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
                    attributes: ["section","class","section_id"],
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
        const result = await model.timeTableCreationModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            include:[
                {
                    model:model.courseModel,
                    as: 'timeTableCourse',
                    attributes: ["courseId","courseName","courseCode","capacity"],
                },
                {
                    model:model.timeTableCreateModel,
                    as: 'timeTableCreate',
                    attributes: ["timeTableCreateId","teacherSubjectMappingId", "createdBy","day","period"],
                    include:[
                        {
                            model:model.teacherSubjectMappingModel,
                            as: 'timeTableTeacherSubjectMapping',
                            attributes: ["employeeId","classSubjectMapperId"],
                            include:[
                                {
                                    model:model.employeeModel,
                                    as: 'teacherEmployeeData',
                                    attributes: ["employeeId","employeeCode","employeeName","shortName","pickColor"],
                                },
                                {
                                    model:model.classSubjectMapperModel,
                                    as: 'employeeSubject',
                                    attributes: ["subjectId"],
                                    include:[
                                        {
                                            model:model.subjectModel,
                                            as:'subjects',
                                            attributes:["subjectName","subjectCode"]
                                        }
                                    ]
                                },
                            ]
                        },
                        {
                            model:model.teacherSectionMappingModel,
                            as: 'timeTableTeacherSectionMapping',
                            attributes: ["employeeId","classSectionsId","teacherSectionMappingId"],
                            include:[
                                {
                                    model:model.classSectionModel,
                                    as: 'employeeSection',
                                    attributes: ["section"],
                                }
                            ]
                        }
                    ]
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