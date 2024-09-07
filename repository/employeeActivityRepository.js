import * as model from '../models/index.js'

export async function addEmployeeActivity(data,transaction) {
    try {
        const result = await model.employeeActivityModel.create(data,{transaction});
        return result;
    } catch (error) {
        console.error("Error in add employee activity:", error);
        throw error;
    }
};

export async function deleteEmployeeActivity (employeeId) {
    try {
        const result = await model.employeeActivityModel.destroy({
            where: { employeeId },
            individualHooks: true
        });
        return { message: 'employee activity deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};