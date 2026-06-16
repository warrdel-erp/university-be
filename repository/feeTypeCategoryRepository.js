import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

export async function createFeeTypeCategory(data, options = {}) {  return scoped(model.feeTypeCategoryModel).create(data, { transaction: options.transaction });
}

export async function findFeeTypeCategoriesByInstitute(options = {}) {
  const { transaction } = options;
  return scoped(model.feeTypeCategoryModel).findAll({
    attributes: { exclude: ["createdAt", "updatedAt"] },
    order: [["feeTypeCategoryId", "ASC"]],
    transaction,
  });
}

export async function findFeeTypeCategoryById(feeTypeCategoryId, options = {}) {
  const { transaction } = options;
  return scoped(model.feeTypeCategoryModel).findOne({
    attributes: { exclude: ["createdAt", "updatedAt"] },
    where: { feeTypeCategoryId },
    transaction,
  });
}

export async function countCatalogRowsForCategory(feeTypeCategoryId, options = {}) {
  const { transaction } = options;
  const category = await scoped(model.feeTypeCategoryModel).findOne({
    attributes: ["feeTypeCategoryId"],
    where: { feeTypeCategoryId },
    transaction,
  });
  if (!category) {
    return 0;
  }

  return scoped(model.feeTypeCatalogModel).count({
    where: { feeTypeCategoryId },
    transaction,
  });
}

export async function updateFeeTypeCategory(feeTypeCategoryId, payload, options = {}) {
  const { transaction } = options;
  const [affected] = await scoped(model.feeTypeCategoryModel).update(payload, {
    where: { feeTypeCategoryId },
    transaction,
  });
  return affected;
}

export async function deleteFeeTypeCategory(feeTypeCategoryId, options = {}) {
  const { transaction } = options;
  const deleted = await scoped(model.feeTypeCategoryModel).destroy({
    where: { feeTypeCategoryId },
    transaction,
  });
  return deleted > 0;
}
