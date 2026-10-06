import { Op } from "sequelize";
import sequelize from "../database/sequelizeConfig.js";
import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

function getBillingScheduleIncludes() {
  return [
    {
      model: model.feePlanItemModel,
      as: "feePlanItem",
      required: false,
      where: buildScope(model.feePlanItemModel),
      attributes: [
        "feePlanItemId",
        "name",
        "createDate",
        "batchId",
        "year",
        "publishStatus",
      ],
    },
    {
      model: model.billingScheduleSubItemsModel,
      as: "subItems",
      required: false,
      where: buildScope(model.billingScheduleSubItemsModel),
      include: [
        {
          model: model.feePlanSubItemsModel,
          as: "feePlanSubItem",
          required: false,
          where: buildScope(model.feePlanSubItemsModel),
          attributes: [
            "feePlanSubitemId",
            "feeTypeId",
            "amount",
            "isMainSubItem",
          ],
        },
      ],
    },
    {
      model: model.billingSchedulePaymentTermsModel,
      as: "paymentTerms",
      required: false,
      attributes: [
        "billingSchedulePaymentTermsId",
        "billingScheduleItemId",
        "installment",
        "createdAt",
        "updatedAt",
      ],
    },
  ];
}

export async function createBillingScheduleItem(data, options = {}) {
  return scoped(model.billingScheduleItemsModel).create(data, {
    transaction: options.transaction,
  });
}

export async function bulkCreateBillingScheduleSubItems(records, options = {}) {
  if (!records || records.length === 0) return [];
  return scoped(model.billingScheduleSubItemsModel).bulkCreate(records, {
    transaction: options.transaction,
  });
}

export async function findBillingScheduleItemById(billingScheduleItemId, options = {}) {
  return scoped(model.billingScheduleItemsModel).findOne({
    where: { billingScheduleItemId },
    include: getBillingScheduleIncludes(),
    transaction: options.transaction,
  });
}

export async function findBillingScheduleItems(filters = {}, pagination = {}, options = {}) {
  const where = {};

  if (filters.feePlanItemId) {
    where.feePlanItemId = filters.feePlanItemId;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.fromDate && filters.toDate) {
    where.plannedDate = {
      [Op.between]: [filters.fromDate, filters.toDate],
    };
  } else if (filters.fromDate) {
    where.plannedDate = {
      [Op.gte]: filters.fromDate,
    };
  } else if (filters.toDate) {
    where.plannedDate = {
      [Op.lte]: filters.toDate,
    };
  }

  const page = Math.max(1, Number(pagination.page) || 1);
  const limit = Math.max(1, Number(pagination.limit) || 10);
  const offset = (page - 1) * limit;

  const { count: total, rows } = await scoped(
    model.billingScheduleItemsModel
  ).findAndCountAll({
    where,
    include: getBillingScheduleIncludes(),
    distinct: true,
    order: [
      ["plannedDate", "ASC"],
      ["billingScheduleItemId", "ASC"],
    ],
    limit,
    offset,
    transaction: options.transaction,
  });

  return { total, page, limit, rows };
}

export async function updateBillingScheduleItem(billingScheduleItemId, data, options = {}) {
  return scoped(model.billingScheduleItemsModel).update(data, {
    where: { billingScheduleItemId },
    transaction: options.transaction,
  });
}

export async function deleteBillingScheduleItem(billingScheduleItemId, options = {}) {
  return scoped(model.billingScheduleItemsModel).destroy({
    where: { billingScheduleItemId },
    transaction: options.transaction,
  });
}

export async function deleteBillingScheduleSubItemsByItemId(billingScheduleItemId, options = {}) {
  return scoped(model.billingScheduleSubItemsModel).destroy({
    where: { billingScheduleItemId },
    transaction: options.transaction,
  });
}

export async function createBillingScheduleSubItem(data, options = {}) {
  return scoped(model.billingScheduleSubItemsModel).create(data, {
    transaction: options.transaction,
  });
}

