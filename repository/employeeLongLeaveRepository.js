import * as model from '../models/index.js'

export async function addEmployeeLongLeave(data,transaction) {
    try {
        const result = await model.employeeLongLeaveModel.create(data,{transaction});
        return result;
    } catch (error) {
        console.error("Error in add employee long leave:", error);
        throw error;
    }
};

export async function deleteEmployeeLongLeave (employeeId) {
    try {
        const result = await model.emplopeeRoleModel.destroy({
            where: { employeeId },
            individualHooks: true
        });
        return { message: 'employee long leave deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};