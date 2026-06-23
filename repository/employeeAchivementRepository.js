import * as model from '../models/index.js';
import { scoped } from '../utility/scoped.js';

async function assertScopedEmployee(employeeId, transaction) {
    return scoped(model.employeeModel).findOne({
        where: { employeeId },
        attributes: ['employeeId'],
        transaction,
    });
}

export async function addEmployeeAchievement(data, transaction) {
    try {
        const employee = await assertScopedEmployee(data.employeeId, transaction);
        if (!employee) {
            throw new Error('Employee not found');
        }
        return await model.employeeAchievementModel.create(data, { transaction });
    } catch (error) {
        console.error("Error in add employee achievement:", error);
        throw error;
    }
};

export async function deleteEmployeeAchievement(employeeId) {
    try {
        const employee = await assertScopedEmployee(employeeId);
        if (!employee) {
            throw new Error('Employee not found');
        }
        await model.employeeAchievementModel.destroy({
            where: { employeeId },
            individualHooks: true,
        });
        return { message: 'employee achievement deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};

export async function refreshEmployeeAchievements(employeeId, achievements, createdBy, updatedBy, transaction) {
    try {
        const employee = await assertScopedEmployee(employeeId, transaction);
        if (!employee) {
            throw new Error('Employee not found');
        }

        await model.employeeAchievementModel.destroy({
            where: { employeeId },
            transaction,
        });

        const insertData = achievements.map((a) => ({
            employeeId,
            createdBy,
            updatedBy,
            achievementCategory: a?.achievementCategory ?? a?.achievement_category ?? null,
            title: a?.title ?? null,
            description: a?.description ?? null,
            noOfTimes: a?.noOfTimes ?? null,
            discipline: a?.discipline ?? null,
            nameOf: a?.nameOf ?? null,
            date: a?.date ?? null,
        }));

        return await model.employeeAchievementModel.bulkCreate(insertData, { transaction });
    } catch (error) {
        console.error("Error refreshing employee achievements:", error);
        throw error;
    }
};

export async function getEmployeeAchievementsByEmployeeId(employeeId) {
    try {
        const employee = await assertScopedEmployee(employeeId);
        if (!employee) {
            return [];
        }
        return await model.employeeAchievementModel.findAll({
            where: { employeeId },
            attributes: { exclude: ["createdAt", "updatedAt"] },
        });
    } catch (error) {
        console.error("Error fetching employee achievements:", error);
        throw error;
    }
};
