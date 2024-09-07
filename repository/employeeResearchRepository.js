import * as model from '../models/index.js'

export async function addEmployeeResearch(data,transaction) {
    try {
        const result = await model.employeeResearchModel.create(data,{transaction});
        return result;
    } catch (error) {
        console.error("Error in add employee research:", error);
        throw error;
    }
};

export async function deleteEmployeeResearch (employeeId) {
    try {
        const result = await model.emplopeeRoleModel.destroy({
            where: { employeeId },
            individualHooks: true
        });
        return { message: 'employee research deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};