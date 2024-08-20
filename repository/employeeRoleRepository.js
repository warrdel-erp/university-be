import * as model from '../models/index.js'

export async function addEmployeeRole(data) {
    try {
        const result = await model.emplopeeRoleModel.create(data);
        return result;
    } catch (error) {
        console.error("Error in add employee role:", error);
        throw error;
    }
};