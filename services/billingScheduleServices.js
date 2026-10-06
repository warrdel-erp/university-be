import sequelize from "../database/sequelizeConfig.js";
import * as repo from "../repository/billingScheduleRepository.js";
import { decimalAdd, toMoneyNumber } from "../utility/decimalMoney.js";

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/**
 * Create a new billing schedule item with optional sub-items breakdown
 */
export async function createBillingSchedule(payload, user = {}) {
  const { feePlanItemId, amount, dueDate, plannedDate, status, subItems } = payload;

  if (!feePlanItemId) {
    throw httpError("feePlanItemId is required", 400);
  }

  // 1. Validate that the fee plan item exists
  const feePlanItem = await repo.findFeePlanItemById(feePlanItemId);
  if (!feePlanItem) {
    throw httpError(`Fee plan item with ID ${feePlanItemId} not found`, 404);
  }

  // 2. Resolve amount (if not given, calculate sum of subItems)
  let totalAmount = amount != null ? toMoneyNumber(amount) : 0;
  if (Array.isArray(subItems) && subItems.length > 0 && amount == null) {
    totalAmount = subItems.reduce(
      (sum, item) => decimalAdd(sum, toMoneyNumber(item.amount || 0)),
      0
    );
  }

  const universityId = user?.universityId || feePlanItem.universityId || null;
  const instituteId = user?.instituteId || feePlanItem.instituteId;

  // 3. Execute creation in a transaction
  let createdItemId = null;
  await sequelize.transaction(async (t) => {
    const parentRecord = await repo.createBillingScheduleItem(
      {
        feePlanItemId,
        amount: totalAmount,
        dueDate: dueDate || null,
        plannedDate: plannedDate || null,
        status: status || "pending",
        universityId,
        instituteId,
      },
      { transaction: t }
    );

    createdItemId = parentRecord.billingScheduleItemId;

    if (Array.isArray(subItems) && subItems.length > 0) {
      const subItemsData = subItems.map((sub) => ({
        billingScheduleItemId: createdItemId,
        feePlanSubItemId: sub.feePlanSubItemId,
        amount: toMoneyNumber(sub.amount || 0),
        universityId,
        instituteId,
      }));

      await repo.bulkCreateBillingScheduleSubItems(subItemsData, {
        transaction: t,
      });
    }
  });

  return repo.findBillingScheduleItemById(createdItemId);
}

/**
 * Get paginated list of billing schedule items with filters
 */
export async function getBillingSchedules(queryParams = {}) {
  const { feePlanItemId, status, fromDate, toDate, page = 1, limit = 10 } = queryParams;

  const filters = {};
  if (feePlanItemId) filters.feePlanItemId = Number(feePlanItemId);
  if (status) filters.status = status;
  if (fromDate) filters.fromDate = fromDate;
  if (toDate) filters.toDate = toDate;

  const result = await repo.findBillingScheduleItems(filters, { page, limit });

  return {
    items: result.rows,
    paginationData: {
      total: result.total,
      page: result.page,
      limit: result.limit,
    },
  };
}

/**
 * Get single billing schedule item details
 */
export async function getSingleBillingSchedule(billingScheduleItemId) {
  if (!billingScheduleItemId) {
    throw httpError("billingScheduleItemId is required", 400);
  }

  const item = await repo.findBillingScheduleItemById(billingScheduleItemId);
  if (!item) {
    throw httpError(
      `Billing schedule item with ID ${billingScheduleItemId} not found`,
      404
    );
  }

  return item;
}

/**
 * Update billing schedule item and optionally sync its sub-items
 */
export async function updateBillingSchedule(billingScheduleItemId, payload, user = {}) {
  if (!billingScheduleItemId) {
    throw httpError("billingScheduleItemId is required", 400);
  }

  const existingItem = await repo.findBillingScheduleItemById(billingScheduleItemId);
  if (!existingItem) {
    throw httpError(
      `Billing schedule item with ID ${billingScheduleItemId} not found`,
      404
    );
  }

  const universityId = user?.universityId || existingItem.universityId || null;
  const instituteId = user?.instituteId || existingItem.instituteId;

  await sequelize.transaction(async (t) => {
    const updateData = {};

    if (payload.dueDate !== undefined) updateData.dueDate = payload.dueDate;
    if (payload.plannedDate !== undefined) updateData.plannedDate = payload.plannedDate;
    if (payload.status !== undefined) updateData.status = payload.status;

    // Handle amount & subItems re-sync
    if (Array.isArray(payload.subItems)) {
      let totalAmount = payload.amount != null ? toMoneyNumber(payload.amount) : null;
      if (totalAmount == null) {
        totalAmount = payload.subItems.reduce(
          (sum, sub) => decimalAdd(sum, toMoneyNumber(sub.amount || 0)),
          0
        );
      }
      updateData.amount = totalAmount;

      // Replace sub-items
      await repo.deleteBillingScheduleSubItemsByItemId(billingScheduleItemId, {
        transaction: t,
      });

      if (payload.subItems.length > 0) {
        const subItemsData = payload.subItems.map((sub) => ({
          billingScheduleItemId,
          feePlanSubItemId: sub.feePlanSubItemId,
          amount: toMoneyNumber(sub.amount || 0),
          universityId,
          instituteId,
        }));

        await repo.bulkCreateBillingScheduleSubItems(subItemsData, {
          transaction: t,
        });
      }
    } else if (payload.amount !== undefined) {
      updateData.amount = toMoneyNumber(payload.amount);
    }

    if (Object.keys(updateData).length > 0) {
      await repo.updateBillingScheduleItem(billingScheduleItemId, updateData, {
        transaction: t,
      });
    }
  });

  return repo.findBillingScheduleItemById(billingScheduleItemId);
}

