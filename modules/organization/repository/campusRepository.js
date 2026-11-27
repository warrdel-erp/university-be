import { Op } from "sequelize";
import * as model from "../../../models/index.js";
import { scoped } from "../../../utility/scoped.js";

const excludeMeta = ["createdAt", "updatedAt", "deletedAt", "createdBy"];

function toCampusRecord(campus, createdBy) {
  return {
    campusName: campus.campusName,
    campusCode: campus.campusCode,
    campusType: campus.campusType,
    addressLine: campus.addressLine ?? null,
    latitude: campus.latitude ?? null,
    longitude: campus.longitude ?? null,
    administratorName: campus.administratorName ?? null,
    administratorContactNumber: campus.administratorContactNumber ?? null,
    administratorEmail: campus.administratorEmail ?? null,
    createdBy,
  };
}

export async function createCampus(campus, createdBy, options = {}) {
  try {
    const record = toCampusRecord(campus, createdBy);
    return await scoped(model.campusModel).create(record, {
      transaction: options.transaction,
    });
  } catch (error) {
    console.error("Error in Campus Repository (createCampus):", error);
    throw error;
  }
}

export async function getCampuses(options = {}) {
  try {
    return await scoped(model.campusModel).findAll({
      transaction: options.transaction,
    });
  } catch (error) {
    console.error("Error in Campus Repository (getCampuses):", error);
    throw error;
  }
}

export async function getCampusById(campusId, options = {}) {
  try {
    return await scoped(model.campusModel).findOne({
      where: { campusId },
      transaction: options.transaction,
    });
  } catch (error) {
    console.error("Error in Campus Repository (getCampusById):", error);
    throw error;
  }
}

export async function updateCampus(campusId, data, options = {}) {
  try {
    const existing = await scoped(model.campusModel).findOne({
      where: { campusId },
      transaction: options.transaction,
    });
    if (!existing) {
      return null;
    }

    await scoped(model.campusModel).update(data, {
      where: { campusId },
      transaction: options.transaction,
      individualHooks: true,
    });

    return await scoped(model.campusModel).findOne({
      where: { campusId },
      transaction: options.transaction,
    });
  } catch (error) {
    console.error("Error in Campus Repository (updateCampus):", error);
    throw error;
  }
}

export async function getCampusHierarchy(universityId, options = {}) {
  try {
    const campuses = await scoped(model.campusModel).findAll({
      where: { universityId },
      attributes: { exclude: excludeMeta },
      transaction: options.transaction,
      include: [
        {
          model: model.instituteModel,
          as: "instituteData",
          attributes: { exclude: [...excludeMeta, "universityId"] },
          where: { universityId },
          required: false,
          include: [
            {
              model: model.affiliatedIniversityModel,
              as: "affiliateInstitute",
              attributes: {
                exclude: [...excludeMeta, "universityId", "instituteId"],
              },
              where: { universityId },
              required: false,
            },
          ],
        },
      ],
      order: [
        ["campusName", "ASC"],
        [{ model: model.instituteModel, as: "instituteData" }, "instituteName", "ASC"],
      ],
    });

    const instituteIds = campuses.flatMap((campus) =>
      (campus.instituteData || []).map((institute) => institute.instituteId)
    );

    const specializations =
      instituteIds.length > 0
        ? await scoped(model.specializationModel).findAll({
            attributes: { exclude: [...excludeMeta, "universityId"] },
            where: {
              universityId,
              instituteId: { [Op.in]: instituteIds },
            },
            transaction: options.transaction,
          })
        : [];

    const specializationsByInstituteId = specializations.reduce((acc, row) => {
      const plain = row.get({ plain: true });
      const list = acc.get(plain.instituteId) || [];
      list.push({
        specializationId: plain.specializationId,
        specializationName: plain.specializationName,
        specializationCode: plain.specializationCode,
        courseId: plain.course_Id,
        instituteId: plain.instituteId,
        academicYearId: plain.academicYearId,
      });
      acc.set(plain.instituteId, list);
      return acc;
    }, new Map());

    return campuses.map((campus) => {
      const plainCampus = campus.get({ plain: true });
      return {
        campusId: plainCampus.campusId,
        campusName: plainCampus.campusName,
        campusCode: plainCampus.campusCode,
        campusType: plainCampus.campusType,
        address: {
          addressLine: plainCampus.addressLine,
          geoTag:
            plainCampus.latitude != null && plainCampus.longitude != null
              ? { latitude: plainCampus.latitude, longitude: plainCampus.longitude }
              : null,
        },
        campusAdministrator: {
          name: plainCampus.administratorName,
          contactNumber: plainCampus.administratorContactNumber,
          email: plainCampus.administratorEmail,
        },
        institutes: (plainCampus.instituteData || []).map((institute) => ({
          instituteId: institute.instituteId,
          campusId: institute.campusId,
          instituteName: institute.instituteName,
          instituteCode: institute.instituteCode,
          affiliatedUniversities: (institute.affiliateInstitute || []).map((affiliated) => ({
            affiliatedUniversityId: affiliated.affiliatedUniversityId,
            affiliatedUniversityName: affiliated.affiliatedUniversityName,
            affiliatedUniversityCode: affiliated.affiliatedUniversityCode,
          })),
          specializations: specializationsByInstituteId.get(institute.instituteId) || [],
        })),
      };
    });
  } catch (error) {
    console.error("Error in Campus Repository (getCampusHierarchy):", error);
    throw error;
  }
}
