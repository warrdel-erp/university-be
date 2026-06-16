import * as instituteRepository from "../repository/instituteRepository.js";
import * as campusRepository from "../repository/campusRepository.js";

export const createInstitute = async (data) => {
  try {
    const { campusId } = data;

    const campus = await campusRepository.getCampusById(campusId);
    if (!campus || campus.universityId !== data.universityId) {
      const error = new Error("Campus not found or does not belong to this university");
      error.statusCode = 404;
      throw error;
    }

    return await instituteRepository.createInstitute(data);
  } catch (error) {
    console.error("Error in Institute Service (createInstitute):", error);
    throw error;
  }
};

export const listInstitutes = async (universityId, campusId) => {
  try {
    return await instituteRepository.getInstitutes(universityId, campusId);
  } catch (error) {
    console.error("Error in Institute Service (listInstitutes):", error);
    throw error;
  }
};
