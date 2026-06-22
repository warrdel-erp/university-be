import * as instituteRepository from "../repository/instituteRepository.js";
import * as campusRepository from "../repository/campusRepository.js";
import { requestContext } from "../utility/requestContext.js";

export const createInstitute = async (data) => {
  try {
    const { campusId, affiliatedUniversity = [], ...instituteData } = data;
    const universityId = requestContext.getStore()?.universityId;

    const campus = await campusRepository.getCampusById(campusId);
    if (!campus || Number(campus.universityId) !== Number(universityId)) {
      const error = new Error("Campus not found or does not belong to this university");
      error.statusCode = 404;
      throw error;
    }

    const row = await instituteRepository.createInstitute(
      { ...instituteData, campusId },
      affiliatedUniversity
    );
    return mapInstituteRow(row);
  } catch (error) {
    console.error("Error in Institute Service (createInstitute):", error);
    throw error;
  }
};

export const updateInstitute = async (instituteId, body) => {
  try {
    const universityId = requestContext.getStore()?.universityId;
    const { campusId, instituteName, instituteCode } = body;
    const data = {};

    if (campusId !== undefined) {
      const campus = await campusRepository.getCampusById(campusId);
      if (!campus || Number(campus.universityId) !== Number(universityId)) {
        const error = new Error("Campus not found or does not belong to this university");
        error.statusCode = 404;
        throw error;
      }
      data.campusId = campusId;
    }
    if (instituteName !== undefined) data.instituteName = instituteName;
    if (instituteCode !== undefined) data.instituteCode = instituteCode;

    const row = await instituteRepository.updateInstitute(instituteId, data);
    if (!row) {
      const error = new Error("Institute not found");
      error.statusCode = 404;
      throw error;
    }
    return mapInstituteRow(row);
  } catch (error) {
    console.error("Error in Institute Service (updateInstitute):", error);
    throw error;
  }
};

export const updateAffiliatedUniversity = async (affiliatedUniversityId, body) => {
  try {
    const data = {};
    if (body.affiliatedUniversityName !== undefined) {
      data.affiliatedUniversityName = body.affiliatedUniversityName;
    }
    if (body.affiliatedUniversityCode !== undefined) {
      data.affiliatedUniversityCode = body.affiliatedUniversityCode;
    }

    const row = await instituteRepository.updateAffiliatedUniversity(
      affiliatedUniversityId,
      data
    );
    if (!row) {
      const error = new Error("Affiliated university not found");
      error.statusCode = 404;
      throw error;
    }

    const plain = row.get ? row.get({ plain: true }) : row;
    return {
      affiliatedUniversityId: plain.affiliatedUniversityId,
      instituteId: plain.instituteId,
      affiliatedUniversityName: plain.affiliatedUniversityName,
      affiliatedUniversityCode: plain.affiliatedUniversityCode,
    };
  } catch (error) {
    console.error("Error in Institute Service (updateAffiliatedUniversity):", error);
    throw error;
  }
};

function mapInstituteRow(row) {
  const plain = row.get ? row.get({ plain: true }) : row;
  const { affiliateInstitute, ...institute } = plain;

  return {
    ...institute,
    affiliatedUniversity: (affiliateInstitute || []).map((item) => ({
      affiliatedUniversityId: item.affiliatedUniversityId,
      affiliatedUniversityName: item.affiliatedUniversityName,
      affiliatedUniversityCode: item.affiliatedUniversityCode,
    })),
  };
}

export const listInstitutes = async (campusId) => {
  try {
    const rows = await instituteRepository.getInstitutes(campusId);
    return rows.map(mapInstituteRow);
  } catch (error) {
    console.error("Error in Institute Service (listInstitutes):", error);
    throw error;
  }
};
