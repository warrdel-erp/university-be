import * as model from '../models/index.js'

export async function addEmployeeQualification(data,transaction) {
    try {
        const result = await model.employeeQualificationModel.create(data,transaction);
        return result;
    } catch (error) {
        console.error("Error in add employee qualification:", error);
        throw error;
    }
};

export async function deleteEmployeeQualification (employeeId) {
    try {
        const result = await model.employeeQualificationModel.destroy({
            where: { employeeId },
            individualHooks: true
        });
        return { message: 'employee qualification deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};