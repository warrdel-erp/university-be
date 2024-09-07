import * as model from '../models/index.js'

export async function addEmployeeDocuments(data,transaction) {
    try {
        const result = await model.employeeDocumentsModel.create(data,transaction);
        return result;
    } catch (error) {
        console.error("Error in add employee documents:", error);
        throw error;
    }
};

export async function deleteEmployeeDocuments (employeeId) {
    try {
        const result = await model.employeeDocumentsModel.destroy({
            where: { employeeId },
            individualHooks: true
        });
        return { message: 'employee role deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};