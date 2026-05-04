import * as model from '../models/index.js'

function normalizeExperiencePayload(raw = {}) {
  return {
    employeeId: raw?.employeeId ?? null,
    createdBy: raw?.createdBy ?? null,
    updatedBy: raw?.updatedBy ?? null,
    experienceType: raw?.experienceType ?? raw?.experience_type ?? null,
    organization: raw?.organization ?? null,
    // DB column/property is legacy-typo "desigation"; accept FE "designation".
    desigation: raw?.desigation ?? raw?.designation ?? null,
    fromDate: raw?.fromDate ?? null,
    toDate: raw?.toDate ?? null,
    totalExperianceYears: raw?.totalExperianceYears ?? null,
    totalExperianceMonths: raw?.totalExperianceMonths ?? null,
    totalExperiancedays: raw?.totalExperiancedays ?? null,
    lastSalary: raw?.lastSalary ?? null,
    remarks: raw?.remarks ?? null
  };
}

export async function addEmployeeExperiance(data,transaction) {
    try {
        const result = await model.employeeExperianceModel.create(
          normalizeExperiencePayload(data),
          {transaction}
        );
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

    const insertData = experiences.map((exp) =>
      normalizeExperiencePayload({
        ...exp,
        employeeId,
        createdBy,
        updatedBy
      })
    );

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
      attributes: { exclude: ["createdAt", "updatedAt"] },
    });
  } catch (error) {
    console.error("Error fetching employee experiences:", error);
    throw error;
  }
}
