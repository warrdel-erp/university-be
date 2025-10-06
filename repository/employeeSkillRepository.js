import * as model from '../models/index.js'

export async function addEmployeeSkill(data,transaction) {
    try {
        const result = await model.employeeSkillModel.create(data,{transaction});
        return result;
    } catch (error) {
        console.error("Error in add employee skill:", error);
        throw error;
    }
};

export async function deleteEmployeeSkill (employeeId) {
    try {
        const result = await model.employeeSkillModel.destroy({
            where: { employeeId },
            individualHooks: true
        });
        return { message: 'employee skill deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};

export async function refreshEmployeeSkills(employeeId, skills,createdBy, updatedBy, transaction) {
  try {
    // Delete old
    await model.employeeSkillModel.destroy({ where: { employeeId }, transaction });

    // Insert new
    const insertData = skills.map(skill => ({
      employeeId,createdBy,
      updatedBy,
      ...skill
    }));

    return await model.employeeSkillModel.bulkCreate(insertData, { transaction });
  } catch (error) {
    console.error("Error refreshing employee skills:", error);
    throw error;
  }
};