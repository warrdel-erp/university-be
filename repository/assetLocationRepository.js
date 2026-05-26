import * as model from "../models/index.js";

const excludeTs = ["createdAt", "updatedAt"];

export async function createAssetLocation(data, options = {}) {
  return model.assetLocationModel.create(data, { transaction: options.transaction });
}

export async function findAssetLocationsByInstitute(instituteId, options = {}) {
  return model.assetLocationModel.findAll({
    attributes: { exclude: excludeTs },
    where: { instituteId },
    order: [["assetLocationId", "ASC"]],
    transaction: options.transaction,
  });
}

export async function findAssetLocationById(assetLocationId, instituteId, options = {}) {
  return model.assetLocationModel.findOne({
    attributes: { exclude: excludeTs },
    where: { assetLocationId, instituteId },
    transaction: options.transaction,
  });
}

export async function updateAssetLocation(assetLocationId, instituteId, payload, options = {}) {
  const [affected] = await model.assetLocationModel.update(payload, {
    where: { assetLocationId, instituteId },
    transaction: options.transaction,
  });
  return affected;
}

export async function deleteAssetLocation(assetLocationId, instituteId, options = {}) {
  const deleted = await model.assetLocationModel.destroy({
    where: { assetLocationId, instituteId },
    transaction: options.transaction,
  });
  return deleted > 0;
}
