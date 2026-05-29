import * as model from "../models/index.js";

const excludeTs = ["createdAt", "updatedAt"];

const assetIncludes = [
  {
    model: model.assetCategoryModel,
    as: "assetCategory",
    attributes: ["assetCategoryId", "name"],
  },
  {
    model: model.departmentModel,
    as: "department",
    attributes: ["departmentId", "departmentName"],
  },
];

export async function createAsset(data, options = {}) {
  return model.assetModel.create(data, { transaction: options.transaction });
}

export async function findAssetsByInstitute(instituteId, options = {}) {
  return model.assetModel.findAll({
    attributes: { exclude: excludeTs },
    where: { instituteId },
    include: [
      {
        model: model.assetCategoryModel,
        as: "assetCategory",
        attributes: ["assetCategoryId", "name"],
      },
      {
        model: model.departmentModel,
        as: "department",
        attributes: ["departmentId", "departmentName"],
      },
    ],
    order: [["assetId", "ASC"]],
    transaction: options.transaction,
  });
}

export async function findAssetById(assetId, instituteId, options = {}) {
  return model.assetModel.findOne({
    attributes: { exclude: excludeTs },
    where: { assetId, instituteId },
    include: [
      {
        model: model.assetCategoryModel,
        as: "assetCategory",
        attributes: ["assetCategoryId", "name"],
      },
      {
        model: model.departmentModel,
        as: "department",
        attributes: ["departmentId", "departmentName"],
      },
    ],
    transaction: options.transaction,
  });
}

export async function findAssetCategoryByIdForInstitute(assetCategoryId, instituteId, options = {}) {
  return model.assetCategoryModel.findOne({
    attributes: ["assetCategoryId", "instituteId"],
    where: { assetCategoryId, instituteId },
    transaction: options.transaction,
  });
}

export async function findDepartmentById(departmentId, options = {}) {
  return model.departmentModel.findOne({
    attributes: ["departmentId"],
    where: { departmentId },
    transaction: options.transaction,
  });
}

export async function updateAsset(assetId, instituteId, payload, options = {}) {
  const [affected] = await model.assetModel.update(payload, {
    where: { assetId, instituteId },
    transaction: options.transaction,
  });
  return affected;
}

export async function deleteAsset(assetId, instituteId, options = {}) {
  const deleted = await model.assetModel.destroy({
    where: { assetId, instituteId },
    transaction: options.transaction,
  });
  return deleted > 0;
}
