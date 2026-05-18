import * as model from "../models/index.js";

const categoryExclude = ["createdAt", "updatedAt"];

export async function createFeeTypeCategory(data, options = {}) {
  return model.feeTypeCategoryModel.create(data, { transaction: options.transaction });
}

export async function findFeeTypeCategoriesByInstitute(instituteId, options = {}) {
  const { transaction } = options;
  return model.feeTypeCategoryModel.findAll({
    attributes: { exclude: categoryExclude },
    where: { instituteId },
    order: [["feeTypeCategoryId", "ASC"]],
    transaction,
  });
}

export async function findFeeTypeCategoryById(feeTypeCategoryId, instituteId, options = {}) {
  const { transaction } = options;
  return model.feeTypeCategoryModel.findOne({
    attributes: { exclude: categoryExclude },
    where: { feeTypeCategoryId, instituteId },
    transaction,
  });
}

export async function countCatalogRowsForCategory(feeTypeCategoryId, options = {}) {
  const { transaction } = options;
  return model.feeTypeCatalogModel.count({
    where: { feeTypeCategoryId },
    transaction,
  });
}

export async function updateFeeTypeCategory(feeTypeCategoryId, instituteId, payload, options = {}) {
  const { transaction } = options;
  const [affected] = await model.feeTypeCategoryModel.update(payload, {
    where: { feeTypeCategoryId, instituteId },
    transaction,
  });
  return affected;
}

export async function deleteFeeTypeCategory(feeTypeCategoryId, instituteId, options = {}) {
  const { transaction } = options;
  const deleted = await model.feeTypeCategoryModel.destroy({
    where: { feeTypeCategoryId, instituteId },
    transaction,
  });
  return deleted > 0;
}
