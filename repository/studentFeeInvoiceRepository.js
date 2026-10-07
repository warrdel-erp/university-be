import { Op } from "sequelize";
import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

function excludeTimestamps() {
  return ["createdAt", "updatedAt"];
}

function feeInvoiceItemsInclude() {
  return {
    model: model.studentFeeInvoiceItemsModel,
    as: "feeInvoiceItems",
    required: false,
    attributes: { exclude: excludeTimestamps() },
    include: [
      {
        model: model.feeTypeCatalogModel,
        as: "feeTypeCatalog",
        attributes: ["feeTypeCatalogId", "name", "ledgerType", "description", "amount", "refundable"],
      },
    ],
  };
}

function feePlanItemInclude() {
  return {
    model: model.feePlanItemModel,
    as: "feePlanItem",
    attributes: { exclude: excludeTimestamps() },
    include: [
      {
        model: model.feePlanSubItemsModel,
        as: "feePlanSubItems",
        required: false,
        attributes: { exclude: excludeTimestamps() },
      },
    ],
  };
}

function billingScheduleItemInclude() {
  return {
    model: model.billingScheduleItemsModel,
    as: "billingScheduleItem",
    required: false,
    attributes: { exclude: excludeTimestamps() },
    include: [
      {
        model: model.billingScheduleSubItemsModel,
        as: "subItems",
        required: false,
        attributes: { exclude: excludeTimestamps() },
        include: [
          {
            model: model.feePlanSubItemsModel,
            as: "feePlanSubItem",
            required: false,
            attributes: { exclude: excludeTimestamps() },
          },
        ],
      },
    ],
  };
}

function feePlanItemDetailInclude() {
  return {
    model: model.feePlanItemModel,
    as: "feePlanItem",
    required: false,
    attributes: { exclude: excludeTimestamps() },
    include: [
      {
        model: model.feePlanSubItemsModel,
        as: "feePlanSubItems",
        required: false,
        attributes: { exclude: excludeTimestamps() },
      },
    ],
  };
}

function studentInclude() {
  return {
    model: model.studentModel,
    as: "studentFeeInvoiceStudent",
    attributes: [
      "studentId",
      "firstName",
      "middleName",
      "lastName",
      "scholarNumber",
      "email",
      "mobileNumber",
      "enrollNumber",
      "admissionNumber",
      "batchId",
      "courseId",
      "sessionId",
    ],
  };
}

function studentDetailInclude() {
  return {
    model: model.studentModel,
    as: "studentFeeInvoiceStudent",
    attributes: [
      "studentId",
      "firstName",
      "middleName",
      "lastName",
      "scholarNumber",
      "email",
      "mobileNumber",
      "enrollNumber",
      "admissionNumber",
      "batchId",
      "courseId",
      "sessionId",
    ],
    include: [
      {
        model: model.courseModel,
        as: "course",
        required: false,
        attributes: ["courseId", "courseName"],
      },
      {
        model: model.sessionModel,
        as: "studentSession",
        required: false,
        attributes: ["sessionId", "sessionName"],
      },
    ],
  };
}

function instituteInclude() {
  return {
    model: model.instituteModel,
    as: "instituteStudentFeeInvoice",
    required: false,
    attributes: ["instituteId", "instituteName", "instituteCode"],
  };
}

export async function findFeePlanItemById(feePlanItemId, options = {}) {
  return scoped(model.feePlanItemModel).findOne({
    where: { feePlanItemId },
    transaction: options.transaction,
  });
}

export async function findStudentById(studentId, options = {}) {
  return scoped(model.studentModel).findOne({
    where: { studentId },
    attributes: options.attributes ?? ["studentId", "instituteId", "batchId"],
    transaction: options.transaction,
  });
}

export async function findStudentsByBatchId(batchId, options = {}) {
  return scoped(model.studentModel, { scopeConfig: { academicYear: false } }).findAll({
    attributes: ["studentId", "instituteId", "batchId"],
    where: { batchId: Number(batchId) },
    transaction: options.transaction,
  });
}

export async function findStudentsByIds(studentIds, options = {}) {
  if (!studentIds.length) return [];
  return scoped(model.studentModel, { scopeConfig: { academicYear: false } }).findAll({
    attributes: ["studentId", "instituteId", "batchId"],
    where: { studentId: { [Op.in]: studentIds } },
    transaction: options.transaction,
  });
}

export async function findExistingInvoiceStudentIdsByItem(filterOrId, studentIds = [], options = {}) {
  const where = {};
  if (typeof filterOrId === "object" && filterOrId !== null) {
    if (filterOrId.billingScheduleItemId != null) {
      where.billingScheduleItemId = Number(filterOrId.billingScheduleItemId);
    } else if (filterOrId.feePlanItemId != null) {
      where.feePlanItemId = Number(filterOrId.feePlanItemId);
    }
  } else if (filterOrId != null) {
    where.feePlanItemId = Number(filterOrId);
  }

  if (studentIds.length) {
    where.studentId = { [Op.in]: studentIds };
  }
  const rows = await scoped(model.studentFeeInvoiceModel).findAll({
    attributes: ["studentId"],
    where,
    raw: true,
    transaction: options.transaction,
  });
  return new Set(rows.map((r) => Number(r.studentId)));
}

export async function findFeePlanSubItemsByFeePlanItemId(feePlanItemId, options = {}) {
  const where = { feePlanItemId };
  if (options.supplementalOnly) {
    where.isMainSubItem = false;
  }
  return scoped(model.feePlanSubItemsModel).findAll({
    where,
    order: [["feePlanSubitemId", "ASC"]],
    transaction: options.transaction,
  });
}

