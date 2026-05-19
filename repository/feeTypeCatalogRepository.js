import { Op } from "sequelize";
import * as model from "../models/index.js";

const catalogExclude = ["createdAt", "updatedAt"];

const catalogIncludeCategory = [
  {
    model: model.feeTypeCategoryModel,
    as: "feeTypeCategory",
    attributes: ["feeTypeCategoryId", "name", "description", "instituteId"],
  },
];

export async function createFeeTypeCatalog(data, options = {}) {
  return model.feeTypeCatalogModel.create(data, { transaction: options.transaction });
}

export async function findFeeTypeCatalogsByInstitute(instituteId, options = {}) {
  const { transaction } = options;
  return model.feeTypeCatalogModel.findAll({
    attributes: { exclude: catalogExclude },
    where: { instituteId },
    include: catalogIncludeCategory,
    order: [["feeTypeCatalogId", "ASC"]],
    transaction,
  });
}

export async function findFeeTypeCatalogById(feeTypeCatalogId, instituteId, options = {}) {
  const { transaction } = options;
  return model.feeTypeCatalogModel.findOne({
    attributes: { exclude: catalogExclude },
    where: { feeTypeCatalogId, instituteId },
    include: catalogIncludeCategory,
    transaction,
  });
}

export async function findFeeTypeCatalogsByIds(feeTypeCatalogIds, instituteId, options = {}) {
  const { transaction } = options;
  return model.feeTypeCatalogModel.findAll({
    attributes: { exclude: catalogExclude },
    where: {
      feeTypeCatalogId: { [Op.in]: feeTypeCatalogIds },
      instituteId,
    },
    transaction,
  });
}

export async function findFeeTypeCategoryByIdForInstitute(feeTypeCategoryId, instituteId, options = {}) {
  return model.feeTypeCategoryModel.findOne({
    attributes: ["feeTypeCategoryId", "instituteId"],
    where: { feeTypeCategoryId, instituteId },
    transaction: options.transaction,
  });
}

export async function updateFeeTypeCatalog(feeTypeCatalogId, instituteId, payload, options = {}) {
  const { transaction } = options;
  const [affected] = await model.feeTypeCatalogModel.update(payload, {
    where: { feeTypeCatalogId, instituteId },
    transaction,
  });
  return affected;
}

export async function countPlanSubItemsForCatalog(feeTypeCatalogId, options = {}) {
  const { transaction } = options;
  return model.feePlanSubItemsModel.count({
    where: { feeTypeId: feeTypeCatalogId },
    transaction,
  });
}

export async function countInvoiceItemsForCatalog(feeTypeCatalogId, options = {}) {
  const { transaction } = options;
  return model.studentFeeInvoiceItemsModel.count({
    where: { feeTypeId: feeTypeCatalogId },
    transaction,
  });
}

export async function deleteFeeTypeCatalog(feeTypeCatalogId, instituteId, options = {}) {
  const { transaction } = options;
  const deleted = await model.feeTypeCatalogModel.destroy({
    where: { feeTypeCatalogId, instituteId },
    transaction,
  });
  return deleted > 0;
}
