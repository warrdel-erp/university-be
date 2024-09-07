import * as model from '../models/index.js'

export async function addEmployeeExperiance(data,transaction) {
    try {
        const result = await model.employeeExperianceModel.create(data,{transaction});
        return result;
    } catch (error) {
        console.error("Error in add employee experiance:", error);
        throw error;
    }
};

export async function deleteEmployeeExperiance (employeeId) {
    try {
        const result = await model.employeeExperianceModel.destroy({
            where: { employeeId },
            individualHooks: true
        });
        return { message: 'employee experiance deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};