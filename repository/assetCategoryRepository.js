import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

const excludeTs = ["createdAt", "updatedAt"];

export async function createAssetCategory(data, options = {}) {
  return scoped(model.assetCategoryModel).create(data, { transaction: options.transaction });
}

export async function findAssetCategoryByNameForInstitute(name, options = {}) {
  return scoped(model.assetCategoryModel).findOne({
    attributes: ["assetCategoryId", "name", "codePrefix"],
    where: { name },
    transaction: options.transaction,
  });
}

export async function findAssetCategoriesByInstitute(options = {}) {
  return scoped(model.assetCategoryModel).findAll({
    attributes: { exclude: excludeTs },
    order: [["assetCategoryId", "ASC"]],
    transaction: options.transaction,
  });
}

export async function findAssetCategoryById(assetCategoryId, options = {}) {
  return scoped(model.assetCategoryModel).findOne({
    attributes: { exclude: excludeTs },
    where: { assetCategoryId },
    transaction: options.transaction,
  });
}

export async function countAssetsForCategory(assetCategoryId, options = {}) {
  return scoped(model.assetModel).count({
    where: { assetCategoryId },
    transaction: options.transaction,
  });
}

export async function updateAssetCategory(assetCategoryId, payload, options = {}) {
  const [affected] = await scoped(model.assetCategoryModel).update(payload, {
    where: { assetCategoryId },
    transaction: options.transaction,
  });
  return affected;
}

export async function deleteAssetCategory(assetCategoryId, options = {}) {
  const deleted = await scoped(model.assetCategoryModel).destroy({
    where: { assetCategoryId },
    transaction: options.transaction,
  });
  return deleted > 0;
}
