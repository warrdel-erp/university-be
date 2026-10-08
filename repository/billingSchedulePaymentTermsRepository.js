import { Op } from "sequelize";
import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

function getPaymentTermIncludes() {
  return [
    {
      model: model.billingScheduleItemsModel,
      as: "billingScheduleItem",
      required: false,
      where: buildScope(model.billingScheduleItemsModel),
      attributes: [
        "billingScheduleItemId",
        "feePlanItemId",
        "amount",
        "plannedDate",
        "status",
      ],
    },
  ];
}

export async function createPaymentTerm(data, options = {}) {
  return scoped(model.billingSchedulePaymentTermsModel).create(data, {
    transaction: options.transaction,
  });
}

export async function bulkCreatePaymentTerms(records, options = {}) {
  if (!records || records.length === 0) return [];
  return scoped(model.billingSchedulePaymentTermsModel).bulkCreate(records, {
    transaction: options.transaction,
  });
}

export async function findPaymentTermById(billingSchedulePaymentTermsId, options = {}) {
  return scoped(model.billingSchedulePaymentTermsModel).findOne({
    where: { billingSchedulePaymentTermsId },
    include: getPaymentTermIncludes(),
    transaction: options.transaction,
  });
}

export async function findPaymentTerms(filters = {}, pagination = {}, options = {}) {
  const where = {};

  if (filters.billingScheduleItemId) {
    where.billingScheduleItemId = filters.billingScheduleItemId;
  }

  if (filters.installment !== undefined && filters.installment !== null) {
    where.installment = filters.installment;
  }

  const page = Math.max(1, Number(pagination.page) || 1);
  const limit = Math.max(1, Number(pagination.limit) || 10);
  const offset = (page - 1) * limit;

  const { count: total, rows } = await scoped(
    model.billingSchedulePaymentTermsModel
  ).findAndCountAll({
    where,
    include: getPaymentTermIncludes(),
    distinct: true,
    order: [
      ["billingScheduleItemId", "ASC"],
      ["installment", "ASC"],
      ["billingSchedulePaymentTermsId", "ASC"],
    ],
    limit,
    offset,
    transaction: options.transaction,
  });

  return { total, page, limit, rows };
}

export async function updatePaymentTerm(billingSchedulePaymentTermsId, data, options = {}) {
  return scoped(model.billingSchedulePaymentTermsModel).update(data, {
    where: { billingSchedulePaymentTermsId },
    transaction: options.transaction,
  });
}

export async function deletePaymentTerm(billingSchedulePaymentTermsId, options = {}) {
  return scoped(model.billingSchedulePaymentTermsModel).destroy({
    where: { billingSchedulePaymentTermsId },
    transaction: options.transaction,
  });
}

export async function deletePaymentTermsByItemId(billingScheduleItemId, options = {}) {
  return scoped(model.billingSchedulePaymentTermsModel).destroy({
    where: { billingScheduleItemId },
    transaction: options.transaction,
  });
}

export async function findBillingScheduleItemById(billingScheduleItemId, options = {}) {
  return scoped(model.billingScheduleItemsModel).findOne({
    where: { billingScheduleItemId },
    transaction: options.transaction,
  });
}
