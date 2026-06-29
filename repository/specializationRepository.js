import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

export async function updateSpecialization(specializationId, data) {
  try {
    const existing = await scoped(model.specializationModel).findOne({
      where: { specializationId },
    });
    if (!existing) {
      return null;
    }

    await scoped(model.specializationModel).update(data, {
      where: { specializationId },
    });

    return scoped(model.specializationModel).findOne({
      where: { specializationId },
    });
  } catch (error) {
    console.error("Error in Specialization Repository (updateSpecialization):", error);
    throw error;
  }
}
