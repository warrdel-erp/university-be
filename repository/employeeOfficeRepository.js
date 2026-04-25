import * as model from '../models/index.js'

export async function addOfficeDetails(data,transaction) {
    try {
        const result = await model.employeeOfficeModel.create(data,{transaction});
        return result;
    } catch (error) {
        console.error("Error in add employee office:", error);
        throw error;
    }
};

export async function updateOfficeDetails(employeeId, data, transaction) {
  try {
    return await model.employeeOfficeModel.update(
      data,
      { where: { employeeId }, transaction, paranoid: false }
    );
  } catch (error) {
    console.error("Error updating employee office details:", error);
    throw error;
  }
}

export async function updateOfficeDetailsById(employeeOfficeId, data, transaction) {
  try {
    return await model.employeeOfficeModel.update(
      data,
      { where: { employeeOfficeId }, transaction, paranoid: false }
    );
  } catch (error) {
    console.error("Error updating employee office details by id:", error);
    throw error;
  }
}

export async function getEmployeeOfficeByEmployeeId(employeeId) {
  try {
    return await model.employeeOfficeModel.findOne({
      where: { employeeId },
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
      paranoid: false,
    });
  } catch (error) {
    console.error("Error fetching employee office details:", error);
    throw error;
  }
}


export async function deleteEmployeeOffice (employeeId) {
    try {
        const result = await model.employeeOfficeModel.destroy({
            where: { employeeId },
            individualHooks: true
        });
        return { message: 'employee office details deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};