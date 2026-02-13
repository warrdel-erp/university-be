import campusModel from "../models/campusModel.js";

/**
 * Create a new campus
 * @param {Object} data - Campus data
 * @returns {Promise<Object>} Created campus
 */
export async function createCampus(data) {
  try {
    const result = await campusModel.create(data);
    return result;
  } catch (error) {
    console.error("Error in Campus Repository (createCampus):", error);
    throw error;
  }
}

/**
 * Get all campuses for a university
 * @param {number} universityId - University ID
 * @param {number} [campusId] - Optional Campus ID to filter
 * @returns {Promise<Array>} List of campuses
 */
export async function getCampuses(universityId) {
  try {
    const whereClause = {
      universityId: universityId,
    };
    const result = await campusModel.findAll({
      where: whereClause,
    });
    return result;
  } catch (error) {
    console.error("Error in Campus Repository (getCampuses):", error);
    throw error;
  }
}

/**
 * Get a specific campus by ID and University ID
 */
export async function getCampusById(universityId, campusId) {
  try {
    return await campusModel.findOne({
      where: {
        universityId,
        campusId,
      },
    });
  } catch (error) {
    console.error("Error in Campus Repository (getCampusById):", error);
    throw error;
  }
}
