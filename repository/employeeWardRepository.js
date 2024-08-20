import * as model from '../models/index.js'

export async function addEmployeeWard(data) {
    try {
        const result = await model.employeeWardModel.create(data);
        return result;
    } catch (error) {
        console.error("Error in add employee ward:", error);
        throw error;
    }
};