import * as model from '../models/index.js'

export async function addEmployeeQualification(data,transaction) {
    try {
        const result = await model.employeeQualificationModel.create(data,{transaction});
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

export async function refreshEmployeeQualifications(employeeId, qualifications,createdBy, updatedBy, transaction) {
  try {
    await model.employeeQualificationModel.destroy({
      where: { employeeId },
      force: true,
      paranoid: false,
      transaction
    });

    const insertData = qualifications.map(q => ({
      employeeId,createdBy,
      updatedBy,
      ...q
    }));

    return await model.employeeQualificationModel.bulkCreate(insertData, { transaction });
  } catch (error) {
    console.error("Error refreshing employee qualifications:", error);
    throw error;
  }
}

export async function getEmployeeQualificationsByEmployeeId(employeeId) {
  try {
    return await model.employeeQualificationModel.findAll({
      where: { employeeId },
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
      paranoid: false
    });
  } catch (error) {
    console.error("Error fetching employee qualifications:", error);
    throw error;
  }
}
