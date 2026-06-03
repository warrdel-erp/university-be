import { randomUUID } from "crypto";
import sequelize from "../database/sequelizeConfig.js";
import * as repo from "../repository/assetRepository.js";

const INVENTORY_CODE_PREFIX = "AST-";

/** ISSUED only when every inventory copy has an open issue; otherwise IN_STOCK. */
export function deriveAssetStatusFromInventory(openIssues, totalInventory) {
  if (totalInventory === 0) {
    return "IN_STOCK";
  }
  return openIssues >= totalInventory ? "ISSUED" : "IN_STOCK";
}

export async function syncAssetStatusFromInventory(assetId, instituteId, options = {}) {
  const { transaction } = options;

  const asset = await repo.findAssetStatusById(assetId, instituteId, { transaction });
  if (!asset || asset.status === "MAINTANANCE") {
    return;
  }

  const totalInventory = await repo.countInventoryItemsByAsset(assetId, instituteId, { transaction });
  const openIssues = await repo.countOpenIssuesForAsset(assetId, instituteId, { transaction });
  const nextStatus = deriveAssetStatusFromInventory(openIssues, totalInventory);

  if (asset.status !== nextStatus) {
    await repo.updateAsset(assetId, instituteId, { status: nextStatus }, { transaction });
  }
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

function updatePayload(body) {
  const { assetId, inventory, inMaintenance, status, ...rest } = body;
  return Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
}

function normalizeInventoryList(inventory) {
  if (!inventory) return [];
  return Array.isArray(inventory) ? inventory : [inventory];
}

async function validateAssetReferences(body, instituteId, transaction) {
  if (body.assetCategoryId !== undefined) {
    const category = await repo.findAssetCategoryByIdForInstitute(
      body.assetCategoryId,
      instituteId,
      { transaction }
    );
    if (!category) {
      throw httpError("assetCategoryId not found or not in your institute", 404);
    }
  }

  if (body.departmentId !== undefined) {
    const department = await repo.findDepartmentById(body.departmentId, { transaction });
    if (!department) {
      throw httpError("departmentId not found", 404);
    }
  }
}

async function validateClassRoomSectionId(classRoomSectionId, transaction) {
  const room = await repo.findClassRoomSectionById(classRoomSectionId, { transaction });
  if (!room) {
    throw httpError("classRoomSectionId not found", 404);
  }
}

async function nextInventoryCode(instituteId, transaction) {
  const maxSeq = await repo.getNextInventoryCodeSequence(instituteId, { transaction });
  return `${INVENTORY_CODE_PREFIX}${maxSeq + 1}`;
}

function inventoryStatusForRoom(classRoomSectionId) {
  return classRoomSectionId != null ? "ASSIGNED" : "NOT_ASSIGNED";
}

async function buildNewInventoryPayload(classRoomSectionId, assetId, instituteId, transaction) {
  if (classRoomSectionId != null) {
    await validateClassRoomSectionId(classRoomSectionId, transaction);
  }

  return {
    code: await nextInventoryCode(instituteId, transaction),
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
  transaction,
  startSeq
) {
  const roomId = classRoomSectionId ?? null;
  if (roomId != null) {
    await validateClassRoomSectionId(roomId, transaction);
  }

  let maxSeq =
    startSeq ?? (await repo.getNextInventoryCodeSequence(instituteId, { transaction }));
  const status = inventoryStatusForRoom(roomId);
  const rows = [];

  for (let i = 0; i < count; i++) {
    maxSeq += 1;
    rows.push({
      code: `${INVENTORY_CODE_PREFIX}${maxSeq}`,
      barcode: randomUUID(),
      classRoomSectionId: roomId,
      status,
      assetId,
      instituteId,
    });
  }

  return { rows, nextSeq: maxSeq };
}

async function createInventoryRows(inventoryList, assetId, instituteId, transaction) {
  for (const item of inventoryList) {
    const payload = await buildNewInventoryPayload(item.classRoomSectionId, assetId, instituteId, transaction);
    await repo.createInventoryItem(payload, { transaction });
  }
}

async function createInventoryRowsByBulkGroups(groups, assetId, instituteId, transaction) {
  let maxSeq = await repo.getNextInventoryCodeSequence(instituteId, { transaction });
  const allRows = [];

  for (const group of groups) {
    const { rows, nextSeq } = await appendBulkInventoryPayloads(
      group.count,
      group.classRoomSectionId,
      assetId,
      instituteId,
      transaction,
      maxSeq
    );
    allRows.push(...rows);
    maxSeq = nextSeq;
  }

  if (allRows.length) {
    await repo.bulkCreateInventoryItems(allRows, { transaction });
  }
}

async function createInventoryRowsByCount(
  count,
  classRoomSectionId,
  assetId,
  instituteId,
  transaction
) {
  await createInventoryRowsByBulkGroups(
    [{ count, classRoomSectionId }],
    assetId,
    instituteId,
    transaction
  );
}

function buildInventoryItemUpdatePayload(item) {
  const payload = {};

  if (item.classRoomSectionId !== undefined) {
    payload.classRoomSectionId = item.classRoomSectionId;
    if (item.status === undefined) {
      payload.status = inventoryStatusForRoom(item.classRoomSectionId);
    }
  }

  if (item.status !== undefined) {
    payload.status = item.status;
  }

  return payload;
}

async function upsertInventoryRows(inventoryList, assetId, instituteId, transaction) {
  for (const item of inventoryList) {
    if (item.assetInventoryItemId) {
      const existing = await repo.findInventoryItemById(item.assetInventoryItemId, instituteId, {
        transaction,
      });
      if (!existing || existing.assetId !== assetId) {
        throw httpError(
          `assetInventoryItemId ${item.assetInventoryItemId} not found for this asset`,
          404
        );
      }

      const inventoryPayload = buildInventoryItemUpdatePayload(item);
      if (!Object.keys(inventoryPayload).length) {
        throw httpError(
          "classRoomSectionId or status is required when updating an inventory item",
          400
        );
      }

      if (inventoryPayload.classRoomSectionId != null) {
        await validateClassRoomSectionId(inventoryPayload.classRoomSectionId, transaction);
      }

      await repo.updateInventoryItem(
        item.assetInventoryItemId,
        instituteId,
        assetId,
        inventoryPayload,
        { transaction }
      );
      continue;
    }

    const payload = await buildNewInventoryPayload(item.classRoomSectionId, assetId, instituteId, transaction);
    await repo.createInventoryItem(payload, { transaction });
  }
}

export async function addAsset(body, instituteId) {
  const inventoryList = body.inventory !== undefined ? normalizeInventoryList(body.inventory) : [];

  const row = await sequelize.transaction(async (transaction) => {
    await validateAssetReferences(body, instituteId, transaction);

    const created = await repo.createAsset(
      {
        name: body.name,
        code: body.code,
        status: "IN_STOCK",
        condition: body.condition,
        description: body.description ?? null,
        departmentId: body.departmentId,
        assetCategoryId: body.assetCategoryId,
        instituteId,
      },
      { transaction }
    );

    if (body.inventoryBulk !== undefined) {
      await createInventoryRowsByBulkGroups(
        body.inventoryBulk,
        created.assetId,
        instituteId,
        transaction
      );
    } else if (body.count !== undefined) {
      await createInventoryRowsByCount(
        body.count,
        body.classRoomSectionId,
        created.assetId,
        instituteId,
        transaction
      );
    } else if (inventoryList.length) {
      await createInventoryRows(inventoryList, created.assetId, instituteId, transaction);
    }

    await syncAssetStatusFromInventory(created.assetId, instituteId, { transaction });

    return repo.findAssetById(created.assetId, instituteId, { transaction });
  });

  return toPlain(row);
}

export async function listAssets(instituteId) {
  const rows = await sequelize.transaction(async (transaction) =>
    repo.findAssetsByInstitute(instituteId, { transaction })
  );
  return rows.map(toPlain);
}

export async function getSingleAsset(assetId, instituteId) {
  const row = await sequelize.transaction(async (transaction) =>
    repo.findAssetById(assetId, instituteId, { transaction })
  );
  return toPlain(row);
}

export async function updateAsset(assetId, body, instituteId) {
  const inventoryList = body.inventory !== undefined ? normalizeInventoryList(body.inventory) : null;

  const updated = await sequelize.transaction(async (transaction) => {
    const existing = await repo.findAssetById(assetId, instituteId, { transaction });
    if (!existing) {
      throw httpError("Asset not found or not in your institute", 404);
    }

    if (body.inMaintenance === true) {
      await repo.updateAsset(assetId, instituteId, { status: "MAINTANANCE" }, { transaction });
    } else {
      const payload = updatePayload(body);
      if (Object.keys(payload).length) {
        await validateAssetReferences(payload, instituteId, transaction);
        const affected = await repo.updateAsset(assetId, instituteId, payload, { transaction });
        if (!affected) {
          throw httpError("Update failed", 500);
        }
      }

      if (inventoryList !== null && inventoryList.length) {
        await upsertInventoryRows(inventoryList, assetId, instituteId, transaction);
      }

      await syncAssetStatusFromInventory(assetId, instituteId, { transaction });
    }

    return repo.findAssetById(assetId, instituteId, { transaction });
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
