import { Op } from "sequelize";
import * as model from "../models/index.js";

const excludeTs = ["createdAt", "updatedAt"];

const classRoomHierarchyInclude = {
  model: model.classRoomModel,
  as: "classRoom",
  attributes: ["classRoomSectionId", "roomNumber", "floorId"],
  required: false,
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
};

const inventoryItemsInclude = {
  model: model.assetInventoryItemModel,
  as: "inventoryItems",
  attributes: { exclude: excludeTs },
  include: [classRoomHierarchyInclude],
};

const assetDetailIncludes = [
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
  inventoryItemsInclude,
];

export async function createAsset(data, options = {}) {
  return model.assetModel.create(data, { transaction: options.transaction });
}

export async function findAssetsByInstitute(instituteId, options = {}) {
  return model.assetModel.findAll({
    attributes: { exclude: excludeTs },
    where: { instituteId },
    include: assetDetailIncludes,
    order: [["assetId", "ASC"]],
    transaction: options.transaction,
  });
}

export async function findAssetById(assetId, instituteId, options = {}) {
  return model.assetModel.findOne({
    attributes: { exclude: excludeTs },
    where: { assetId, instituteId },
    include: assetDetailIncludes,
    transaction: options.transaction,
  });
}

export async function findAssetStatusById(assetId, instituteId, options = {}) {
  return model.assetModel.findOne({
    attributes: ["assetId", "status"],
    where: { assetId, instituteId },
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

export async function findClassRoomSectionById(classRoomSectionId, options = {}) {
  return model.classRoomModel.findOne({
    attributes: ["classRoomSectionId"],
    where: { classRoomSectionId },
    transaction: options.transaction,
  });
}

export async function getNextInventoryCodeSequence(instituteId, options = {}) {
  const rows = await model.assetInventoryItemModel.findAll({
    attributes: ["code"],
    where: {
      instituteId,
      code: { [Op.like]: "AST-%" },
    },
    transaction: options.transaction,
  });

  let maxSeq = 0;
  for (const row of rows) {
    const match = /^AST-(\d+)$/.exec(row.code);
    if (match) {
      maxSeq = Math.max(maxSeq, Number.parseInt(match[1], 10));
    }
  }
  return maxSeq;
}

export async function findInventoryItemById(assetInventoryItemId, instituteId, options = {}) {
  return model.assetInventoryItemModel.findOne({
    attributes: { exclude: excludeTs },
    where: { assetInventoryItemId, instituteId },
    transaction: options.transaction,
  });
}

export async function createInventoryItem(data, options = {}) {
  return model.assetInventoryItemModel.create(data, { transaction: options.transaction });
}

export async function bulkCreateInventoryItems(rows, options = {}) {
  return model.assetInventoryItemModel.bulkCreate(rows, { transaction: options.transaction });
}

export async function updateInventoryItem(
  assetInventoryItemId,
  instituteId,
  assetId,
  payload,
  options = {}
) {
  const [affected] = await model.assetInventoryItemModel.update(payload, {
    where: { assetInventoryItemId, instituteId, assetId },
    transaction: options.transaction,
  });
  return affected;
}

export async function countInventoryItemsByAsset(assetId, instituteId, options = {}) {
  return model.assetInventoryItemModel.count({
    where: { assetId, instituteId },
    transaction: options.transaction,
  });
}

export async function countOpenIssuesForInventoryItem(assetInventoryItemId, options = {}) {
  return model.assetIssueInventoryItemModel.count({
    where: {
      assetInventoryItemId,
      assetReturnTransactionId: null,
    },
    transaction: options.transaction,
  });
}

export async function countOpenIssuesForAsset(assetId, instituteId, options = {}) {
  const inventoryItems = await model.assetInventoryItemModel.findAll({
    attributes: ["assetInventoryItemId"],
    where: { assetId, instituteId },
    transaction: options.transaction,
  });
  if (!inventoryItems.length) return 0;

  const inventoryIds = inventoryItems.map((row) => row.assetInventoryItemId);
  return model.assetIssueInventoryItemModel.count({
    where: {
      assetInventoryItemId: { [Op.in]: inventoryIds },
      assetReturnTransactionId: null,
    },
    transaction: options.transaction,
  });
}

export async function deleteInventoryItem(assetInventoryItemId, instituteId, options = {}) {
  const deleted = await model.assetInventoryItemModel.destroy({
    where: { assetInventoryItemId, instituteId },
    transaction: options.transaction,
  });
  return deleted > 0;
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
