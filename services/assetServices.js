import { randomUUID } from "crypto";
import sequelize from "../database/sequelizeConfig.js";
import * as repo from "../repository/assetRepository.js";
import {
  decimalCompare,
  decimalGreaterThanOrEqual,
  decimalSubtract,
  toMoneyNumber,
} from "../utility/decimalMoney.js";
import {
  deriveAssetNameCodePrefix,
  formatAssetCode,
  formatInventoryItemCode,
} from "../utility/assetCode.js";

/** ISSUED only when every inventory copy has an open issue; otherwise IN_STOCK. */
export function deriveAssetStatusFromInventory(openIssues, totalInventory) {
  if (decimalCompare(totalInventory, 0) === 0) {
    return "IN_STOCK";
  }
  return decimalGreaterThanOrEqual(openIssues, totalInventory) ? "ISSUED" : "IN_STOCK";
}

export async function syncAssetStatusFromInventory(assetId, options = {}) {
  await syncAssetStatusesFromInventory([assetId], options);
}

export async function syncAssetStatusesFromInventory(assetIds, options = {}) {
  const uniqueAssetIds = [...new Set(assetIds)];
  if (!uniqueAssetIds.length) {
    return;
  }

  const { transaction } = options;
  const [assets, statsByAssetId] = await Promise.all([
    repo.findAssetStatusesByIds(uniqueAssetIds, { transaction }),
    repo.countInventoryStatsByAssetIds(uniqueAssetIds, { transaction }),
  ]);

  await Promise.all(
    assets.map(async (asset) => {
      if (asset.status === "MAINTANANCE") {
        return;
      }

      const stats = statsByAssetId[asset.assetId] ?? { totalInventory: 0, issuedCount: 0 };
      const nextStatus = deriveAssetStatusFromInventory(stats.issuedCount, stats.totalInventory);

      if (asset.status !== nextStatus) {
        await repo.updateAsset(asset.assetId, { status: nextStatus }, { transaction });
      }
    })
  );
}

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function toPlain(row) {
  if (!row) return null;
  return typeof row.get === "function" ? row.get({ plain: true }) : row;
}

function buildInventoryCounts(totalInventory = 0, issuedCount = 0) {
  const total = toMoneyNumber(totalInventory);
  const issued = toMoneyNumber(issuedCount);

  return {
    totalInventory: total,
    issuedCount: issued,
    nonIssuedCount: decimalSubtract(total, issued),
  };
}

function attachInventoryCounts(assetPlain, statsByAssetId = {}) {
  const raw = statsByAssetId[assetPlain.assetId];
  const counts = buildInventoryCounts(raw?.totalInventory, raw?.issuedCount);
  return { ...assetPlain, ...counts };
}

function applyInventoryIssueStatus(assetPlain) {
  if (!assetPlain?.inventoryItems?.length) {
    return assetPlain;
  }

  const inventoryItems = [];
  for (const item of assetPlain.inventoryItems) {
    const { issueInventoryItems, ...inventoryItem } = item;
    inventoryItems.push({
      ...inventoryItem,
      issueStatus: issueInventoryItems?.length ? "issued" : "available",
    });
  }

  return { ...assetPlain, inventoryItems };
}

function formatAssetResponse(assetRow, inventoryStatsByAssetId = {}) {
  return attachInventoryCounts(applyInventoryIssueStatus(toPlain(assetRow)), inventoryStatsByAssetId);
}

function stripInventoryAppendFields(body) {
  const { assetId, inventoryBulk, inventory, ...rest } = body;
  return rest;
}

function hasInventoryAppend(body) {
  return body.inventoryBulk !== undefined;
}

function hasInventoryAssign(body) {
  return body.inventory !== undefined;
}

async function assignInventoryItems(items, assetId, transaction) {
  for (const item of items) {
    await validateClassRoomSectionId(item.classRoomSectionId, transaction);

    const existing = await repo.findInventoryItemById(
      item.assetInventoryItemId,
      { transaction }
    );

    if (!existing || existing.assetId !== assetId) {
      throw httpError("Inventory item not found or does not belong to this asset", 404);
    }

    const affected = await repo.updateInventoryItem(
      item.assetInventoryItemId,
      assetId,
      {
        classRoomSectionId: item.classRoomSectionId,
        status: inventoryStatusForRoom(item.classRoomSectionId),
      },
      { transaction }
    );

    if (!affected) {
      throw httpError("Failed to assign inventory item to room", 500);
    }
  }
}

