import * as model from '../models/index.js'

export async function addEmployeeExperiance(data) {
    try {
        const result = await model.employeeExperianceModel.create(data);
        return result;
    } catch (error) {
        console.error("Error in add employee experiance:", error);
        throw error;
    }
};