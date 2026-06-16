import { Op } from "sequelize";
import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";
import {
  parseAssetCodeSequenceForNameSlug,
  parseInventoryItemCopyNumber,
} from "../utility/assetCode.js";

const excludeTs = ["createdAt", "updatedAt"];

const classRoomHierarchyInclude = {
  model: model.classRoomModel.unscoped(),
  as: "classRoom",
  attributes: ["classRoomSectionId", "roomNumber", "floorId"],
  required: false,
  include: [
    {
      model: model.floorModel.unscoped(),
      as: "roomFloor",
      attributes: ["floorId", "name", "buildingId"],
      include: [
        {
          model: model.buildingModel.unscoped(),
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
      model: model.assetIssueInventoryItemModel.unscoped(),
      as: "issueInventoryItems",
      attributes: ["assetIssueInventoryItemId"],
      required: false,
      where: { assetReturnTransactionId: null },
    });
  }

  return {
    model: model.assetInventoryItemModel.unscoped(),
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
      model: model.assetCategoryModel.unscoped(),
      as: "assetCategory",
      attributes: ["assetCategoryId", "name"],
    },
    buildInventoryItemsInclude(inventoryStatus, options),
  ];
}

export async function createAsset(data, options = {}) {
  return scoped(model.assetModel).create(data, { transaction: options.transaction });
}

function buildAssetListWhere(filters = {}) {
  const search = filters.search?.trim();
  if (!search) {
    return {};
  }

  const pattern = { [Op.like]: `%${search}%` };

  return {
    [Op.or]: [
      { name: pattern },
      { code: pattern },
      { "$assetCategory.name$": pattern },
    ],
  };
}

function buildAssetListSearchInclude(filters = {}) {
  if (!filters.search?.trim()) {
    return [];
  }

  return [
    {
      model: model.assetCategoryModel.unscoped(),
      as: "assetCategory",
      attributes: [],
      required: false,
    },
  ];
}

export async function findAssetsByInstitutePaginated(filters = {}, pagination = {}, options = {}) {
  const page = Number(pagination.page) || 1;
  const limit = Number(pagination.limit) || 20;
  const offset = (page - 1) * limit;
  const inventoryStatus = filters.inventoryStatus ?? "all";
  const assetWhere = buildAssetListWhere(filters);
  const searchIncludes = buildAssetListSearchInclude(filters);

  const total = await scoped(model.assetModel).count({
    where: assetWhere,
    include: searchIncludes,
    distinct: Boolean(searchIncludes.length),
    col: searchIncludes.length ? "asset_id" : undefined,
    transaction: options.transaction,
  });

  const idRows = await scoped(model.assetModel).findAll({
    attributes: ["assetId"],
    where: assetWhere,
    include: searchIncludes,
    order: [["assetId", "ASC"]],
    limit,
    offset,
    subQuery: searchIncludes.length ? false : undefined,
    transaction: options.transaction,
  });

  const assetIds = idRows.map((row) => row.assetId);
  if (!assetIds.length) {
    return { rows: [], total, page, limit, inventoryStatsByAssetId: {} };
  }

  const [rows, inventoryStatsByAssetId] = await Promise.all([
    scoped(model.assetModel).findAll({
      attributes: { exclude: excludeTs },
      where: { assetId: assetIds },
      include: buildAssetDetailIncludes(inventoryStatus, {
        separate: true,
        includeOpenIssues: true,
      }),
      order: [["assetId", "ASC"]],
      transaction: options.transaction,
    }),
    countInventoryStatsByAssetIds(assetIds, options),
  ]);


  return { rows, total, page, limit, inventoryStatsByAssetId };
}

export async function findAssetById(assetId, options = {}) {
  const asset = await scoped(model.assetModel).findOne({
    attributes: { exclude: excludeTs },
    where: { assetId },
    include: buildAssetDetailIncludes("all", { separate: true, includeOpenIssues: true }),
    transaction: options.transaction,
  });

  return asset;
}

export async function findAssetStatusById(assetId, options = {}) {
  return scoped(model.assetModel).findOne({
    attributes: ["assetId", "status"],
    where: { assetId },
    transaction: options.transaction,
  });
}

export async function findAssetStatusesByIds(assetIds, options = {}) {
  if (!assetIds.length) return [];

  return scoped(model.assetModel).findAll({
    attributes: ["assetId", "status"],
    where: { assetId: assetIds },
    transaction: options.transaction,
  });
}

export async function findAssetCategoryByIdForInstitute(assetCategoryId, options = {}) {
  return scoped(model.assetCategoryModel).findOne({
    attributes: ["assetCategoryId", "instituteId", "name", "codePrefix"],
    where: { assetCategoryId },
    transaction: options.transaction,
  });
}