async function appendInventoryOnAsset(body, assetId, transaction) {
  const assetCode = await repo.findAssetCodeById(assetId, { transaction });
  if (!assetCode) {
    throw httpError("Asset not found or not in your institute", 404);
  }

  await createInventoryRowsByBulkGroups(body.inventoryBulk, assetId, assetCode, transaction);
}

function updatePayload(body) {
  return Object.fromEntries(
    Object.entries(stripInventoryAppendFields(body)).filter(([, v]) => v !== undefined)
  );
}

async function resolveAssetCategory(assetCategoryId, transaction) {
  const category = await repo.findAssetCategoryByIdForInstitute(assetCategoryId, { transaction });
  if (!category) {
    throw httpError("assetCategoryId not found or not in your institute", 404);
  }
  return category;
}

async function resolveNextAssetCode(name, assetCategoryId, transaction) {
  const category = await resolveAssetCategory(assetCategoryId, transaction);
  const assetNamePrefix = deriveAssetNameCodePrefix(name);
  const { sequence } = await repo.getNextAssetCodeSequence(
    category.codePrefix,
    assetNamePrefix,
    { transaction }
  );

  return {
    code: formatAssetCode(category.codePrefix, assetNamePrefix, sequence),
    category,
    assetNamePrefix,
    sequence,
  };
}

async function validateAssetReferences(body, transaction) {
  if (body.assetCategoryId !== undefined) {
    await resolveAssetCategory(body.assetCategoryId, transaction);
  }
}

async function validateClassRoomSectionId(classRoomSectionId, transaction) {
  const room = await repo.findClassRoomSectionById(classRoomSectionId, { transaction });
  if (!room) {
    throw httpError("classRoomSectionId not found", 404);
  }
}

function inventoryStatusForRoom(classRoomSectionId) {
  return classRoomSectionId != null ? "ASSIGNED" : "NOT_ASSIGNED";
}

function buildInventoryRow(classRoomSectionId, assetId, assetCode, copyNumber) {
  return {
    code: formatInventoryItemCode(assetCode, copyNumber),
    barcode: randomUUID(),
    classRoomSectionId: classRoomSectionId ?? null,
    status: inventoryStatusForRoom(classRoomSectionId),
    assetId,
  };
}

async function appendBulkInventoryPayloads(
  count,
  classRoomSectionId,
  assetId,
  assetCode,
  transaction,
  startCopy
) {
  const roomId = classRoomSectionId ?? null;
  if (roomId != null) {
    await validateClassRoomSectionId(roomId, transaction);
  }

  let maxCopy =
    startCopy ?? (await repo.getNextInventoryCopyNumber(assetId, assetCode, { transaction }));
  const rows = [];

  for (let i = 0; i < count; i++) {
    maxCopy += 1;
    rows.push(buildInventoryRow(roomId, assetId, assetCode, maxCopy));
  }

  return { rows, nextCopy: maxCopy };
}

async function createInventoryRows(inventoryList, assetId, assetCode, transaction) {
  let maxCopy = await repo.getNextInventoryCopyNumber(assetId, assetCode, { transaction });

  for (const item of inventoryList) {
    if (item.classRoomSectionId != null) {
      await validateClassRoomSectionId(item.classRoomSectionId, transaction);
    }
    maxCopy += 1;
    await repo.createInventoryItem(
      buildInventoryRow(item.classRoomSectionId, assetId, assetCode, maxCopy),
      { transaction }
    );
  }
}

async function createInventoryRowsByBulkGroups(groups, assetId, assetCode, transaction) {
  let maxCopy = await repo.getNextInventoryCopyNumber(assetId, assetCode, { transaction });
  const allRows = [];

  for (const group of groups) {
    const { rows, nextCopy } = await appendBulkInventoryPayloads(
      group.count,
      group.classRoomSectionId,
      assetId,
      assetCode,
      transaction,
      maxCopy
    );
    allRows.push(...rows);
    maxCopy = nextCopy;
  }

  if (allRows.length) {
    await repo.bulkCreateInventoryItems(allRows, { transaction });
  }
}

export async function previewAssetCode(query) {
  const { code, category } = await resolveNextAssetCode(query.name, query.assetCategoryId);

  return {
    name: query.name,
    assetCategoryId: category.assetCategoryId,
    assetCategoryName: category.name,
    code,
  };
}

