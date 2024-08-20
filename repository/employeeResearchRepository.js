import * as model from '../models/index.js'

export async function addEmployeeResearch(data) {
    try {
        const result = await model.employeeResearchModel.create(data);
        return result;
    } catch (error) {
        console.error("Error in add employee research:", error);
        throw error;
    }
};