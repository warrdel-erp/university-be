import { createDefaultDepartmentsForInstitute } from "./departmentRepository.js";
import sequelize from "../../../database/sequelizeConfig.js";
import * as model from "../../../models/index.js";
import { getTenantStore } from "../../../utility/requestContext.js";

function universityWhere(extra = {}) {
  return { universityId: getTenantStore().universityId, ...extra };
}

export async function createInstitute(data, affiliatedUniversities = [], academicYear, options = {}) {
  const isExternalTransaction = Boolean(options.transaction);
  const transaction = options.transaction || (await sequelize.transaction());
  try {
    const institute = await model.instituteModel.create(data, { transaction });

    await createDefaultDepartmentsForInstitute(
      {
        instituteId: institute.instituteId,
        universityId: institute.universityId,
        createdBy: data.createdBy,
      },
      transaction,
    );

    const affiliateRows = [];
    for (const item of affiliatedUniversities) {
      const row = await model.affiliatedIniversityModel.create(
        {
          affiliatedUniversityName: item.affiliatedUniversityName,
          affiliatedUniversityCode: item.affiliatedUniversityCode,
          instituteId: institute.instituteId,
          universityId: institute.universityId,
          createdBy: data.createdBy,
        },
        { transaction }
      );
      affiliateRows.push(row);
    }

    const createdAcademicYear = await model.acedmicYearModel.create(
      {
        universityId: institute.universityId,
        instituteId: institute.instituteId,
        yearTitle: academicYear.yearTitle,
        startingDate: academicYear.startingDate,
        endingDate: academicYear.endingDate,
        isActive: true,
        updatedBy: data.createdBy,
      },
      { transaction },
    );

    if (!isExternalTransaction) {
      await transaction.commit();
    }
    institute.setDataValue("affiliateInstitute", affiliateRows);
    institute.setDataValue("academicYear", createdAcademicYear);
    return institute;
  } catch (error) {
    if (!isExternalTransaction) {
      await transaction.rollback();
    }
    console.error("Error in Institute Repository (createInstitute):", error);
    throw error;
  }
}

export async function getInstitutes(campusId, options = {}) {
  try {
    return await model.instituteModel.findAll({
      where: universityWhere(campusId ? { campusId } : {}),
      transaction: options.transaction,
      include: [
        {
          model: model.campusModel,
          as: "campues",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy"] },
        },
        {
          model: model.affiliatedIniversityModel,
          as: "affiliateInstitute",
          attributes: {
            exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "universityId", "instituteId"],
          },
          required: false,
        },
      ],
      order: [["instituteName", "ASC"]],
    });
  } catch (error) {
    console.error("Error in Institute Repository (getInstitutes):", error);
    throw error;
  }
}

export async function getInstituteByCampusAndId(campusId, instituteId, options = {}) {
  try {
    return await model.instituteModel.findOne({
      where: universityWhere({ campusId, instituteId }),
      transaction: options.transaction,
    });
  } catch (error) {
    console.error("Error in Institute Repository (getInstituteByCampusAndId):", error);
    throw error;
  }
}

export async function getInstituteById(instituteId, options = {}) {
  try {
    return model.instituteModel.findOne({
      where: universityWhere({ instituteId }),
      transaction: options.transaction,
      include: [
        {
          model: model.affiliatedIniversityModel,
          as: "affiliateInstitute",
          attributes: {
            exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "universityId", "instituteId"],
          },
          required: false,
        },
      ],
    });
  } catch (error) {
    console.error("Error in Institute Repository (getInstituteById):", error);
    throw error;
  }
}

export async function updateInstitute(instituteId, data, options = {}) {
  try {
    const existing = await model.instituteModel.findOne({
      where: universityWhere({ instituteId }),
      transaction: options.transaction,
    });
    if (!existing) {
      return null;
    }

    await model.instituteModel.update(data, {
      where: universityWhere({ instituteId }),
      transaction: options.transaction,
      individualHooks: true,
    });

    return getInstituteById(instituteId, options);
  } catch (error) {
    console.error("Error in Institute Repository (updateInstitute):", error);
    throw error;
  }
}

export async function getAffiliatedUniversityById(affiliatedUniversityId, options = {}) {
  try {
    return model.affiliatedIniversityModel.findOne({
      where: universityWhere({ affiliatedUniversityId }),
      transaction: options.transaction,
    });
  } catch (error) {
    console.error("Error in Institute Repository (getAffiliatedUniversityById):", error);
    throw error;
  }
}

export async function findDefaultAffiliatedUniversityId(options = {}) {
  try {
    const row = await model.affiliatedIniversityModel.findOne({
      attributes: ["affiliatedUniversityId"],
      where: universityWhere(),
      order: [["affiliatedUniversityId", "ASC"]],
      transaction: options.transaction,
    });
    return row?.get("affiliatedUniversityId") ?? null;
  } catch (error) {
    console.error("Error in Institute Repository (findDefaultAffiliatedUniversityId):", error);
    throw error;
  }
}

export async function updateAffiliatedUniversity(affiliatedUniversityId, data, options = {}) {
  try {
    const existing = await getAffiliatedUniversityById(affiliatedUniversityId, options);
    if (!existing) {
      return null;
    }

    await model.affiliatedIniversityModel.update(data, {
      where: universityWhere({ affiliatedUniversityId }),
      transaction: options.transaction,
      individualHooks: true,
    });

    return getAffiliatedUniversityById(affiliatedUniversityId, options);
  } catch (error) {
    console.error("Error in Institute Repository (updateAffiliatedUniversity):", error);
    throw error;
  }
}
