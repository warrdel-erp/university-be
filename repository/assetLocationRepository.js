import { Op } from "sequelize";
import * as model from "../models/index.js";

const roomHierarchyInclude = [
  {
    model: model.classRoomModel,
    as: "classRoom",
    attributes: ["classRoomSectionId", "roomNumber", "floorId"],
    include: [
      {
        model: model.floorModel,
        as: "roomFloor",
        attributes: ["floorId", "name", "buildingId"],
        include: [
          {
            model: model.buildingModel,
            as: "floorBuilding",
            attributes: ["buildingId", "name", "buildingType", "campusId"],
          },
        ],
      },
    ],
  },
];

export async function createAssetLocation(data, options = {}) {
  return model.assetLocationModel.create(data, { transaction: options.transaction });
}

export async function findAssetLocationsByInstitute(instituteId, options = {}) {
  return model.assetLocationModel.findAll({
    attributes: { exclude: ["createdAt", "updatedAt"] },
    where: { instituteId },
    include: roomHierarchyInclude,
    order: [["assetLocationId", "ASC"]],
    transaction: options.transaction,
  });
}

export async function findAssetLocationById(assetLocationId, instituteId, options = {}) {
  return model.assetLocationModel.findOne({
    attributes: { exclude: ["createdAt", "updatedAt"] },
    where: { assetLocationId, instituteId },
    include: roomHierarchyInclude,
    transaction: options.transaction,
  });
}

export async function findAssetLocationByClassRoomSection(
  classRoomSectionId,
  instituteId,
  options = {}
) {
  const where = { classRoomSectionId, instituteId };
  if (options.excludeAssetLocationId) {
    where.assetLocationId = { [Op.ne]: options.excludeAssetLocationId };
  }

  return model.assetLocationModel.findOne({
    attributes: ["assetLocationId"],
    where,
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