export async function findStudentFeeInvoiceByStudentAndItem(studentId, feePlanItemId, options = {}) {
  return scoped(model.studentFeeInvoiceModel).findOne({
    where: { studentId, feePlanItemId },
    transaction: options.transaction,
  });
}

export async function createStudentFeeInvoice(data, options = {}) {
  return scoped(model.studentFeeInvoiceModel).create(data, { transaction: options.transaction });
}

export async function bulkCreateStudentFeeInvoiceItems(rows, options = {}) {
  return model.studentFeeInvoiceItemsModel.bulkCreate(rows, {
    transaction: options.transaction,
  });
}

export async function findBillingScheduleItemWithDetails(billingScheduleItemId, options = {}) {
  return scoped(model.billingScheduleItemsModel).findOne({
    where: { billingScheduleItemId: Number(billingScheduleItemId) },
    include: [
      {
        model: model.feePlanItemModel,
        as: "feePlanItem",
      },
      {
        model: model.billingScheduleSubItemsModel,
        as: "subItems",
        required: false,
        include: [
          {
            model: model.feePlanSubItemsModel,
            as: "feePlanSubItem",
            required: false,
          },
        ],
      },
    ],
    transaction: options.transaction,
  });
}

export async function findBillingScheduleItemsByFeePlanItemId(feePlanItemId, options = {}) {
  return scoped(model.billingScheduleItemsModel).findAll({
    where: { feePlanItemId: Number(feePlanItemId) },
    include: [
      {
        model: model.billingScheduleSubItemsModel,
        as: "subItems",
        required: false,
        include: [
          {
            model: model.feePlanSubItemsModel,
            as: "feePlanSubItem",
            required: false,
          },
        ],
      },
    ],
    order: [["plannedDate", "ASC"], ["billingScheduleItemId", "ASC"]],
    transaction: options.transaction,
  });
}

export async function updateBillingScheduleItemStatus(billingScheduleItemId, status, options = {}) {
  const [affected] = await scoped(model.billingScheduleItemsModel).update(
    { status },
    {
      where: { billingScheduleItemId: Number(billingScheduleItemId) },
      transaction: options.transaction,
    }
  );
  if (!affected) {
    await model.billingScheduleItemsModel.update(
      { status },
      {
        where: { billingScheduleItemId: Number(billingScheduleItemId) },
        transaction: options.transaction,
      }
    );
  }
}

export async function findStudentFeeInvoiceById(studentFeeInvoiceId, options = {}) {
  return scoped(model.studentFeeInvoiceModel).findOne({
    where: { studentFeeInvoiceId },
    include: [
      instituteInclude(),
      studentDetailInclude(),
      feePlanItemDetailInclude(),
      billingScheduleItemInclude(),
      feeInvoiceItemsInclude(),
    ],
    transaction: options.transaction,
  });
}

export async function findStudentFeeInvoicesByStudentId(studentId, options = {}) {
  return scoped(model.studentFeeInvoiceModel).findAll({
    where: { studentId },
    include: [feePlanItemInclude(), billingScheduleItemInclude(), feeInvoiceItemsInclude()],
    order: [["studentFeeInvoiceId", "DESC"]],
    transaction: options.transaction,
  });
}

export async function findStudentFeeInvoicesOverview({
  feePlanItemId,
  status = "all",
  page,
  limit,
  options = {},
}) {
  const where = { status: "generated" };

  if (feePlanItemId != null) {
    where.feePlanItemId = Number(feePlanItemId);
  }

  if (status === "pending") {
    where.paymentStatus = { [Op.in]: ["unpaid", "partial"] };
  } else if (status === "completed") {
    where.paymentStatus = "paid";
  }

  const queryOptions = {
    where,
    attributes: [
      "studentFeeInvoiceId",
      "studentId",
      "feePlanItemId",
      "instituteId",
      "total",
      "createDate",
      "dueDate",
      "status",
      "paymentStatus",
      "paidAmount",
    ],
    include: [
      {
        model: model.studentModel,
        as: "studentFeeInvoiceStudent",
        attributes: [
          "studentId",
          "firstName",
          "middleName",
          "lastName",
          "scholarNumber",
          "enrollNumber",
          "admissionNumber",
        ],
        required: false,
      },
      feePlanItemInclude(),
    ],
    order: [["studentFeeInvoiceId", "DESC"]],
    transaction: options.transaction,
  };

  const isPaginated = page != null || limit != null;

  if (isPaginated) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 10);
    queryOptions.limit = limitNum;
    queryOptions.offset = (pageNum - 1) * limitNum;
  }

  const { count: totalRecords, rows } = await scoped(
    model.studentFeeInvoiceModel
  ).findAndCountAll(queryOptions);

  const limitNum = isPaginated ? Math.max(1, Number(limit) || 10) : totalRecords;
  const pageNum = isPaginated ? Math.max(1, Number(page) || 1) : 1;

  return {
    totalRecords,
    totalPages: isPaginated ? Math.ceil(totalRecords / limitNum) || 1 : 1,
    currentPage: pageNum,
    pageSize: limitNum,
    isPaginated,
    rows,
  };
}

export async function updateFeePlanItemById(feePlanItemId, data, options = {}) {
  return scoped(model.feePlanItemModel).update(data, {
    where: { feePlanItemId: Number(feePlanItemId) },
    transaction: options.transaction,
  });
}

