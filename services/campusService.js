import * as campusRepository from "../repository/campusRepository.js";

export const createCampus = async (data) => {
  try {
    return await campusRepository.createCampus(data);
  } catch (error) {
    console.error("Error in Campus Service (createCampus):", error);
    throw error;
  }
};

export const listCampuses = async (universityId) => {
  try {
    return await campusRepository.getCampuses(universityId);
  } catch (error) {
    console.error("Error in Campus Service (listCampuses):", error);
    throw error;
  }
};
