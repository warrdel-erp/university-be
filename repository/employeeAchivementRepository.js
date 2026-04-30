import * as model from '../models/index.js'
import { Op } from 'sequelize';

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

export async function refreshEmployeeAchievements(employeeId, achievements,createdBy, updatedBy, transaction) {
  try {
    await model.employeeAchievementModel.destroy({
      where: { employeeId },
      transaction
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
      date: a?.date ?? null
    }));

    return await model.employeeAchievementModel.bulkCreate(insertData, { transaction });
  } catch (error) {
    console.error("Error refreshing employee achievements:", error);
    throw error;
  }
};

export async function getEmployeeAchievementsByEmployeeId(employeeId) {
  try {
    return await model.employeeAchievementModel.unscoped().findAll({
      where: { employeeId },
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
    });
  } catch (error) {
    console.error("Error fetching employee achievements:", error);
    throw error;
  }
};