import * as model from '../models/index.js'

export async function addEmployeeReference(data) {
    try {
        const result = await model.employeeReferenceModel.create(data);
        return result;
    } catch (error) {
        console.error("Error in add employee reference:", error);
        throw error;
    }
};