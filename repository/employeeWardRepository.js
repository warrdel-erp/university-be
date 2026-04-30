import * as model from '../models/index.js'

export async function addEmployeeWard(data,transaction) {
    try {
        const result = await model.employeeWardModel.create(data,{transaction});
        return result;
    } catch (error) {
        console.error("Error in add employee ward:", error);
        throw error;
    }
};

export async function deleteEmployeeWard (employeeId) {
    try {
        const result = await model.employeeWardModel.destroy({
            where: { employeeId },
            individualHooks: true
        });
        return { message: 'employee ward deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};

export async function refreshEmployeeWards(employeeId, wards,createdBy, updatedBy, transaction) {
  try {
    await model.employeeWardModel.destroy({ where: { employeeId }, transaction });

    const insertData = wards.map((w) => ({
      employeeId,
      createdBy,
      updatedBy,
     
      name: w?.name ?? null,
      relationship: w?.relationship ?? null,
      dateOfBirth: w?.dateOfBirth ?? null,
      profession: w?.profession ?? null
    }));

    return await model.employeeWardModel.bulkCreate(insertData, { transaction });
  } catch (error) {
    console.error("Error refreshing employee wards:", error);
    throw error;
  }
};