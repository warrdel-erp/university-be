import sequelize from "../database/sequelizeConfig.js";
import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

export async function createInstitute(data, affiliatedUniversities = []) {
  const transaction = await sequelize.transaction();
  try {
    const institute = await scoped(model.instituteModel).create(data, { transaction });

    const affiliateRows = [];
    for (const item of affiliatedUniversities) {
      const row = await model.affiliatedIniversityModel.unscoped().create(
        {
          affiliatedUniversityName: item.affiliatedUniversityName,
          affiliatedUniversityCode: item.affiliatedUniversityCode,
          instituteId: institute.instituteId,
          universityId: data.universityId,
          createdBy: data.createdBy,
        },
        { transaction }
      );
      affiliateRows.push(row);
    }

    await transaction.commit();
    institute.setDataValue("affiliateInstitute", affiliateRows);
    return institute;
  } catch (error) {
    await transaction.rollback();
    console.error("Error in Institute Repository (createInstitute):", error);
    throw error;
  }
}

export async function getInstitutes(universityId, campusId) {
  try {
    return await scoped(model.instituteModel).findAll({
      where: {
        universityId,
        ...(campusId && { campusId }),
      },
      include: [
        {
          model: model.campusModel.unscoped(),
          as: "campues",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy"] },
        },
        {
          model: model.affiliatedIniversityModel.unscoped(),
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

export async function getInstituteByCampusAndId(campusId, instituteId) {
  try {
    return await scoped(model.instituteModel).findOne({
      where: { campusId, instituteId },
    });
  } catch (error) {
    console.error("Error in Institute Repository (getInstituteByCampusAndId):", error);
    throw error;
  }
}

export async function getInstituteById(instituteId, universityId) {
  try {
    return model.instituteModel.unscoped().findOne({
      where: { instituteId, universityId },
      include: [
        {
          model: model.affiliatedIniversityModel.unscoped(),
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

export async function updateInstitute(instituteId, universityId, data) {
  try {
    const existing = await model.instituteModel.unscoped().findOne({
      where: { instituteId, universityId },
    });
    if (!existing) {
      return null;
    }

    await model.instituteModel.unscoped().update(data, {
      where: { instituteId, universityId },
    });

    return getInstituteById(instituteId, universityId);
  } catch (error) {
    console.error("Error in Institute Repository (updateInstitute):", error);
    throw error;
  }
}

export async function getAffiliatedUniversityById(affiliatedUniversityId, universityId) {
  try {
    return model.affiliatedIniversityModel.unscoped().findOne({
      where: { affiliatedUniversityId, universityId },
    });
  } catch (error) {
    console.error("Error in Institute Repository (getAffiliatedUniversityById):", error);
    throw error;
  }
}

export async function updateAffiliatedUniversity(affiliatedUniversityId, universityId, data) {
  try {
    const existing = await getAffiliatedUniversityById(affiliatedUniversityId, universityId);
    if (!existing) {
      return null;
    }

    await model.affiliatedIniversityModel.unscoped().update(data, {
      where: { affiliatedUniversityId, universityId },
    });

    return getAffiliatedUniversityById(affiliatedUniversityId, universityId);
  } catch (error) {
    console.error("Error in Institute Repository (updateAffiliatedUniversity):", error);
    throw error;
  }
}
