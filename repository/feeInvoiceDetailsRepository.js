import * as model from "../models/index.js";
import { buildScope } from "../utility/scoped.js";

function feeInvoiceDetailExcludedAttributes() {
  return ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy", "fee_type_id"];
}

function userFeeInvoiceInclude() {
  return {
    model: model.userModel.unscoped(),
    as: "userFeeInvoice",
    attributes: ["universityId", "userId"],
    where: buildScope(model.userModel),
    required: true,
  };
}

function scopedFeeInvoiceParentInclude() {
  return {
    model: model.feeInvoiceModel.unscoped(),
    as: "feeInvoiceDetails",
    attributes: {
      exclude: [
        "createdAt",
        "updatedAt",
        "deletedAt",
        "createdBy",
        "updatedBy",
        "fee_type_id",
        "class_student_mapper_id",
      ],
    },
    required: true,
    include: [userFeeInvoiceInclude()],
  };
}

async function assertScopedFeeInvoiceDetail(feeInvoiceDetailsId, transaction) {
  return model.feeInvoiceDetailModel.unscoped().findOne({
    attributes: ["feeInvoiceDetailsId"],
    where: { feeInvoiceDetailsId },
    include: [scopedFeeInvoiceParentInclude()],
    transaction,
  });
}

async function assertScopedFeeInvoice(feeInvoiceId, transaction) {
  return model.feeInvoiceModel.unscoped().findOne({
    attributes: ["feeInvoiceId"],
    where: { feeInvoiceId },
    include: [userFeeInvoiceInclude()],
    transaction,
  });
}

export async function addFeeInvoiceDetails(feeInvoiceDetailsData, transaction) {
  try {
    const parent = await assertScopedFeeInvoice(feeInvoiceDetailsData.feeInvoiceId, transaction);
    if (!parent) {
      throw new Error("Fee invoice not found");
    }

    return model.feeInvoiceDetailModel.unscoped().create(feeInvoiceDetailsData, { transaction });
  } catch (error) {
    console.error("Error in add Fee Invoice Details :", error);
    throw error;
  }
}

export async function getFeeInvoiceDetailsDetails() {
  try {
    return model.feeInvoiceDetailModel.unscoped().findAll({
      attributes: { exclude: feeInvoiceDetailExcludedAttributes() },
      include: [scopedFeeInvoiceParentInclude()],
    });
  } catch (error) {
    console.error("Error fetching FeeInvoiceDetails :", error);
    throw error;
  }
}

export async function getSingleFeeInvoiceDetails(feeInvoiceDetailsId) {
  try {
    return model.feeInvoiceDetailModel.unscoped().findOne({
      attributes: { exclude: feeInvoiceDetailExcludedAttributes() },
      where: { feeInvoiceDetailsId },
      include: [scopedFeeInvoiceParentInclude()],
    });
  } catch (error) {
    console.error("Error fetching Fee Invoice Details details:", error);
    throw error;
  }
}

export async function updateFeeInvoiceDetails(feeInvoiceDetailsId, feeInvoiceDetailsData, transaction) {
  try {
    const existing = await assertScopedFeeInvoiceDetail(feeInvoiceDetailsId, transaction);
    if (!existing) {
      return [0];
    }

    return model.feeInvoiceDetailModel.unscoped().update(feeInvoiceDetailsData, {
      where: { feeInvoiceDetailsId },
      transaction,
    });
  } catch (error) {
    console.error(`Error updating FeeInvoiceDetails creation ${feeInvoiceDetailsId}:`, error);
    throw error;
  }
}

export async function deleteFeeInvoiceDetails(feeInvoiceDetailsId) {
  const existing = await assertScopedFeeInvoiceDetail(feeInvoiceDetailsId);
  if (!existing) {
    return false;
  }

  const deleted = await model.feeInvoiceDetailModel.unscoped().destroy({
    where: { feeInvoiceDetailsId },
  });
  return deleted > 0;
}
