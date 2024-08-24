import * as model from '../models/index.js'

export async function addEmployeeWard(data) {
    try {
        const result = await model.employeeWardModel.create(data);
        return result;
    } catch (error) {
        console.error("Error in add employee ward:", error);
        throw error;
    }
};

export async function deleteEmployeeWard (employeeId) {
    try {
        const result = await model.employeeWardModel.destroy({
            where: { employeeId },
            individualHooks: true
        });
        return { message: 'employee ward deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};