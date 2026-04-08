import instituteModel from "../models/instituteModel.js";
import campusModel from "../models/campusModel.js";

/**
 * Create a new institute
 * @param {Object} data - Institute data
 * @returns {Promise<Object>} Created institute
 */
export async function createInstitute(data) {
  try {
    const result = await instituteModel.create(data);
    return result;
  } catch (error) {
    console.error("Error in Institute Repository (createInstitute):", error);
    throw error;
  }
}

/**
 * Get all institutes for a university/campus
 * @param {number} universityId - University ID
 * @param {number} [campusId] - Optional Campus ID to filter
 * @returns {Promise<Array>} List of institutes
 */
export async function getInstitutes(universityId, campusId) {
  try {
    const whereClause = {
      universityId: universityId,
      ...(campusId && { campusId }),
    };
    const result = await instituteModel.findAll({
      where: whereClause,
      include: [
        {
          model: campusModel,
          as: "campues"
        }
      ]
    });
    return result;
  } catch (error) {
    console.error("Error in Institute Repository (getInstitutes):", error);
    throw error;
  }
}
