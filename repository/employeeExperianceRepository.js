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

export async function refreshEmployeeExperiences(employeeId, experiences,createdBy, updatedBy, transaction) {
  try {
    await model.employeeExperianceModel.destroy({
      where: { employeeId },
      force: true,
      paranoid: false,
      transaction
    });

    const insertData = experiences.map(exp => ({
      employeeId,createdBy,
      updatedBy,
      ...exp
    }));

    return await model.employeeExperianceModel.bulkCreate(insertData, { transaction });
  } catch (error) {
    console.error("Error refreshing employee experiences:", error);
    throw error;
  }
}

export async function getEmployeeExperiencesByEmployeeId(employeeId) {
  try {
    return await model.employeeExperianceModel.findAll({
      where: { employeeId },
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
      paranoid: false
    });
  } catch (error) {
    console.error("Error fetching employee experiences:", error);
    throw error;
  }
}
