import * as model from "../models/index.js";

export async function findStudentFeeInvoiceForPayment(
  studentFeeInvoiceId,
  instituteId,
  options = {}
) {
  return model.studentFeeInvoiceModel.findOne({
    where: { studentFeeInvoiceId, instituteId },
    attributes: [
      "studentFeeInvoiceId",
      "studentId",
      "feePlanItemId",
      "instituteId",
      "total",
      "status",
      "paymentStatus",
    ],
    transaction: options.transaction,
    lock: options.transaction?.LOCK?.UPDATE,
  });
}

export async function sumPaidAmountByInvoiceId(studentFeeInvoiceId, instituteId, options = {}) {
  const total = await model.studentFeePaymentModel.sum("paid_amount", {
    where: { studentFeeInvoiceId, instituteId },
    transaction: options.transaction,
  });
  return total == null ? 0 : Number(total);
}

export async function createStudentFeePayment(data, options = {}) {
  return model.studentFeePaymentModel.create(data, { transaction: options.transaction });
}

export async function updateInvoicePaymentStatus(
  studentFeeInvoiceId,
  instituteId,
  paymentStatus,
  options = {}
) {
  return model.studentFeeInvoiceModel.update(
    { paymentStatus },
    {
      where: { studentFeeInvoiceId, instituteId },
      transaction: options.transaction,
    }
  );
}

export async function findStudentFeePaymentById(studentFeePaymentId, instituteId, options = {}) {
  return model.studentFeePaymentModel.findOne({
    where: { studentFeePaymentId, instituteId },
    transaction: options.transaction,
  });
}

export async function findPaymentsByInvoiceId(studentFeeInvoiceId, instituteId, options = {}) {
  return model.studentFeePaymentModel.findAll({
    where: { studentFeeInvoiceId, instituteId },
    order: [["studentFeePaymentId", "DESC"]],
    transaction: options.transaction,
  });
}
