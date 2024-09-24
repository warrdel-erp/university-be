import * as model from '../models/index.js'

export async function addAddress(data,transaction) {
    try {
        const result = await model.employeeAddressModel.create(data,{transaction});
        return result;
    } catch (error) {
        console.error("Error in add employee address:", error);
        throw error;
    }
};

export async function addCorsAddress(data,transaction) {
    
    try {
        const result = await model.employeeCorAddressModel.create(data,{transaction});
        return result;
    } catch (error) {
        console.error("Error in adding cors address:", error);
        throw error;
    }
};

export async function deleteEmployeeAddress (employeeId) {
    try {
        const result = await model.employeeAddressModel.destroy({
            where: { employeeId },
            individualHooks: true
        });
        return { message: 'employee address deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};