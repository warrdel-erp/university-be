import * as campusRepository from "../repository/campusRepository.js";

export async function createCampus(data) {
  try {
    return campusRepository.createCampus(data);
  } catch (error) {
    console.error("Error in Campus Service (createCampus):", error);
    throw error;
  }
}

export async function listCampuses() {
  try {
    return campusRepository.getCampuses();
  } catch (error) {
    console.error("Error in Campus Service (listCampuses):", error);
    throw error;
  }
}
