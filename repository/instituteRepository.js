import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

export async function createInstitute(data) {
  try {
    return await scoped(model.instituteModel).create(data);
  } catch (error) {
    console.error("Error in Institute Repository (createInstitute):", error);
    throw error;
  }
}

export async function getInstitutes(universityId, campusId) {
  try {
    return await scoped(model.instituteModel).findAll({
      where: {
        universityId,
        ...(campusId && { campusId }),
      },
      include: [
        {
          model: model.campusModel.unscoped(),
          as: "campues",
        },
      ],
    });
  } catch (error) {
    console.error("Error in Institute Repository (getInstitutes):", error);
    throw error;
  }
}

export async function getInstituteByCampusAndId(campusId, instituteId) {
  try {
    return await scoped(model.instituteModel).findOne({
      where: { campusId, instituteId },
    });
  } catch (error) {
    console.error("Error in Institute Repository (getInstituteByCampusAndId):", error);
    throw error;
  }
}
