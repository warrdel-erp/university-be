import * as model from '../models/index.js'

export async function addEmployeeReference(data,transaction) {
    try {
        const result = await model.employeeReferenceModel.create(data,{transaction});
        return result;
    } catch (error) {
        console.error("Error in add employee reference:", error);
        throw error;
    }
};

export async function deleteEmployeeReference (employeeId) {
    try {
        const result = await model.employeeReferenceModel.destroy({
            where: { employeeId },
            individualHooks: true
        });
        return { message: 'employee reference deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};

export async function refreshEmployeeReferences(employeeId, references,createdBy, updatedBy, transaction) {
  try {
    await model.employeeReferenceModel.destroy({ where: { employeeId }, transaction });

    const insertData = references.map(r => ({
      employeeId,createdBy,
      updatedBy,
      ...r
    }));

    return await model.employeeReferenceModel.bulkCreate(insertData, { transaction });
  } catch (error) {
    console.error("Error refreshing employee references:", error);
    throw error;
  }
};