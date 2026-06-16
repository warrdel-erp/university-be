import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

export async function createCampus(data) {
  try {
    return scoped(model.campusModel).create(data);
  } catch (error) {
    console.error("Error in Campus Repository (createCampus):", error);
    throw error;
  }
}

export async function getCampuses() {
  try {
    return scoped(model.campusModel).findAll();
  } catch (error) {
    console.error("Error in Campus Repository (getCampuses):", error);
    throw error;
  }
}

export async function getCampusById(campusId) {
  try {
    return scoped(model.campusModel).findOne({
      where: { campusId },
    });
  } catch (error) {
    console.error("Error in Campus Repository (getCampusById):", error);
    throw error;
  }
}
