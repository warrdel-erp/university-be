import * as model from '../models/index.js'

export async function addEmployeeSkill(data) {
    try {
        const result = await model.employeeSkillModel.create(data);
        return result;
    } catch (error) {
        console.error("Error in add employee skill:", error);
        throw error;
    }
};