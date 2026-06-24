import sequelize from "../database/sequelizeConfig.js";
import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

export async function createInstitute(data, affiliatedUniversities = [], academicYear) {
  const transaction = await sequelize.transaction();
  try {
    const institute = await scoped(model.instituteModel).create(data, { transaction });

    const affiliateRows = [];
    for (const item of affiliatedUniversities) {
      const row = await scoped(model.affiliatedIniversityModel).create(
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

    await transaction.commit();
    institute.setDataValue("affiliateInstitute", affiliateRows);
    institute.setDataValue("academicYear", createdAcademicYear);
    return institute;
  } catch (error) {
    await transaction.rollback();
    console.error("Error in Institute Repository (createInstitute):", error);
    throw error;
  }
}

export async function getInstitutes(campusId) {
  try {
    return await scoped(model.instituteModel).findAll({
      where: {
        ...(campusId && { campusId }),
      },
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

export async function getInstituteById(instituteId) {
  try {
    return scoped(model.instituteModel).findOne({
      where: { instituteId },
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

export async function updateInstitute(instituteId, data) {
  try {
    const existing = await scoped(model.instituteModel).findOne({
      where: { instituteId },
    });
    if (!existing) {
      return null;
    }

    await scoped(model.instituteModel).update(data, {
      where: { instituteId },
    });

    return getInstituteById(instituteId);
  } catch (error) {
    console.error("Error in Institute Repository (updateInstitute):", error);
    throw error;
  }
}

export async function getAffiliatedUniversityById(affiliatedUniversityId) {
  try {
    return scoped(model.affiliatedIniversityModel).findOne({
      where: { affiliatedUniversityId },
    });
  } catch (error) {
    console.error("Error in Institute Repository (getAffiliatedUniversityById):", error);
    throw error;
  }
}

export async function updateAffiliatedUniversity(affiliatedUniversityId, data) {
  try {
    const existing = await getAffiliatedUniversityById(affiliatedUniversityId);
    if (!existing) {
      return null;
    }

    await scoped(model.affiliatedIniversityModel).update(data, {
      where: { affiliatedUniversityId },
    });

    return getAffiliatedUniversityById(affiliatedUniversityId);
  } catch (error) {
    console.error("Error in Institute Repository (updateAffiliatedUniversity):", error);
    throw error;
  }
}
