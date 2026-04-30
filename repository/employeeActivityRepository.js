import * as model from '../models/index.js'
import { Op } from 'sequelize';

export async function addEmployeeActivity(data,transaction) {
    try {
        const result = await model.employeeActivityModel.create(data,{transaction});
        return result;
    } catch (error) {
        console.error("Error in add employee activity:", error);
        throw error;
    }
};

export async function deleteEmployeeActivity (employeeId) {
    try {
        const result = await model.employeeActivityModel.destroy({
            where: { employeeId },
            individualHooks: true
        });
        return { message: 'employee activity deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};

export async function refreshEmployeeActivities(employeeId, activities,createdBy, updatedBy, transaction) {
  try {
    await model.employeeActivityModel.destroy({
      where: { employeeId },
      transaction
    });

    const insertData = activities.map((a) => ({
      employeeId,
      createdBy,
      updatedBy,
     
      activity: a?.activity ?? a?.activityName ?? null,
      monthYear: a?.monthYear ?? a?.date ?? null,
      remarks: a?.remarks ?? a?.description ?? null
    }));

    return await model.employeeActivityModel.bulkCreate(insertData, { transaction });
  } catch (error) {
    console.error("Error refreshing employee activities:", error);
    throw error;
  }
};

export async function getEmployeeActivitiesByEmployeeId(employeeId) {
  try {
    return await model.employeeActivityModel.unscoped().findAll({
      where: { employeeId },
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
    });
  } catch (error) {
    console.error("Error fetching employee activities:", error);
    throw error;
  }
};