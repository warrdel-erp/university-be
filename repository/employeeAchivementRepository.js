import * as model from '../models/index.js'

export async function addEmployeeAchievement(data) {
    try {
        const result = await model.employeeAchievementModel.create(data);
        return result;
    } catch (error) {
        console.error("Error in add employee achievement:", error);
        throw error;
    }
};