export async function findBillingScheduleSubItemById(billingScheduleSubItemId, options = {}) {
  return scoped(model.billingScheduleSubItemsModel).findOne({
    where: { billingScheduleSubItemId },
    transaction: options.transaction,
  });
}

export async function deleteBillingScheduleSubItemById(billingScheduleSubItemId, options = {}) {
  return scoped(model.billingScheduleSubItemsModel).destroy({
    where: { billingScheduleSubItemId },
    transaction: options.transaction,
  });
}

export async function findFeePlanItemById(feePlanItemId, options = {}) {
  return scoped(model.feePlanItemModel).findOne({
    where: { feePlanItemId },
    transaction: options.transaction,
  });
}

export async function findFeePlanSubItemsByPlanItemId(feePlanItemId, options = {}) {
  return scoped(model.feePlanSubItemsModel).findAll({
    where: { feePlanItemId },
    transaction: options.transaction,
  });
}

export async function findBillingScheduleBatchesOverview(filters = {}) {
  const sessionWhere = { ...buildScope(model.sessionModel) };
  if (filters.sessionId != null) sessionWhere.sessionId = Number(filters.sessionId);

  const courseWhere = { ...buildScope(model.courseModel) };
  if (filters.courseId != null) courseWhere.courseId = Number(filters.courseId);

  const batchWhere = { status: filters.batchStatus || "published" };
  if (filters.batchId != null) batchWhere.batchId = Number(filters.batchId);

  return model.batchModel.findAll({
    where: batchWhere,
    attributes: [
      "batchId",
      "sessionId",
      "batch",
      "status",
      [
        sequelize.literal(
          "(SELECT COUNT(DISTINCT s.student_id) FROM students s WHERE s.batch_id = `batch`.`batch_id` AND s.deleted_at IS NULL)"
        ),
        "studentCount",
      ],
    ],
    include: [
      {
        model: model.sessionModel,
        as: "session",
        attributes: ["sessionId", "sessionName", "courseId"],
        required: true,
        where: sessionWhere,
        include: [
          {
            model: model.courseModel,
            as: "course",
            attributes: [
              "courseId",
              "courseName",
              "courseCode",
              "courseDuration",
              "totalTerms",
              "termType",
            ],
            required: true,
            where: courseWhere,
          },
        ],
      },
      {
        model: model.feePlanItemModel,
        as: "feePlanItems",
        required: false,
        where: buildScope(model.feePlanItemModel),
        attributes: ["feePlanItemId", "name", "year", "batchId"],
        include: [
          {
            model: model.billingScheduleItemsModel,
            as: "billingScheduleItems",
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
        ],
      },
    ],
    order: [
      [{ model: model.sessionModel, as: "session" }, { model: model.courseModel, as: "course" }, "courseName", "ASC"],
      [{ model: model.sessionModel, as: "session" }, "sessionName", "ASC"],
      ["batch", "ASC"],
    ],
  });
}

export async function findBatchReviewData(batchId, year) {
  const [batch, feePlanItem] = await Promise.all([
    model.batchModel.findByPk(Number(batchId), {
      attributes: ["batchId", "batch"],
      include: [
        {
          model: model.sessionModel,
          as: "session",
          attributes: ["sessionId", "sessionName"],
          include: [
            {
              model: model.courseModel,
              as: "course",
              attributes: ["courseId", "courseName", "courseCode"],
            },
          ],
        },
      ],
    }),
    model.feePlanItemModel.findOne({
      where: { batchId: Number(batchId), year: Number(year) },
      include: [
        {
          model: model.billingScheduleItemsModel,
          as: "billingScheduleItems",
          include: [
            { model: model.billingScheduleSubItemsModel, as: "subItems" },
            { model: model.billingSchedulePaymentTermsModel, as: "paymentTerms" },
          ],
        },
        {
          model: model.feePlanSubItemsModel,
          as: "feePlanSubItems",
          include: [{ model: model.feeTypeCatalogModel, as: "feeTypeCatalog" }],
        },
      ],
    }),
  ]);

  return { batch, feePlanItem };
}


