import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

export async function createCampus(data) {
  try {
    return await scoped(model.campusModel).create(data);
  } catch (error) {
    console.error("Error in Campus Repository (createCampus):", error);
    throw error;
  }
}

export async function getCampuses(universityId) {
  try {
    return await scoped(model.campusModel).findAll({
      where: { universityId },
    });
  } catch (error) {
    console.error("Error in Campus Repository (getCampuses):", error);
    throw error;
  }
}

export async function getCampusById(campusId, universityId) {
  try {
    return await scoped(model.campusModel).findOne({
      where: {
        campusId,
        ...(universityId != null && { universityId }),
      },
    });
  } catch (error) {
    console.error("Error in Campus Repository (getCampusById):", error);
    throw error;
  }
}
