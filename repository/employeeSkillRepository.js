import * as model from '../models/index.js'
import { Op } from 'sequelize';

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
    await model.employeeSkillModel.destroy({
      where: { employeeId },
      transaction
    });

    // Insert new
    const insertData = skills.map(skill => ({
      employeeId,
      createdBy,
      updatedBy,
      // sanitize payload to avoid carrying stale IDs/system fields
      name: skill.name,
      experienceInYear: skill.experienceInYear ?? null,
      experienceInMonth: skill.experienceInMonth ?? null,
      proficiencyLevel: skill.proficiencyLevel
    }));

    return await model.employeeSkillModel.bulkCreate(insertData, { transaction });
  } catch (error) {
    console.error("Error refreshing employee skills:", error);
    throw error;
  }
};

export async function getEmployeeSkillsByEmployeeId(employeeId) {
  try {
    return await model.employeeSkillModel.unscoped().findAll({
      where: { employeeId },
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
    });
  } catch (error) {
    console.error("Error fetching employee skills:", error);
    throw error;
  }
};