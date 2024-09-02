import * as model from '../models/index.js'
import { Op } from 'sequelize';

export async function teacherSectionMapping(data) {    
    try {
        const result = await model.teacherSectionMappingModel.create(data);
        return result;
    } catch (error) {
        console.error("Error in student mapping course:", error);
        throw error;
    }
};

export async function getTeacherSectionMapping(employeeId,universityId) {
    console.log(`>>>>>getTeacherSectionMapping>>>>>>`,employeeId);
    
    let result;
    try {
        if (employeeId !== 0) {
            result = await model.teacherSectionMappingModel.findAll({
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                include: [
                    {
                        model: model.userModel,
                        as: "userTeacherSectionMapping",
                        attributes:["universityId","userId"],
                        where: {
                            universityId:universityId
                        },                    
                    },
                    {
                        model: model.employeeModel,
                        as: "employeeData",
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
                        model: model.classSectionModel,
                        as: "employeeSection",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                        include:[
                            {
                                model:model.courseModel,
                                as:"employeeCourse",
                                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                            }
                        ]
                    }
                ],
                where: {
                    employeeId:employeeId
                },
            });
        } else {
            result = await model.teacherSectionMappingModel.findAll({
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                include: [
                    {
                        model: model.userModel,
                        as: "userTeacherSectionMapping",
                        attributes:["universityId","userId"],
                        where: {
                            universityId:universityId
                        },                    
                    },
                    {
                        model: model.employeeModel,
                        as: "employeeData",
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
                        model: model.classSectionModel,
                        as: "employeeSection",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                        include:[
                            {
                                model:model.courseModel,
                                as:"employeeCourse",
                                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                            }
                        ]
                    }
                ],
            });
        };
        return result;
    } catch (error) {
        console.error(`Error in getting employee code and types${employeeId}:`, error);
        throw error;
    };
};