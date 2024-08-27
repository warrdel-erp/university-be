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

export async function getTeacherSubjectMapping(employeeId) {
    console.log(`>>>>>getTeacherSubjectMapping>>>>>>>>>>>>>>>`,employeeId);
    
    let result;
    try {
        if (employeeId !== 0) {
            result = await model.teacherSubjectMappingModel.findAll({
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                where: {
                    employeeId:employeeId
                },
            });
        } else {
            result = await model.teacherSubjectMappingModel.findAll({
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            });
        };
        return result;
    } catch (error) {
        console.error(`Error in getting employee code and types${employeeId}:`, error);
        throw error;
    };
};