export async function findClassRoomSectionById(classRoomSectionId, options = {}) {
  return scoped(model.classRoomModel).findOne({
    attributes: ["classRoomSectionId"],
    where: { classRoomSectionId },
    transaction: options.transaction,
  });
}

export async function getNextAssetCodeSequence(categoryPrefix, assetNamePrefix, options = {}) {
  const rows = await scoped(model.assetModel).findAll({
    attributes: ["code"],
    transaction: options.transaction,
  });

  let maxSeq = 0;
  for (const row of rows) {
    const seq = parseAssetCodeSequenceForNameSlug(row.code, categoryPrefix, assetNamePrefix);
    if (seq !== null) {
      maxSeq = Math.max(maxSeq, seq);
    }
  }

  return { sequence: Math.max(1, maxSeq + 1) };
}

export async function findAssetCodeById(assetId, options = {}) {
  const row = await scoped(model.assetModel).findOne({
    attributes: ["code"],
    where: { assetId },
    transaction: options.transaction,
  });
  return row?.code ?? null;
}

export async function getNextInventoryCopyNumber(assetId, assetCode, options = {}) {
  const rows = await scoped(model.assetInventoryItemModel).findAll({
    attributes: ["code"],
    where: { assetId },
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

export async function findInventoryItemById(assetInventoryItemId, options = {}) {
  return scoped(model.assetInventoryItemModel).findOne({
    attributes: { exclude: excludeTs },
    where: { assetInventoryItemId },
    transaction: options.transaction,
  });
}

export async function createInventoryItem(data, options = {}) {
  return scoped(model.assetInventoryItemModel).create(data, { transaction: options.transaction });
}

export async function bulkCreateInventoryItems(rows, options = {}) {
  return scoped(model.assetInventoryItemModel).bulkCreate(rows, { transaction: options.transaction });
}

export async function updateInventoryItem(assetInventoryItemId, assetId, payload, options = {}) {
  const [affected] = await scoped(model.assetInventoryItemModel).update(payload, {
    where: { assetInventoryItemId, assetId },
    transaction: options.transaction,
  });
  return affected;
}

export async function countInventoryItemsByAsset(assetId, options = {}) {
  return scoped(model.assetInventoryItemModel).count({
    where: { assetId },
    transaction: options.transaction,
  });
}

/** Per-asset inventory totals and open-issue counts (Sequelize GROUP BY, 2 queries). */
export async function countInventoryStatsByAssetIds(assetIds, options = {}) {
  if (!assetIds.length) {
    return {};
  }

  const { transaction } = options;
  const db = model.assetInventoryItemModel.sequelize;

  const [totalRows, issuedRows] = await Promise.all([
    scoped(model.assetInventoryItemModel).findAll({
      attributes: [
        "assetId",
        [db.fn("COUNT", db.col("asset_inventory_item_id")), "totalInventory"],
      ],
      where: { assetId: assetIds },
      group: ["assetId"],
      raw: true,
      transaction,
    }),
    scoped(model.assetIssueInventoryItemModel).findAll({
      attributes: [
        [db.col("inventoryItem.asset_id"), "assetId"],
        [db.fn("COUNT", db.col("asset_issue_inventory_item_id")), "issuedCount"],
      ],
      include: [
        {
          model: model.assetInventoryItemModel.unscoped(),
          as: "inventoryItem",
          attributes: [],
          where: { assetId: assetIds },
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
  return scoped(model.assetIssueInventoryItemModel).count({
    where: {
      assetInventoryItemId,
      assetReturnTransactionId: null,
    },
    transaction: options.transaction,
  });
}

export async function countOpenIssuesForAsset(assetId, options = {}) {
  return scoped(model.assetIssueInventoryItemModel).count({
    where: { assetReturnTransactionId: null },
    include: [
      {
        model: model.assetInventoryItemModel.unscoped(),
        as: "inventoryItem",
        attributes: [],
        where: { assetId },
        required: true,
      },
    ],
    transaction: options.transaction,
  });
}

export async function deleteInventoryItem(assetInventoryItemId, options = {}) {
  const deleted = await scoped(model.assetInventoryItemModel).destroy({
    where: { assetInventoryItemId },
    transaction: options.transaction,
  });
  return deleted > 0;
}

export async function updateAsset(assetId, payload, options = {}) {
  const [affected] = await scoped(model.assetModel).update(payload, {
    where: { assetId },
    transaction: options.transaction,
  });
  return affected;
}

export async function deleteAsset(assetId, options = {}) {
  const deleted = await scoped(model.assetModel).destroy({
    where: { assetId },
    transaction: options.transaction,
  });
  return deleted > 0;
}
