import * as model from '../models/index.js'

export async function addEmployeeLongLeave(data,transaction) {
    try {
        const result = await model.employeeLongLeaveModel.create(data,{transaction});
        return result;
    } catch (error) {
        console.error("Error in add employee long leave:", error);
        throw error;
    }
};

export async function deleteEmployeeLongLeave (employeeId) {
    try {
        const result = await model.emplopeeRoleModel.destroy({
            where: { employeeId },
            individualHooks: true
        });
        return { message: 'employee long leave deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};

export async function refreshEmployeeLongLeaves(employeeId, longLeaves,createdBy, updatedBy, transaction) {
  try {
    await model.employeeLongLeaveModel.destroy({ where: { employeeId }, transaction });

    const insertData = longLeaves.map(l => ({
      employeeId,createdBy,
      updatedBy,
      ...l
    }));

    return await model.employeeLongLeaveModel.bulkCreate(insertData, { transaction });
  } catch (error) {
    console.error("Error refreshing employee long leaves:", error);
    throw error;
  }
};