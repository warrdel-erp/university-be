import * as model from '../models/index.js'
import { Op } from 'sequelize';

export async function teacherSubjectMapping(data) {    
    try {
        const result = await model.teacherSubjectMappingModel.create(data);
        return result;
    } catch (error) {
        console.error("Error in teacher Subject Mapping:", error);
        throw error;
    }
};

export async function getTeacherSubjectMapping(employeeId,universityId) {
    
    let result;
    try {
        if (employeeId !== 0) {
            result = await model.teacherSubjectMappingModel.findAll({
                include: [
                    {
                        model: model.userModel,
                        as: "userTeacherSubjectMapping",
                        attributes:["universityId","userId"],
                        where: {
                            universityId:universityId
                        },                    
                    },
                    {
                        model: model.employeeModel,
                        as: "teacherEmployeeData",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                        include: [
                            {
                                model: model.campusModel,
                                as: "employeeCampus",
                                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId","campusId","campusCode"] },
                            },
                            {
                                model: model.instituteModel,
                                as: "employeeInstitute",
                                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId","instituteId","campusId","instituteCode"] },
                            },
                        ]    
                    },
                    {
                        model: model.classSubjectMapperModel,
                        as: "employeeSubject",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                        include:[
                            {
                                model:model.classSectionModel,
                                as:"employeeClassSection",
                                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                            }
                        ]
                    }
                ],
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                where: {
                    employeeId:employeeId
                },
            });
        } else {
            result = await model.teacherSubjectMappingModel.findAll({
                include: [
                    {
                        model: model.userModel,
                        as: "userTeacherSubjectMapping",
                        attributes:["universityId","userId"],
                        where: {
                            universityId:universityId
                        },                    
                    },
                    {
                        model: model.employeeModel,
                        as: "teacherEmployeeData",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                        include: [
                            {
                                model: model.campusModel,
                                as: "employeeCampus",
                                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId","campusId","campusCode"] },
                            },
                            {
                                model: model.instituteModel,
                                as: "employeeInstitute",
                                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId","instituteId","campusId","instituteCode"] },
                            },
                        ]    
                    },
                    {
                        model: model.classSubjectMapperModel,
                        as: "employeeSubject",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                        include:[
                            {
                                model:model.classSectionModel,
                                as:"employeeClassSection",
                                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                            }
                        ]
                    }
                ],
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            });
        };
        return result;
    } catch (error) {
        console.error(`Error in getting employee code and types${employeeId}:`, error);
        throw error;
    };
};

export async function updateTeachersSubjectMapping(teacherSubjectMappingId, info) {
    
    try {
        const result = await model.teacherSubjectMappingModel.update(info, {
            where: {
                teacherSubjectMappingId: teacherSubjectMappingId
            },
        });
        
        return result; 
    } catch (error) {
        console.error(`Error updating teacher subject mapping details ${teacherSubjectMappingId}:`, error);
        throw error; 
    }
};

export async function deleteTeachersSubjectMapping (teacherSubjectMappingId) {
    try {
        const result = await model.teacherSubjectMappingModel.destroy({
            where: { teacherSubjectMappingId },
            individualHooks: true
        });
        return { message: 'teacher Subject Mapping deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};

export async function getTeacherDetailsByTeacherSubjectId(teacherSubjectMappingId) {
    try {
        const result = await model.teacherSubjectMappingModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            where:{
                teacherSubjectMappingId:teacherSubjectMappingId,
            }
        });
        return result;
    } catch (error) {
        console.error(`Error in getting teacher details by teacher subject mapper id ${teacherSubjectMappingId}:`, error);
        throw error;
    };
};