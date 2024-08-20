import * as model from '../models/index.js'

export async function addEmployeeLongLeave(data) {
    try {
        const result = await model.employeeLongLeaveModel.create(data);
        return result;
    } catch (error) {
        console.error("Error in add employee long leave:", error);
        throw error;
    }
};