import * as campusRepository from "../repository/campusRepository.js";

/**
 * Create a new campus
 * @param {Object} data - Campus data
 * @returns {Promise<Object>} Created campus
 */
export const createCampus = async (data) => {
  try {
    return await campusRepository.createCampus(data);
  } catch (error) {
    console.error("Error in Campus Service (createCampus):", error);
    throw error;
  }
};

/**
 * List campuses for a university
 * @param {number} universityId - University ID
 * @param {number} [campusId] - Optional Campus ID to filter
 * @returns {Promise<Array>} List of campuses
 */
export const listCampuses = async (universityId) => {
  try {
    return await campusRepository.getCampuses(universityId);
  } catch (error) {
    console.error("Error in Campus Service (listCampuses):", error);
    throw error;
  }
};
