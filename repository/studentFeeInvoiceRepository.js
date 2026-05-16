import { Op } from "sequelize";
import * as model from "../models/index.js";

const excludeTs = ["createdAt", "updatedAt"];

const additionalFeeLineInclude = {
  model: model.studentInvoiceAdditionalFeeModel,
  as: "invoiceAdditionalFees",
  required: false,
  attributes: { exclude: excludeTs },
  include: [
    {
      model: model.additionalFeeModel,
      as: "additionalFee",
      attributes: ["additionalFeeId", "amount", "feeTypeCatalogId", "feePlanItemId"],
      include: [
        {
          model: model.feeTypeCatalogModel,
          as: "feeTypeCatalog",
          attributes: ["feeTypeCatalogId", "name", "description", "amount"],
        },
      ],
    },
  ],
};

const feePlanItemInclude = {
  model: model.feePlanItemModel,
  as: "feePlanItem",
  attributes: { exclude: excludeTs },
};

const feePaymentsInclude = {
  model: model.studentFeePaymentModel,
  as: "feePayments",
  required: false,
  attributes: { exclude: excludeTs },
};

export async function findFeePlanItemById(feePlanItemId, instituteId, options = {}) {
  const { transaction } = options;
  return model.feePlanItemModel.findOne({
    where: { feePlanItemId, instituteId },
    transaction,
  });
}

export async function findStudentById(studentId, instituteId, options = {}) {
  const { transaction } = options;
  return model.studentModel.findOne({
    where: { studentId, instituteId },
    attributes: ["studentId", "instituteId", "feePlanProfileId"],
    transaction,
  });
}

export async function findAdditionalFeesByFeePlanItemId(feePlanItemId, instituteId, options = {}) {
  const { transaction } = options;
  return model.additionalFeeModel.findAll({
    where: { feePlanItemId, instituteId },
    order: [["additionalFeeId", "ASC"]],
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

export async function bulkCreateStudentInvoiceAdditionalFees(rows, options = {}) {
  return model.studentInvoiceAdditionalFeeModel.bulkCreate(rows, {
    transaction: options.transaction,
    returning: true,
  });
}

export async function findStudentFeeInvoiceById(studentFeeInvoiceId, instituteId, options = {}) {
  const { transaction } = options;
  return model.studentFeeInvoiceModel.findOne({
    where: { studentFeeInvoiceId, instituteId },
    include: [feePlanItemInclude, additionalFeeLineInclude, feePaymentsInclude],
    transaction,
  });
}

export async function findStudentFeeInvoicesByStudentId(studentId, instituteId, options = {}) {
  const { transaction } = options;
  return model.studentFeeInvoiceModel.findAll({
    where: { studentId, instituteId },
    include: [feePlanItemInclude, additionalFeeLineInclude, feePaymentsInclude],
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
      "amount",
      "total",
      "createDate",
      "dueDate",
      "status",
      "paymentStatus",
    ],
    include: [
      {
        model: model.studentModel,
        as: "studentFeeInvoiceStudent",
        attributes: ["studentId", "firstName", "middleName", "lastName", "scholarNumber"],
        required: true,
      },
      feePlanItemInclude,
      feePaymentsInclude,
    ],
    order: [["studentFeeInvoiceId", "DESC"]],
    transaction,
  });
}
