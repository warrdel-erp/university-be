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
        attributes: ["feeTypeCatalogId", "name", "ledgerType", "description", "amount"],
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

export async function findExistingInvoiceStudentIdsByItem(feePlanItemId, studentIds = [], options = {}) {
  const where = { feePlanItemId: Number(feePlanItemId) };
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

export async function findStudentFeeInvoiceById(studentFeeInvoiceId, options = {}) {
  return scoped(model.studentFeeInvoiceModel).findOne({
    where: { studentFeeInvoiceId },
    include: [
      instituteInclude(),
      studentDetailInclude(),
      feePlanItemDetailInclude(),
      feeInvoiceItemsInclude(),
    ],
    transaction: options.transaction,
  });
}

export async function findStudentFeeInvoicesByStudentId(studentId, options = {}) {
  return scoped(model.studentFeeInvoiceModel).findAll({
    where: { studentId },
    include: [feePlanItemInclude(), feeInvoiceItemsInclude()],
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
