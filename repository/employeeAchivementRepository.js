import * as model from '../models/index.js'

export async function addEmployeeAchievement(data,transaction) {
    try {
        const result = await model.employeeAchievementModel.create(data,{transaction});
        return result;
    } catch (error) {
        console.error("Error in add employee achievement:", error);
        throw error;
    }
};

export async function deleteEmployeeAchievement (employeeId) {
    try {
        const result = await model.employeeAchievementModel.destroy({
            where: { employeeId },
            individualHooks: true
        });
        return { message: 'employee achievement deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};