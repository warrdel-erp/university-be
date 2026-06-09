import * as model from "../models/index.js";

const excludeTs = ["createdAt", "updatedAt"];

export async function createAssetCategory(data, options = {}) {
  return model.assetCategoryModel.create(data, { transaction: options.transaction });
}

export async function findAssetCategoryByNameForInstitute(name, instituteId, options = {}) {
  return model.assetCategoryModel.findOne({
    attributes: ["assetCategoryId", "name", "codePrefix"],
    where: { name, instituteId },
    transaction: options.transaction,
  });
}

export async function findAssetCategoriesByInstitute(instituteId, options = {}) {
  return model.assetCategoryModel.findAll({
    attributes: { exclude: excludeTs },
    where: { instituteId },
    order: [["assetCategoryId", "ASC"]],
    transaction: options.transaction,
  });
}

export async function findAssetCategoryById(assetCategoryId, instituteId, options = {}) {
  return model.assetCategoryModel.findOne({
    attributes: { exclude: excludeTs },
    where: { assetCategoryId, instituteId },
    transaction: options.transaction,
  });
}

export async function countAssetsForCategory(assetCategoryId, instituteId, options = {}) {
  return model.assetModel.count({
    where: { assetCategoryId, instituteId },
    transaction: options.transaction,
  });
}

export async function updateAssetCategory(assetCategoryId, instituteId, payload, options = {}) {
  const [affected] = await model.assetCategoryModel.update(payload, {
    where: { assetCategoryId, instituteId },
    transaction: options.transaction,
  });
  return affected;
}

export async function deleteAssetCategory(assetCategoryId, instituteId, options = {}) {
  const deleted = await model.assetCategoryModel.destroy({
    where: { assetCategoryId, instituteId },
    transaction: options.transaction,
  });
  return deleted > 0;
}
