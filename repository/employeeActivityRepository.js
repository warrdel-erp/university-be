import * as model from '../models/index.js'

export async function addEmployeeActivity(data) {
    try {
        const result = await model.employeeActivityModel.create(data);
        return result;
    } catch (error) {
        console.error("Error in add employee activity:", error);
        throw error;
    }
};