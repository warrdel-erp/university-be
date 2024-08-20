import * as model from '../models/index.js'

export async function addAddress(data) {
    try {
        const result = await model.employeeAddressModel.create(data);
        return result;
    } catch (error) {
        console.error("Error in add employee address:", error);
        throw error;
    }
};