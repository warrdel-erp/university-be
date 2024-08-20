import * as model from '../models/index.js'

export async function addEmployeeQualification(data) {
    try {
        const result = await model.employeeQualificationModel.create(data);
        return result;
    } catch (error) {
        console.error("Error in add employee qualification:", error);
        throw error;
    }
};