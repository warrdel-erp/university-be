import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

export async function getCourseCode(courseId) {
  try {
    return scoped(model.courseModel).findOne({
      attributes: ["courseCode"],
      where: { courseId },
    });
  } catch (error) {
    console.error(`Error in course code ${courseId}:`, error);
    throw error;
  }
}

export async function getCampusCode(campusId) {
  try {
    return scoped(model.campusModel).findOne({
      attributes: ["campusCode"],
      where: { campusId },
    });
  } catch (error) {
    console.error(`Error in campus code ${campusId}:`, error);
    throw error;
  }
}

export async function getInstituteCode(instituteId) {
  try {
    return scoped(model.instituteModel).findOne({
      attributes: ["instituteCode"],
      where: { instituteId },
    });
  } catch (error) {
    console.error(`Error in institute code ${instituteId}:`, error);
    throw error;
  }
}
