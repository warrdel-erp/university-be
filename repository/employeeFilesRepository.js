import * as model from '../models/index.js'

export async function addEmployeeFiles(data,transaction) {
    try {
        const result = await model.employeeFilesModel.create(data,{transaction});
        return result;
    } catch (error) {
        console.error("Error in add employee Files:", error);
        throw error;
    }
};