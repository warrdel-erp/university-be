import { Op } from "sequelize";
import * as model from "../models/index.js";
import {
  parseAssetCodeSequenceForNameSlug,
  parseInventoryItemCopyNumber,
  nextAssetCodeSequenceFromMax,
} from "../utility/assetCode.js";

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

function buildInventoryWhere(inventoryStatus) {
  if (inventoryStatus === "assigned") {
    return { status: "ASSIGNED" };
  }
  if (inventoryStatus === "unassigned") {
    return { status: "NOT_ASSIGNED" };
  }
  return undefined;
}

function buildInventoryItemsInclude(inventoryStatus = "all", options = {}) {
  const { separate = false, includeOpenIssues = false } = options;
  const where = buildInventoryWhere(inventoryStatus);
  const nestedIncludes = [classRoomHierarchyInclude];

  if (includeOpenIssues) {
    nestedIncludes.push({
      model: model.assetIssueInventoryItemModel,
      as: "issueInventoryItems",
      attributes: ["assetIssueInventoryItemId"],
      required: false,
      where: { assetReturnTransactionId: null },
    });
  }

  return {
    model: model.assetInventoryItemModel,
    as: "inventoryItems",
    attributes: { exclude: excludeTs },
    where,
    required: false,
    separate: separate || undefined,
    include: nestedIncludes,
  };
}

function buildAssetDetailIncludes(inventoryStatus = "all", options = {}) {
  return [
    {
      model: model.assetCategoryModel,
      as: "assetCategory",
      attributes: ["assetCategoryId", "name"],
    },
    buildInventoryItemsInclude(inventoryStatus, options),
  ];
}

export async function createAsset(data, options = {}) {
  return model.assetModel.create(data, { transaction: options.transaction });
}

export async function findAssetsByInstitutePaginated(
  instituteId,
  filters = {},
  pagination = {},
  options = {}
) {
  const page = Number(pagination.page) || 1;
  const limit = Number(pagination.limit) || 20;
  const offset = (page - 1) * limit;
  const inventoryStatus = filters.inventoryStatus ?? "all";
  const assetWhere = { instituteId };

  const total = await model.assetModel.count({
    where: assetWhere,
    transaction: options.transaction,
  });

  const idRows = await model.assetModel.findAll({
    attributes: ["assetId"],
    where: assetWhere,
    order: [["assetId", "ASC"]],
    limit,
    offset,
    transaction: options.transaction,
  });

  const assetIds = idRows.map((row) => row.assetId);
  if (!assetIds.length) {
    return { rows: [], total, page, limit, inventoryStatsByAssetId: {} };
  }

  const [rows, inventoryStatsByAssetId] = await Promise.all([
    model.assetModel.findAll({
      attributes: { exclude: excludeTs },
      where: { assetId: assetIds, instituteId },
      include: buildAssetDetailIncludes(inventoryStatus, { separate: true }),
      order: [["assetId", "ASC"]],
      transaction: options.transaction,
    }),
    countInventoryStatsByAssetIds(assetIds, instituteId, options),
  ]);

  return { rows, total, page, limit, inventoryStatsByAssetId };
}

export async function findAssetById(assetId, instituteId, options = {}) {
  return model.assetModel.findOne({
    attributes: { exclude: excludeTs },
    where: { assetId, instituteId },
    include: buildAssetDetailIncludes("all", { separate: true, includeOpenIssues: true }),
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

export async function findAssetStatusesByIds(assetIds, instituteId, options = {}) {
  if (!assetIds.length) return [];

  return model.assetModel.findAll({
    attributes: ["assetId", "status"],
    where: { assetId: assetIds, instituteId },
    transaction: options.transaction,
  });
}

export async function findAssetCategoryByIdForInstitute(assetCategoryId, instituteId, options = {}) {
  return model.assetCategoryModel.findOne({
    attributes: ["assetCategoryId", "instituteId", "name", "codePrefix"],
    where: { assetCategoryId, instituteId },
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

export async function getNextAssetCodeSequence(
  instituteId,
  categoryPrefix,
  assetNamePrefix,
  options = {}
) {
  const rows = await model.assetModel.findAll({
    attributes: ["code"],
    where: { instituteId },
    transaction: options.transaction,
  });

  let maxSeq = 0;
  for (const row of rows) {
    const seq = parseAssetCodeSequenceForNameSlug(row.code, categoryPrefix, assetNamePrefix);
    if (seq !== null) {
      maxSeq = Math.max(maxSeq, seq);
    }
  }

  return { sequence: nextAssetCodeSequenceFromMax(maxSeq) };
}

export async function findAssetCodeById(assetId, instituteId, options = {}) {
  const row = await model.assetModel.findOne({
    attributes: ["code"],
    where: { assetId, instituteId },
    transaction: options.transaction,
  });
  return row?.code ?? null;
}

export async function getNextInventoryCopyNumber(assetId, instituteId, assetCode, options = {}) {
  const rows = await model.assetInventoryItemModel.findAll({
    attributes: ["code"],
    where: { assetId, instituteId },
    transaction: options.transaction,
  });

  let maxCopy = 0;
  for (const row of rows) {
    const copy = parseInventoryItemCopyNumber(row.code, assetCode);
    if (copy !== null) {
      maxCopy = Math.max(maxCopy, copy);
    }
  }
  return maxCopy;
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

/** Per-asset inventory totals and open-issue counts (Sequelize GROUP BY, 2 queries). */
export async function countInventoryStatsByAssetIds(assetIds, instituteId, options = {}) {
  if (!assetIds.length) {
    return {};
  }

  const { transaction } = options;
  const db = model.assetInventoryItemModel.sequelize;

  const [totalRows, issuedRows] = await Promise.all([
    model.assetInventoryItemModel.findAll({
      attributes: [
        "assetId",
        [db.fn("COUNT", db.col("asset_inventory_item_id")), "totalInventory"],
      ],
      where: { assetId: assetIds, instituteId },
      group: ["assetId"],
      raw: true,
      transaction,
    }),
    model.assetIssueInventoryItemModel.findAll({
      attributes: [
        [db.col("inventoryItem.asset_id"), "assetId"],
        [db.fn("COUNT", db.col("asset_issue_inventory_item_id")), "issuedCount"],
      ],
      include: [
        {
          model: model.assetInventoryItemModel,
          as: "inventoryItem",
          attributes: [],
          where: { assetId: assetIds, instituteId },
          required: true,
        },
      ],
      where: { assetReturnTransactionId: null },
      group: ["inventoryItem.asset_id"],
      raw: true,
      subQuery: false,
      transaction,
    }),
  ]);

  const statsByAssetId = Object.create(null);

  for (const row of totalRows) {
    const assetId = Number(row.assetId);
    statsByAssetId[assetId] = {
      totalInventory: Number(row.totalInventory),
      issuedCount: 0,
    };
  }

  for (const row of issuedRows) {
    const assetId = Number(row.assetId);
    if (!statsByAssetId[assetId]) {
      statsByAssetId[assetId] = { totalInventory: 0, issuedCount: 0 };
    }
    statsByAssetId[assetId].issuedCount = Number(row.issuedCount);
  }

  return statsByAssetId;
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
  return model.assetIssueInventoryItemModel.count({
    where: { assetReturnTransactionId: null },
    include: [
      {
        model: model.assetInventoryItemModel,
        as: "inventoryItem",
        attributes: [],
        where: { assetId, instituteId },
        required: true,
      },
    ],
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