/**
 * Quick status update for billing schedule item
 */
export async function updateBillingScheduleStatus(billingScheduleItemId, status) {
  if (!billingScheduleItemId) {
    throw httpError("billingScheduleItemId is required", 400);
  }
  if (!status) {
    throw httpError("status is required", 400);
  }

  const existing = await repo.findBillingScheduleItemById(billingScheduleItemId);
  if (!existing) {
    throw httpError(
      `Billing schedule item with ID ${billingScheduleItemId} not found`,
      404
    );
  }

  await repo.updateBillingScheduleItem(billingScheduleItemId, { status });
  return repo.findBillingScheduleItemById(billingScheduleItemId);
}

/**
 * Delete billing schedule item
 */
export async function deleteBillingSchedule(billingScheduleItemId) {
  if (!billingScheduleItemId) {
    throw httpError("billingScheduleItemId is required", 400);
  }

  const existing = await repo.findBillingScheduleItemById(billingScheduleItemId);
  if (!existing) {
    throw httpError(
      `Billing schedule item with ID ${billingScheduleItemId} not found`,
      404
    );
  }

  await sequelize.transaction(async (t) => {
    await repo.deleteBillingScheduleSubItemsByItemId(billingScheduleItemId, {
      transaction: t,
    });
    await repo.deleteBillingScheduleItem(billingScheduleItemId, {
      transaction: t,
    });
  });

  return { billingScheduleItemId };
}

/**
 * Add a single sub-item to an existing billing schedule
 */
export async function addBillingScheduleSubItem(payload, user = {}) {
  const { billingScheduleItemId, feePlanSubItemId, amount } = payload;

  if (!billingScheduleItemId) {
    throw httpError("billingScheduleItemId is required", 400);
  }
  if (!feePlanSubItemId) {
    throw httpError("feePlanSubItemId is required", 400);
  }

  const scheduleItem = await repo.findBillingScheduleItemById(billingScheduleItemId);
  if (!scheduleItem) {
    throw httpError(
      `Billing schedule item with ID ${billingScheduleItemId} not found`,
      404
    );
  }

  const subItemAmount = toMoneyNumber(amount || 0);
  const universityId = user?.universityId || scheduleItem.universityId || null;
  const instituteId = user?.instituteId || scheduleItem.instituteId;

  let newSubItem;
  await sequelize.transaction(async (t) => {
    newSubItem = await repo.createBillingScheduleSubItem(
      {
        billingScheduleItemId,
        feePlanSubItemId,
        amount: subItemAmount,
        universityId,
        instituteId,
      },
      { transaction: t }
    );

    // Increment parent amount
    const newTotal = decimalAdd(toMoneyNumber(scheduleItem.amount || 0), subItemAmount);
    await repo.updateBillingScheduleItem(
      billingScheduleItemId,
      { amount: newTotal },
      { transaction: t }
    );
  });

  return newSubItem;
}

/**
 * Delete a single sub-item from a billing schedule
 */
export async function deleteBillingScheduleSubItem(billingScheduleSubItemId) {
  if (!billingScheduleSubItemId) {
    throw httpError("billingScheduleSubItemId is required", 400);
  }

  const subItem = await repo.findBillingScheduleSubItemById(billingScheduleSubItemId);
  if (!subItem) {
    throw httpError(
      `Billing schedule sub-item with ID ${billingScheduleSubItemId} not found`,
      404
    );
  }

  await sequelize.transaction(async (t) => {
    const parent = await repo.findBillingScheduleItemById(subItem.billingScheduleItemId, {
      transaction: t,
    });
    if (parent) {
      const newTotal = Math.max(
        0,
        toMoneyNumber(parent.amount || 0) - toMoneyNumber(subItem.amount || 0)
      );
      await repo.updateBillingScheduleItem(
        parent.billingScheduleItemId,
        { amount: newTotal },
        { transaction: t }
      );
    }

    await repo.deleteBillingScheduleSubItemById(billingScheduleSubItemId, {
      transaction: t,
    });
  });

  return { billingScheduleSubItemId };
}
