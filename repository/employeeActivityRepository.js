import * as model from '../models/index.js'

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
      force: true,
      paranoid: false,
      transaction
    });

    const insertData = activities.map(a => ({
      employeeId,createdBy,
      updatedBy,
      ...a
    }));

    return await model.employeeActivityModel.bulkCreate(insertData, { transaction });
  } catch (error) {
    console.error("Error refreshing employee activities:", error);
    throw error;
  }
};

export async function getEmployeeActivitiesByEmployeeId(employeeId) {
  try {
    return await model.employeeActivityModel.findAll({
      where: { employeeId },
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
      paranoid: false
    });
  } catch (error) {
    console.error("Error fetching employee activities:", error);
    throw error;
  }
};