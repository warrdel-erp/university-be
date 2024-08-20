import * as model from '../models/index.js'

export async function addEmployeeDocuments(data) {
    try {
        const result = await model.employeeDocumentsModel.create(data);
        return result;
    } catch (error) {
        console.error("Error in add employee documents:", error);
        throw error;
    }
};