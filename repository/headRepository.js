import * as model from "../models/index.js";
import { Op } from "sequelize";
import { scoped } from "../utility/scoped.js";

export async function addHead(headData, transaction) {
  try {
    return await scoped(model.headModel).create(headData, { transaction });
  } catch (error) {
    console.error("Error in add head :", error);
    throw error;
  }
}

export async function getHeadDetails() {
  try {
    return await scoped(model.headModel).findAll({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
      include: [
        {
          model: model.campusModel,
          as: "headCampus",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
        },
        {
          model: model.instituteModel,
          as: "headInstitute",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
        },
      ],
    });
  } catch (error) {
    console.error("Error fetching head details:", error);
    throw error;
  }
}

export async function getSingleHeadDetails(headId) {
  try {
    return await scoped(model.headModel).findOne({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
      where: { headId },
      include: [
        {
          model: model.campusModel,
          as: "headCampus",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
        },
        {
          model: model.instituteModel,
          as: "headInstitute",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
        },
      ],
    });
  } catch (error) {
    console.error("Error fetching head details:", error);
    throw error;
  }
}

export async function deleteHead(headId) {
  const existing = await scoped(model.headModel).findOne({
    where: { headId },
    attributes: ["headId"],
  });
  if (!existing) {
    return false;
  }

  const deleted = await scoped(model.headModel).destroy({ where: { headId } });
  return deleted > 0;
}

export async function updateHead(headId, headData) {
  try {
    const existing = await scoped(model.headModel).findOne({
      where: { headId },
      attributes: ["headId"],
    });
    if (!existing) {
      return [0];
    }

    return await scoped(model.headModel).update(headData, {
      where: { headId },
    });
  } catch (error) {
    console.error(`Error updating head creation ${headId}:`, error);
    throw error;
  }
}

/** Login lookup — intentionally unscoped (no tenant context at auth). */
export async function getHeadDetailsByEmail(email) {
  try {
    const head = await scoped(model.headModel).findOne({
      attributes: {
        exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"],
      },
      where: {
        [Op.or]: [{ registerEmail: email }, { alternateEmail: email }],
      },
    });

    if (!head) {
      return null;
    }

    return {
      role: head.isAdmin ? "Admin" : "Head",
      ...head.toJSON(),
    };
  } catch (error) {
    console.error("Error fetching head details by email:", error);
    throw error;
  }
}
