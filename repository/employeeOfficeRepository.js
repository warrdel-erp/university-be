import * as model from '../models/index.js'

export async function addOfficeDetails(data) {
    try {
        const result = await model.employeeOfficeModel.create(data);
        return result;
    } catch (error) {
        console.error("Error in add employee office:", error);
        throw error;
    }
};