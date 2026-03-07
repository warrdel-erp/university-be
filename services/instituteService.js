import * as instituteRepository from "../repository/instituteRepository.js";
import * as campusRepository from "../repository/campusRepository.js";

/**
 * Create a new institute
 * @param {Object} data - Institute data
 * @returns {Promise<Object>} Created institute
 */
export const createInstitute = async (data) => {
  try {
    const { universityId, campusId } = data;

    // Check if campus exists for this university
    const campus = await campusRepository.getCampusById(universityId, campusId);
    if (!campus) {
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

/**
 * List institutes for a university/campus
 * @param {number} universityId - University ID
 * @param {number} [campusId] - Optional Campus ID to filter
 * @returns {Promise<Array>} List of institutes
 */
export const listInstitutes = async (universityId, campusId) => {
  try {
    return await instituteRepository.getInstitutes(universityId, campusId);
  } catch (error) {
    console.error("Error in Institute Service (listInstitutes):", error);
    throw error;
  }
};
