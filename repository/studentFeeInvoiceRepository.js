import { Op } from "sequelize";
import * as model from "../models/index.js";

const excludeTs = ["createdAt", "updatedAt"];

const feeInvoiceItemsInclude = {
  model: model.studentFeeInvoiceItemsModel,
  as: "feeInvoiceItems",
  required: false,
  attributes: { exclude: excludeTs },
  include: [
    {
      model: model.feeTypeCatalogModel,
      as: "feeTypeCatalog",
      attributes: ["feeTypeCatalogId", "name", "ledgerType", "description", "amount"],
    },
  ],
};

const feePlanItemInclude = {
  model: model.feePlanItemModel,
  as: "feePlanItem",
  attributes: { exclude: excludeTs },
  include: [
    {
      model: model.feePlanSubItemsModel,
      as: "feePlanSubItems",
      required: false,
      attributes: { exclude: excludeTs },
    },
  ],
};

const studentInclude = {
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

export async function findFeePlanItemById(feePlanItemId, instituteId, options = {}) {
  const { transaction } = options;
  return model.feePlanItemModel.findOne({
    where: { feePlanItemId, instituteId },
    transaction,
  });
}

export async function findStudentById(studentId, instituteId, options = {}) {
  const { transaction, attributes } = options;
  return model.studentModel.findOne({
    where: { studentId, instituteId },
    attributes: attributes ?? ["studentId", "instituteId", "feePlanProfileId"],
    transaction,
  });
}

export async function findFeePlanSubItemsByFeePlanItemId(feePlanItemId, instituteId, options = {}) {
  const { transaction, supplementalOnly } = options;
  const where = { feePlanItemId, instituteId };
  if (supplementalOnly) {
    where.isMainSubItem = false;
  }
  return model.feePlanSubItemsModel.findAll({
    where,
    order: [["feePlanSubitemId", "ASC"]],
    transaction,
  });
}

export async function findStudentFeeInvoiceByStudentAndItem(
  studentId,
  feePlanItemId,
  instituteId,
  options = {}
) {
  const { transaction } = options;
  return model.studentFeeInvoiceModel.findOne({
    where: { studentId, feePlanItemId, instituteId },
    transaction,
  });
}

export async function createStudentFeeInvoice(data, options = {}) {
  return model.studentFeeInvoiceModel.create(data, { transaction: options.transaction });
}

export async function bulkCreateStudentFeeInvoiceItems(rows, options = {}) {
  return model.studentFeeInvoiceItemsModel.bulkCreate(rows, {
    transaction: options.transaction,
  });
}

export async function findStudentFeeInvoiceById(studentFeeInvoiceId, instituteId, options = {}) {
  const { transaction } = options;
  return model.studentFeeInvoiceModel.findOne({
    where: { studentFeeInvoiceId, instituteId },
    include: [
      studentInclude,
      feePlanItemInclude,
      feeInvoiceItemsInclude,
    ],
    transaction,
  });
}

export async function findStudentFeeInvoicesByStudentId(studentId, instituteId, options = {}) {
  const { transaction } = options;
  return model.studentFeeInvoiceModel.findAll({
    where: { studentId, instituteId },
    include: [feePlanItemInclude, feeInvoiceItemsInclude],
    order: [["studentFeeInvoiceId", "DESC"]],
    transaction,
  });
}

export async function findAllStudentFeeInvoicesByInstitute(instituteId, options = {}) {
  const { transaction, paymentStatuses } = options;
  const where = { instituteId, status: "generated" };

  if (paymentStatuses?.length) {
    where.paymentStatus = { [Op.in]: paymentStatuses };
  }

  return model.studentFeeInvoiceModel.findAll({
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
      feePlanItemInclude,
    ],
    order: [["studentFeeInvoiceId", "DESC"]],
    transaction,
  });
}
