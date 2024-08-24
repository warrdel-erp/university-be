import * as model from '../models/index.js'

export async function addOfficeDetails(data) {
    try {
        const result = await model.employeeOfficeModel.create(data);
        return result;
    } catch (error) {
        console.error("Error in add employee office:", error);
        throw error;
    }
};

export async function deleteEmployeeOffice (employeeId) {
    try {
        const result = await model.employeeOfficeModel.destroy({
            where: { employeeId },
            individualHooks: true
        });
        return { message: 'employee office details deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};