import sequelize from "../database/sequelizeConfig.js";
import * as repo from "../repository/billingSchedulePaymentTermsRepository.js";

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/**
 * Create billing schedule payment term(s).
 * Supports a single object or an array of objects.
 */
export async function createPaymentTerm(payload) {
  let items = [];
  let isSingle = false;

  if (Array.isArray(payload)) {
    items = payload;
  } else if (payload && typeof payload === "object") {
    items = [payload];
    isSingle = true;
  }

  if (items.length === 0) {
    throw httpError("At least one payment term record is required", 400);
  }

  // Validate all billingScheduleItemIds exist
  const itemIds = [...new Set(items.map((i) => i.billingScheduleItemId))];
  for (const id of itemIds) {
    if (!id) {
      throw httpError("billingScheduleItemId is required for each payment term", 400);
    }
    const scheduleItem = await repo.findBillingScheduleItemById(id);
    if (!scheduleItem) {
      throw httpError(`Billing schedule item with ID ${id} not found`, 404);
    }
  }

  // Validate installments
  for (const item of items) {
    if (item.installment == null || !Number.isInteger(Number(item.installment))) {
      throw httpError("installment must be an integer", 400);
    }
  }

  if (isSingle) {
    const created = await repo.createPaymentTerm({
      billingScheduleItemId: items[0].billingScheduleItemId,
      installment: Number(items[0].installment),
    });
    return repo.findPaymentTermById(created.billingSchedulePaymentTermsId);
  }

  const recordsToCreate = items.map((i) => ({
    billingScheduleItemId: i.billingScheduleItemId,
    installment: Number(i.installment),
  }));

  const createdRecords = await repo.bulkCreatePaymentTerms(recordsToCreate);
  return createdRecords;
}

/**
 * List payment terms with optional filtering and pagination
 */
export async function getPaymentTerms(query = {}) {
  const filters = {};
  if (query.billingScheduleItemId) {
    filters.billingScheduleItemId = Number(query.billingScheduleItemId);
  }
  if (query.installment !== undefined && query.installment !== "") {
    filters.installment = Number(query.installment);
  }

  const pagination = {
    page: Math.max(1, Number(query.page) || 1),
    limit: Math.max(1, Number(query.limit) || 10),
  };

  const { total, page, limit, rows } = await repo.findPaymentTerms(
    filters,
    pagination
  );

  return {
    items: rows,
    paginationData: {
      total,
      page,
      limit,
    },
  };
}

/**
 * Get a single payment term by ID
 */
export async function getSinglePaymentTerm(billingSchedulePaymentTermsId) {
  if (!billingSchedulePaymentTermsId) {
    throw httpError("billingSchedulePaymentTermsId is required", 400);
  }

  const term = await repo.findPaymentTermById(billingSchedulePaymentTermsId);
  if (!term) {
    throw httpError(
      `Billing schedule payment term with ID ${billingSchedulePaymentTermsId} not found`,
      404
    );
  }

  return term;
}

/**
 * Update an existing payment term
 */
export async function updatePaymentTerm(billingSchedulePaymentTermsId, payload) {
  if (!billingSchedulePaymentTermsId) {
    throw httpError("billingSchedulePaymentTermsId is required", 400);
  }

  const existing = await repo.findPaymentTermById(billingSchedulePaymentTermsId);
  if (!existing) {
    throw httpError(
      `Billing schedule payment term with ID ${billingSchedulePaymentTermsId} not found`,
      404
    );
  }

  const updateData = {};

  if (payload.billingScheduleItemId !== undefined) {
    const parent = await repo.findBillingScheduleItemById(payload.billingScheduleItemId);
    if (!parent) {
      throw httpError(
        `Billing schedule item with ID ${payload.billingScheduleItemId} not found`,
        404
      );
    }
    updateData.billingScheduleItemId = payload.billingScheduleItemId;
  }

  if (payload.installment !== undefined) {
    if (!Number.isInteger(Number(payload.installment))) {
      throw httpError("installment must be an integer", 400);
    }
    updateData.installment = Number(payload.installment);
  }

  if (Object.keys(updateData).length === 0) {
    return existing;
  }

  await repo.updatePaymentTerm(billingSchedulePaymentTermsId, updateData);
  return repo.findPaymentTermById(billingSchedulePaymentTermsId);
}

/**
 * Delete a payment term
 */
export async function deletePaymentTerm(billingSchedulePaymentTermsId) {
  if (!billingSchedulePaymentTermsId) {
    throw httpError("billingSchedulePaymentTermsId is required", 400);
  }

  const existing = await repo.findPaymentTermById(billingSchedulePaymentTermsId);
  if (!existing) {
    throw httpError(
      `Billing schedule payment term with ID ${billingSchedulePaymentTermsId} not found`,
      404
    );
  }

  await repo.deletePaymentTerm(billingSchedulePaymentTermsId);
  return { billingSchedulePaymentTermsId };
}
