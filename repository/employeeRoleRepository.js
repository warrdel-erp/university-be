import * as model from '../models/index.js'

export async function addEmployeeRole(data,transaction) {
    try {
        const result = await model.emplopeeRoleModel.create(data,{transaction});
        return result;
    } catch (error) {
        console.error("Error in add employee role:", error);
        throw error;
    }
};

export async function deleteEmployeeRole (employeeId) {
    try {
        const result = await model.emplopeeRoleModel.destroy({
            where: { employeeId },
            individualHooks: true
        });
        return { message: 'employee role deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};