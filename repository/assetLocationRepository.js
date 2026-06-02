import * as model from "../models/index.js";

const excludeTs = ["createdAt", "updatedAt"];

const assetLocationIncludes = [
  {
    model: model.assetModel,
    as: "asset",
    required: false,
    attributes: ["assetId", "name", "code", "status", "condition"],
  },
  {
    model: model.classRoomModel,
    as: "classRoom",
    required: false,
    attributes: ["classRoomSectionId", "roomNumber", "capacity"],
  },
];

export async function createAssetLocation(data, options = {}) {
  return model.assetLocationModel.create(data, { transaction: options.transaction });
}

export async function findAssetByIdForInstitute(assetId, instituteId, options = {}) {
  return model.assetModel.findOne({
    attributes: ["assetId", "instituteId"],
    where: { assetId, instituteId },
    transaction: options.transaction,
  });
}

export async function findClassRoomSectionById(classRoomSectionId, options = {}) {
  return model.classRoomModel.findOne({
    attributes: ["classRoomSectionId"],
    where: { classRoomSectionId },
    transaction: options.transaction,
  });
}

export async function findAssetLocationsByInstitute(instituteId, options = {}) {
  const { assetId, transaction } = options;
  const where = { instituteId };
  if (assetId != null) {
    where.assetId = assetId;
  }

  return model.assetLocationModel.findAll({
    attributes: { exclude: excludeTs },
    where,
    include: assetLocationIncludes,
    order: [["assetLocationId", "ASC"]],
    transaction,
  });
}

export async function findAssetLocationById(assetLocationId, instituteId, options = {}) {
  return model.assetLocationModel.findOne({
    attributes: { exclude: excludeTs },
    where: { assetLocationId, instituteId },
    include: assetLocationIncludes,
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
