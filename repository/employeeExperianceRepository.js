import * as model from '../models/index.js'
import { Op } from 'sequelize';

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
      transaction
    });

    const insertData = experiences.map((exp) => ({
      employeeId,
      createdBy,
      updatedBy,
      // Never trust UI-provided IDs/joins while re-inserting rows
      experienceType: exp?.experienceType ?? exp?.experience_type ?? null,
      organization: exp?.organization ?? null,
      desigation: exp?.desigation ?? null,
      fromDate: exp?.fromDate ?? null,
      toDate: exp?.toDate ?? null,
      totalExperianceYears: exp?.totalExperianceYears ?? null,
      totalExperianceMonths: exp?.totalExperianceMonths ?? null,
      totalExperiancedays: exp?.totalExperiancedays ?? null,
      lastSalary: exp?.lastSalary ?? null,
      remarks: exp?.remarks ?? null
    }));

    return await model.employeeExperianceModel.bulkCreate(insertData, { transaction });
  } catch (error) {
    console.error("Error refreshing employee experiences:", error);
    throw error;
  }
}

export async function getEmployeeExperiencesByEmployeeId(employeeId) {
  try {
    return await model.employeeExperianceModel.unscoped().findAll({
      where: {
        employeeId,
        deletedAt: null
      },
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
    });
  } catch (error) {
    console.error("Error fetching employee experiences:", error);
    throw error;
  }
}