export async function addAsset(body) {
  const row = await sequelize.transaction(async (transaction) => {
    await validateAssetReferences(body, transaction);

    const { code: assetCode } = await resolveNextAssetCode(
      body.name,
      body.assetCategoryId,
      transaction
    );

    const created = await repo.createAsset(
      {
        name: body.name,
        code: assetCode,
        status: "IN_STOCK",
        condition: body.condition,
        description: body.description ?? null,
        assetCategoryId: body.assetCategoryId,
      },
      { transaction }
    );

    if (hasInventoryAppend(body)) {
      await appendInventoryOnAsset(body, created.assetId, transaction);
    }

    await syncAssetStatusFromInventory(created.assetId, { transaction });

    return await repo.findAssetById(created.assetId, { transaction });
  });

  const inventoryStatsByAssetId = await repo.countInventoryStatsByAssetIds([row.assetId]);
  return formatAssetResponse(row, inventoryStatsByAssetId);
}

export async function listAssets(query = {}) {
  const { rows, total, page, limit, inventoryStatsByAssetId } = await sequelize.transaction(
    (transaction) =>
      repo.findAssetsByInstitutePaginated(
        { inventoryStatus: query.status, search: query.search },
        { page: query.page, limit: query.limit },
        { transaction }
      )
  );

  return {
    data: {
      assets: rows.map((row) => formatAssetResponse(row, inventoryStatsByAssetId)),
    },
    pagination: { page, limit, total },
  };
}

export async function getSingleAsset(assetId) {
  const asset = await repo.findAssetById(assetId);
  if (!asset) {
    return null;
  }

  const inventoryStatsByAssetId = await repo.countInventoryStatsByAssetIds([assetId]);
  return formatAssetResponse(asset, inventoryStatsByAssetId);
}

export async function updateAsset(assetId, body) {
  const updated = await sequelize.transaction(async (transaction) => {
    const existing = await repo.findAssetById(assetId, { transaction });
    if (!existing) {
      throw httpError("Asset not found or not in your institute", 404);
    }

    const payload = updatePayload(body);
    if (Object.keys(payload).length) {
      await validateAssetReferences(payload, transaction);
      const affected = await repo.updateAsset(assetId, payload, { transaction });
      if (!affected) {
        throw httpError("Update failed", 500);
      }
    }

    if (hasInventoryAppend(body)) {
      await appendInventoryOnAsset(body, assetId, transaction);
    }

    if (hasInventoryAssign(body)) {
      await assignInventoryItems(body.inventory, assetId, transaction);
    }

    await syncAssetStatusFromInventory(assetId, { transaction });

    return await repo.findAssetById(assetId, { transaction });
  });

  const inventoryStatsByAssetId = await repo.countInventoryStatsByAssetIds([assetId]);
  return formatAssetResponse(updated, inventoryStatsByAssetId);
}

export async function deleteAsset(assetId) {
  await sequelize.transaction(async (transaction) => {
    const existing = await repo.findAssetById(assetId, { transaction });
    if (!existing) {
      throw httpError("Asset not found or not in your institute", 404);
    }

    const inventoryCount = await repo.countInventoryItemsByAsset(assetId, { transaction });
    const openIssues = await repo.countOpenIssuesForAsset(assetId, { transaction });

    if (openIssues > 0) {
      throw httpError(
        "Cannot delete asset: one or more inventory items are currently issued. Return them first.",
        409
      );
    }

    if (inventoryCount > 0) {
      throw httpError(
        "Cannot delete asset that has inventory items. Delete all inventory items first.",
        409
      );
    }

    const ok = await repo.deleteAsset(assetId, { transaction });
    if (!ok) {
      throw httpError("Delete failed", 500);
    }
  });
  return true;
}

export async function deleteAssetInventoryItem(assetInventoryItemId) {
  await sequelize.transaction(async (transaction) => {
    const item = await repo.findInventoryItemById(assetInventoryItemId, { transaction });
    if (!item) {
      throw httpError("Inventory item not found or not in your institute", 404);
    }

    const openIssues = await repo.countOpenIssuesForInventoryItem(assetInventoryItemId, {
      transaction,
    });
    if (openIssues > 0) {
      throw httpError("Cannot delete inventory item that is currently issued", 409);
    }

    const assetId = item.assetId;

    const ok = await repo.deleteInventoryItem(assetInventoryItemId, { transaction });
    if (!ok) {
      throw httpError("Delete failed", 500);
    }

    await syncAssetStatusFromInventory(assetId, { transaction });
  });
  return true;
}
