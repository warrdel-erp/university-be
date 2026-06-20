import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

function feeGroupExcludedAttributes() {
  return ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"];
}

function userInclude() {
  return {
    model: model.userModel,
    as: "userFeeGroup",
    attributes: ["universityId", "userId"],
    where: buildScope(model.userModel),
    required: true,
  };
}

export async function addFeeGroup(feeGroupData) {
  try {
    return await scoped(model.feeGroupModel).create(feeGroupData);
  } catch (error) {
    console.error("Error in add FeeGroup :", error);
    throw error;
  }
}

export async function getFeeGroupDetails(filters = {}) {
  try {
    const businessWhere = filters.acedmicYearId ? { acedmicYearId: filters.acedmicYearId } : {};

    return scoped(model.feeGroupModel).findAll({
      attributes: { exclude: feeGroupExcludedAttributes() },
      where: businessWhere,
      include: [userInclude()],
    });
  } catch (error) {
    console.error("Error fetching FeeGroup details:", error);
    throw error;
  }
}

export async function getSingleFeeGroupDetails(feeGroupId) {
  try {
    return scoped(model.feeGroupModel).findOne({
      attributes: { exclude: feeGroupExcludedAttributes() },
      where: { feeGroupId },
      include: [userInclude()],
    });
  } catch (error) {
    console.error("Error fetching FeeGroup details:", error);
    throw error;
  }
}

export async function updateFeeGroup(feeGroupId, feeGroupData) {
  try {
    const existing = await scoped(model.feeGroupModel).findOne({
      attributes: ["feeGroupId"],
      where: { feeGroupId },
    });
    if (!existing) {
      return [0];
    }

    return scoped(model.feeGroupModel).update(feeGroupData, {
      where: { feeGroupId },
    });
  } catch (error) {
    console.error(`Error updating FeeGroup creation ${feeGroupId}:`, error);
    throw error;
  }
}

export async function deleteFeeGroup(feeGroupId) {
  const deleted = await scoped(model.feeGroupModel).destroy({ where: { feeGroupId } });
  return deleted > 0;
}
