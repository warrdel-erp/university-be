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
      "feePlanProfileId",
    ],
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
    attributes: options.attributes ?? ["studentId", "instituteId", "feePlanProfileId"],
    transaction: options.transaction,
  });
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
    include: [studentInclude(), feePlanItemInclude(), feeInvoiceItemsInclude()],
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

export async function findAllStudentFeeInvoicesByInstitute(options = {}) {
  const where = { status: "generated" };

  if (options.paymentStatuses?.length) {
    where.paymentStatus = { [Op.in]: options.paymentStatuses };
  }

  return scoped(model.studentFeeInvoiceModel).findAll({
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
        attributes: ["studentId", "firstName", "middleName", "lastName", "scholarNumber"],
        required: true,
      },
      feePlanItemInclude(),
    ],
    order: [["studentFeeInvoiceId", "DESC"]],
    transaction: options.transaction,
  });
}
