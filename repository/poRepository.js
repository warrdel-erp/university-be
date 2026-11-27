import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

export async function addPo(poData, options = {}) {
  try {
    const course = await scoped(model.courseModel).findOne({
      attributes: ["courseId"],
      where: { courseId: poData.courseId },
      ...options,
    });
    if (!course) {
      throw new Error("Course not found");
    }

    return scoped(model.poModel).create(poData, options);
  } catch (error) {
    console.error("Error in add Po :", error);
    throw error;
  }
}

export async function getPoDetails() {
  try {
    return scoped(model.poModel).findAll({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
      include: [
        {
          model: model.courseModel,
          as: "courseDetail",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
          where: buildScope(model.courseModel),
          required: true,
          include: [
            {
              model: model.subjectModel,
              as: "subjectInfo",
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
              where: buildScope(model.subjectModel),
              required: false,
            },
          ],
        },
      ],
    });
  } catch (error) {
    console.error("Error fetching Po details:", error);
    throw error;
  }
}

export async function getSinglePoDetails(poId) {
  try {
    return scoped(model.poModel).findOne({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
      where: { poId },
      include: [
        {
          model: model.courseModel,
          as: "courseDetail",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
          where: buildScope(model.courseModel),
          required: true,
          include: [
            {
              model: model.subjectModel,
              as: "subjectInfo",
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
              where: buildScope(model.subjectModel),
              required: false,
            },
          ],
        },
      ],
    });
  } catch (error) {
    console.error("Error fetching Po details:", error);
    throw error;
  }
}

export async function updatePo(poId, poData, options = {}) {
  try {
    const existing = await scoped(model.poModel).findOne({
      attributes: ["poId"],
      where: { poId },
      ...options,
    });
    if (!existing) {
      return [0];
    }

    if (poData.courseId) {
      const course = await scoped(model.courseModel).findOne({
        attributes: ["courseId"],
        where: { courseId: poData.courseId },
        ...options,
      });
      if (!course) {
        return [0];
      }
    }

    return scoped(model.poModel).update(poData, { where: { poId }, ...options });
  } catch (error) {
    console.error(`Error updating Po creation ${poId}:`, error);
    throw error;
  }
}

export async function deletePo(poId, options = {}) {
  const existing = await scoped(model.poModel).findOne({
    attributes: ["poId"],
    where: { poId },
    ...options,
  });
  if (!existing) {
    return false;
  }

  const deleted = await scoped(model.poModel).destroy({ where: { poId }, ...options });
  return deleted > 0;
}
