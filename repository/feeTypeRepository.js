import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

function feeTypeExcludedAttributes() {
  return ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"];
}

function scopedUserInclude() {
  return {
    model: model.userModel.unscoped(),
    as: "userFeeType",
    attributes: ["universityId", "userId"],
    where: buildScope(model.userModel),
    required: true,
  };
}

function scopedFeeGroupInclude(businessWhere = {}) {
  return {
    model: model.feeGroupModel.unscoped(),
    as: "feeGroup",
    attributes: { exclude: feeTypeExcludedAttributes() },
    where: { ...businessWhere, ...buildScope(model.feeGroupModel) },
    required: false,
  };
}

async function assertScopedFeeType(feeTypeId, transaction) {
  return model.feeTypeModel.unscoped().findOne({
    attributes: ["feeTypeId"],
    where: { feeTypeId },
    include: [scopedUserInclude()],
    transaction,
  });
}

export async function addFeeType(feeTypeData, options = {}) {
  try {
    if (feeTypeData.feeGroupId != null) {
      const feeGroup = await scoped(model.feeGroupModel).findOne({
        attributes: ["feeGroupId"],
        where: { feeGroupId: feeTypeData.feeGroupId },
        transaction: options.transaction,
      });
      if (!feeGroup) {
        throw new Error("feeGroupId not found or not in your institute");
      }
    }

    return model.feeTypeModel.unscoped().create(feeTypeData, { transaction: options.transaction });
  } catch (error) {
    console.error("Error in add FeeType :", error);
    throw error;
  }
}

export async function getFeeTypeDetails(filters = {}) {
  try {
    const feeGroupBusinessWhere = filters.acedmicYearId
      ? { acedmicYearId: filters.acedmicYearId }
      : {};

    return model.feeTypeModel.unscoped().findAll({
      attributes: { exclude: feeTypeExcludedAttributes() },
      include: [scopedUserInclude(), scopedFeeGroupInclude(feeGroupBusinessWhere)],
    });
  } catch (error) {
    console.error("Error fetching FeeType details:", error);
    throw error;
  }
}

export async function getSingleFeeTypeDetails(feeTypeId) {
  try {
    return model.feeTypeModel.unscoped().findOne({
      attributes: { exclude: feeTypeExcludedAttributes() },
      where: { feeTypeId },
      include: [scopedUserInclude(), scopedFeeGroupInclude()],
    });
  } catch (error) {
    console.error("Error fetching FeeType details:", error);
    throw error;
  }
}

export async function updateFeeType(feeTypeId, feeTypeData) {
  try {
    const existing = await assertScopedFeeType(feeTypeId);
    if (!existing) {
      return [0];
    }

    if (feeTypeData.feeGroupId != null) {
      const feeGroup = await scoped(model.feeGroupModel).findOne({
        attributes: ["feeGroupId"],
        where: { feeGroupId: feeTypeData.feeGroupId },
      });
      if (!feeGroup) {
        throw new Error("feeGroupId not found or not in your institute");
      }
    }

    return model.feeTypeModel.unscoped().update(feeTypeData, {
      where: { feeTypeId },
    });
  } catch (error) {
    console.error(`Error updating FeeType creation ${feeTypeId}:`, error);
    throw error;
  }
}

export async function deleteFeeType(feeTypeId) {
  const existing = await assertScopedFeeType(feeTypeId);
  if (!existing) {
    return false;
  }

  const deleted = await model.feeTypeModel.unscoped().destroy({ where: { feeTypeId } });
  return deleted > 0;
}
