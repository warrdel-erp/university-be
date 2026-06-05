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

export async function syncAssetStatusFromInventory(assetId, instituteId, options = {}) {
  await syncAssetStatusesFromInventory([assetId], instituteId, options);
}

export async function syncAssetStatusesFromInventory(assetIds, instituteId, options = {}) {
  const uniqueAssetIds = [...new Set(assetIds)];
  if (!uniqueAssetIds.length) {
    return;
  }

  const { transaction } = options;
  const [assets, statsByAssetId] = await Promise.all([
    repo.findAssetStatusesByIds(uniqueAssetIds, instituteId, { transaction }),
    repo.countInventoryStatsByAssetIds(uniqueAssetIds, instituteId, { transaction }),
  ]);

  await Promise.all(
    assets.map(async (asset) => {
      if (asset.status === "MAINTANANCE") {
        return;
      }

      const stats = statsByAssetId[asset.assetId] ?? { totalInventory: 0, issuedCount: 0 };
      const nextStatus = deriveAssetStatusFromInventory(stats.issuedCount, stats.totalInventory);

      if (asset.status !== nextStatus) {
        await repo.updateAsset(asset.assetId, instituteId, { status: nextStatus }, { transaction });
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

function computeInventoryStatsFromLoadedItems(inventoryItems = []) {
  const issuedCount = inventoryItems.filter((item) => (item.issueInventoryItems ?? []).length > 0).length;

  return buildInventoryCounts(inventoryItems.length, issuedCount);
}

function stripOpenIssueLinesFromInventoryItems(assetPlain) {
  return {
    ...assetPlain,
    inventoryItems: (assetPlain.inventoryItems ?? []).map(({ issueInventoryItems, ...item }) => item),
  };
}

function attachInventoryCountsFromLoadedItems(assetPlain) {
  const counts = computeInventoryStatsFromLoadedItems(assetPlain.inventoryItems);
  return { ...stripOpenIssueLinesFromInventoryItems(assetPlain), ...counts };
}

function stripInventoryAppendFields(body) {
  const { assetId, inventoryBulk, ...rest } = body;
  return rest;
}

function hasInventoryAppend(body) {
  return body.inventoryBulk !== undefined;
}

async function appendInventoryOnAsset(body, assetId, instituteId, transaction) {
  const assetCode = await repo.findAssetCodeById(assetId, instituteId, { transaction });
  if (!assetCode) {
    throw httpError("Asset not found or not in your institute", 404);
  }

  await createInventoryRowsByBulkGroups(
    body.inventoryBulk,
    assetId,
    instituteId,
    assetCode,
    transaction
  );
}

function updatePayload(body) {
  return Object.fromEntries(
    Object.entries(stripInventoryAppendFields(body)).filter(([, v]) => v !== undefined)
  );
}

async function resolveAssetCategory(assetCategoryId, instituteId, transaction) {
  const category = await repo.findAssetCategoryByIdForInstitute(
    assetCategoryId,
    instituteId,
    { transaction }
  );
  if (!category) {
    throw httpError("assetCategoryId not found or not in your institute", 404);
  }
  if (!category.codePrefix) {
    throw httpError("Asset category code prefix is not configured", 400);
  }
  return category;
}

async function validateAssetReferences(body, instituteId, transaction) {
  if (body.assetCategoryId !== undefined) {
    await resolveAssetCategory(body.assetCategoryId, instituteId, transaction);
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

function buildInventoryRow(classRoomSectionId, assetId, instituteId, assetCode, copyNumber) {
  return {
    code: formatInventoryItemCode(assetCode, copyNumber),
    barcode: randomUUID(),
    classRoomSectionId: classRoomSectionId ?? null,
    status: inventoryStatusForRoom(classRoomSectionId),
    assetId,
    instituteId,
  };
}

async function appendBulkInventoryPayloads(
  count,
  classRoomSectionId,
  assetId,
  instituteId,
  assetCode,
  transaction,
  startCopy
) {
  const roomId = classRoomSectionId ?? null;
  if (roomId != null) {
    await validateClassRoomSectionId(roomId, transaction);
  }

  let maxCopy =
    startCopy ??
    (await repo.getNextInventoryCopyNumber(assetId, instituteId, assetCode, { transaction }));
  const rows = [];

  for (let i = 0; i < count; i++) {
    maxCopy += 1;
    rows.push(buildInventoryRow(roomId, assetId, instituteId, assetCode, maxCopy));
  }

  return { rows, nextCopy: maxCopy };
}

async function createInventoryRows(inventoryList, assetId, instituteId, assetCode, transaction) {
  let maxCopy = await repo.getNextInventoryCopyNumber(assetId, instituteId, assetCode, {
    transaction,
  });

  for (const item of inventoryList) {
    if (item.classRoomSectionId != null) {
      await validateClassRoomSectionId(item.classRoomSectionId, transaction);
    }
    maxCopy += 1;
    await repo.createInventoryItem(
      buildInventoryRow(item.classRoomSectionId, assetId, instituteId, assetCode, maxCopy),
      { transaction }
    );
  }
}

async function createInventoryRowsByBulkGroups(
  groups,
  assetId,
  instituteId,
  assetCode,
  transaction
) {
  let maxCopy = await repo.getNextInventoryCopyNumber(assetId, instituteId, assetCode, {
    transaction,
  });
  const allRows = [];

  for (const group of groups) {
    const { rows, nextCopy } = await appendBulkInventoryPayloads(
      group.count,
      group.classRoomSectionId,
      assetId,
      instituteId,
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

export async function addAsset(body, instituteId) {
  const row = await sequelize.transaction(async (transaction) => {
    await validateAssetReferences(body, instituteId, transaction);

    const category = await resolveAssetCategory(body.assetCategoryId, instituteId, transaction);
    const assetNamePrefix = deriveAssetNameCodePrefix(body.name);
    const { sequence } = await repo.getNextAssetCodeSequence(
      instituteId,
      category.codePrefix,
      assetNamePrefix,
      { transaction }
    );

    const assetCode = formatAssetCode(category.codePrefix, assetNamePrefix, sequence);

    const created = await repo.createAsset(
      {
        name: body.name,
        code: assetCode,
        status: "IN_STOCK",
        condition: body.condition,
        description: body.description ?? null,
        assetCategoryId: body.assetCategoryId,
        instituteId,
      },
      { transaction }
    );

    if (hasInventoryAppend(body)) {
      await appendInventoryOnAsset(body, created.assetId, instituteId, transaction);
    }

    await syncAssetStatusFromInventory(created.assetId, instituteId, { transaction });

    return await repo.findAssetById(created.assetId, instituteId, { transaction });
  });

  return toPlain(row);
}

export async function listAssets(instituteId, query = {}) {
  const { rows, total, page, limit, inventoryStatsByAssetId } = await sequelize.transaction(
    (transaction) =>
      repo.findAssetsByInstitutePaginated(
        instituteId,
        { inventoryStatus: query.status },
        { page: query.page, limit: query.limit },
        { transaction }
      )
  );

  return {
    data: {
      assets: rows.map((row) => attachInventoryCounts(toPlain(row), inventoryStatsByAssetId)),
    },
    pagination: { page, limit, total },
  };
}

export async function getSingleAsset(assetId, instituteId) {
  const asset = await repo.findAssetById(assetId, instituteId);
  if (!asset) {
    return null;
  }

  return attachInventoryCountsFromLoadedItems(toPlain(asset));
}

export async function updateAsset(assetId, body, instituteId) {
  const updated = await sequelize.transaction(async (transaction) => {
    const existing = await repo.findAssetById(assetId, instituteId, { transaction });
    if (!existing) {
      throw httpError("Asset not found or not in your institute", 404);
    }

    const payload = updatePayload(body);
    if (Object.keys(payload).length) {
      await validateAssetReferences(payload, instituteId, transaction);
      const affected = await repo.updateAsset(assetId, instituteId, payload, { transaction });
      if (!affected) {
        throw httpError("Update failed", 500);
      }
    }

    if (hasInventoryAppend(body)) {
      await appendInventoryOnAsset(body, assetId, instituteId, transaction);
    }

    await syncAssetStatusFromInventory(assetId, instituteId, { transaction });

    return await repo.findAssetById(assetId, instituteId, { transaction });
  });

  return toPlain(updated);
}

export async function deleteAsset(assetId, instituteId) {
  await sequelize.transaction(async (transaction) => {
    const existing = await repo.findAssetById(assetId, instituteId, { transaction });
    if (!existing) {
      throw httpError("Asset not found or not in your institute", 404);
    }

    const inventoryCount = await repo.countInventoryItemsByAsset(assetId, instituteId, { transaction });
    const openIssues = await repo.countOpenIssuesForAsset(assetId, instituteId, { transaction });

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

    const ok = await repo.deleteAsset(assetId, instituteId, { transaction });
    if (!ok) {
      throw httpError("Delete failed", 500);
    }
  });
  return true;
}

export async function deleteAssetInventoryItem(assetInventoryItemId, instituteId) {
  await sequelize.transaction(async (transaction) => {
    const item = await repo.findInventoryItemById(assetInventoryItemId, instituteId, { transaction });
    if (!item) {
      throw httpError("Inventory item not found or not in your institute", 404);
    }

    const openIssues = await repo.countOpenIssuesForInventoryItem(assetInventoryItemId, { transaction });
    if (openIssues > 0) {
      throw httpError("Cannot delete inventory item that is currently issued", 409);
    }

    const assetId = item.assetId;

    const ok = await repo.deleteInventoryItem(assetInventoryItemId, instituteId, { transaction });
    if (!ok) {
      throw httpError("Delete failed", 500);
    }

    await syncAssetStatusFromInventory(assetId, instituteId, { transaction });
  });
  return true;
}
