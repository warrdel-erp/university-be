import { col, fn, literal, Op } from "sequelize";
import * as model from "../models/index.js";
import { toMoneyNumber } from "../utility/decimalMoney.js";

const invoiceItemNetAmountSql = literal(
  "`student_fee_invoice_items`.`amount` - COALESCE(`student_fee_invoice_items`.`waiver`, 0)"
);

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
      "status",
      "paymentStatus",
    ],
    transaction: options.transaction,
    lock: options.transaction?.LOCK?.UPDATE,
  });
}

// Invoice total = SUM(amount - waiver) from student_fee_invoice_items (not invoice.total).
export async function sumInvoiceTotalFromInvoiceItemsByInvoiceId(
  studentFeeInvoiceId,
  instituteId,
  options = {}
) {
  const row = await model.studentFeeInvoiceItemsModel.findOne({
    attributes: [[fn("SUM", invoiceItemNetAmountSql), "invoiceTotal"]],
    where: { studentFeeInvoiceId },
    include: [
      {
        model: model.studentFeeInvoiceModel,
        as: "studentFeeInvoice",
        attributes: [],
        required: true,
        where: { studentFeeInvoiceId, instituteId },
      },
    ],
    raw: true,
    transaction: options.transaction,
  });

  return toMoneyNumber(row?.invoiceTotal ?? 0);
}

export async function sumInvoiceTotalsByInvoiceIds(
  studentFeeInvoiceIds,
  instituteId,
  options = {}
) {
  const totals = new Map();
  if (!studentFeeInvoiceIds.length) return totals;

  const rows = await model.studentFeeInvoiceItemsModel.findAll({
    attributes: [
      "studentFeeInvoiceId",
      [fn("SUM", invoiceItemNetAmountSql), "invoiceTotal"],
    ],
    where: { studentFeeInvoiceId: { [Op.in]: studentFeeInvoiceIds } },
    include: [
      {
        model: model.studentFeeInvoiceModel,
        as: "studentFeeInvoice",
        attributes: [],
        required: true,
        where: { instituteId },
      },
    ],
    group: ["studentFeeInvoiceId"],
    raw: true,
    transaction: options.transaction,
  });

  for (const row of rows) {
    totals.set(Number(row.studentFeeInvoiceId), toMoneyNumber(row.invoiceTotal ?? 0));
  }

  return totals;
}

export async function getInvoicePaymentTotals(studentFeeInvoiceId, instituteId, options = {}) {
  const [invoice, total, paidAmount] = await Promise.all([
    findStudentFeeInvoiceForPayment(studentFeeInvoiceId, instituteId, options),
    sumInvoiceTotalFromInvoiceItemsByInvoiceId(studentFeeInvoiceId, instituteId, options),
    sumPaidAmountFromPaymentItemsByInvoiceId(studentFeeInvoiceId, instituteId, options),
  ]);

  if (!invoice) return null;

  return { invoice, total, paidAmount };
}

// paidAmount = SUM(payment_item.amount) for invoice (INCOMING payments only).
export async function sumPaidAmountFromPaymentItemsByInvoiceId(
  studentFeeInvoiceId,
  instituteId,
  options = {}
) {
  const row = await model.paymentItemModel.findOne({
    attributes: [[fn("SUM", col("payment_item.amount")), "paidAmount"]],
    where: {
      referenceId: studentFeeInvoiceId,
      referenceType: "STUDENT_FEE_INVOICE",
    },
    include: [
      {
        model: model.studentFeePaymentModel,
        as: "payment",
        attributes: [],
        required: true,
        where: {
          paymentType: "INCOMING",
          instituteId,
        },
      },
    ],
    raw: true,
    transaction: options.transaction,
  });

  return toMoneyNumber(row?.paidAmount ?? 0);
}

export async function sumPaidAmountByInvoiceId(studentFeeInvoiceId, instituteId, options = {}) {
  return sumPaidAmountFromPaymentItemsByInvoiceId(
    studentFeeInvoiceId,
    instituteId,
    options
  );
}

export async function createStudentFeePayment(data, options = {}) {
  return model.studentFeePaymentModel.create(data, { transaction: options.transaction });
}

export async function createPaymentItem(data, options = {}) {
  return model.paymentItemModel.create(data, { transaction: options.transaction });
}

export async function updateInvoicePaymentStatus(
  studentFeeInvoiceId,
  instituteId,
  paymentStatus,
  paidAmount,
  options = {}
) {
  return model.studentFeeInvoiceModel.update(
    { paymentStatus, paidAmount },
    {
      where: { studentFeeInvoiceId, instituteId },
      transaction: options.transaction,
    }
  );
}

export async function findStudentFeePaymentById(studentFeePaymentId, instituteId, options = {}) {
  return model.studentFeePaymentModel.findOne({
    where: { studentFeePaymentId, instituteId },
    include: [{ model: model.paymentItemModel, as: "paymentItems" }],
    transaction: options.transaction,
  });
}

function resolvePagination(pagination = {}) {
  const page = Number(pagination.page) || 1;
  const limit = Number(pagination.limit) || 20;
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

async function findStudentIdsMatchingPaymentSearch(search, instituteId, options = {}) {
  const term = search.trim();
  const pattern = { [Op.like]: `%${term}%` };

  const rows = await model.studentModel.findAll({
    where: {
      instituteId,
      [Op.or]: [
        { firstName: pattern },
        { middleName: pattern },
        { lastName: pattern },
        { scholarNumber: pattern },
        { enrollNumber: pattern },
        { email: pattern },
        { mobileNumber: pattern },
      ],
    },
    attributes: ["studentId"],
    raw: true,
    transaction: options.transaction,
  });

  const ids = [];
  for (const row of rows) {
    ids.push(row.studentId);
  }
  return ids;
}

function buildPaymentListWhere(instituteId, filters, matchingStudentIds = []) {
  const andParts = [{ instituteId }, { paymentType: "INCOMING" }];

  if (filters.payeeId != null) {
    andParts.push({ payeeId: filters.payeeId });
  }

  const search = filters.search?.trim();
  if (!search) {
    return andParts.length === 2 ? { instituteId, paymentType: "INCOMING", ...(filters.payeeId != null ? { payeeId: filters.payeeId } : {}) } : { [Op.and]: andParts };
  }

  const pattern = { [Op.like]: `%${search}%` };
  const orConditions = [{ referenceNumber: pattern }, { transactionId: pattern }];

  const numericId = Number(search);
  if (search !== "" && !Number.isNaN(numericId)) {
    orConditions.push({ studentFeePaymentId: numericId }, { payeeId: numericId });
  }

  if (matchingStudentIds.length) {
    orConditions.push({
      payeeType: "STUDENT",
      payeeId: { [Op.in]: matchingStudentIds },
    });
  }

  andParts.push({ [Op.or]: orConditions });
  return { [Op.and]: andParts };
}

export async function findAllPaymentsPaginated(instituteId, filters = {}, pagination = {}, options = {}) {
  const { page, limit, offset } = resolvePagination(pagination);

  const matchingStudentIds = filters.search
    ? await findStudentIdsMatchingPaymentSearch(filters.search, instituteId, options)
    : [];

  const where = buildPaymentListWhere(instituteId, filters, matchingStudentIds);

  const { count, rows } = await model.studentFeePaymentModel.findAndCountAll({
    where,
    order: [["studentFeePaymentId", "DESC"]],
    limit,
    offset,
    transaction: options.transaction,
  });

  return { rows, total: count, page, limit };
}

export async function findStudentForPaymentDetails(studentId, instituteId, options = {}) {
  return model.studentModel.findOne({
    where: { studentId, instituteId },
    attributes: [
      "studentId",
      "firstName",
      "middleName",
      "lastName",
      "scholarNumber",
      "email",
      "mobileNumber",
      "enrollNumber",
      "courseId",
      "sessionId",
      "feePlanProfileId",
    ],
    include: [
      {
        model: model.courseModel,
        as: "course",
        attributes: ["courseId", "courseName"],
      },
      {
        model: model.sessionModel,
        as: "studentSession",
        attributes: ["sessionId", "sessionName"],
      },
      {
        model: model.feePlanProfileModel,
        as: "studentFeePlanProfile",
        attributes: ["feePlanProfileId", "name", "planType"],
      },
    ],
    transaction: options.transaction,
  });
}

// Generated invoices + line items (used to compute total from student_fee_invoice_items).
export async function findGeneratedInvoicesForPaymentDetails(studentId, instituteId, options = {}) {
  return model.studentFeeInvoiceModel.findAll({
    where: { studentId, instituteId, status: "generated" },
    attributes: [
      "studentFeeInvoiceId",
      "studentId",
      "feePlanItemId",
      "createDate",
      "dueDate",
      "status",
    ],
    order: [["studentFeeInvoiceId", "DESC"]],
    transaction: options.transaction,
  });
}

// paidAmount per studentFeeInvoiceId from payment_item (INCOMING payments only).
export async function sumPaidAmountByInvoiceIds(studentFeeInvoiceIds, instituteId, options = {}) {
  if (!studentFeeInvoiceIds.length) return new Map();

  const rows = await model.paymentItemModel.findAll({
    attributes: [
      "referenceId",
      [fn("SUM", col("payment_item.amount")), "paidAmount"],
    ],
    where: {
      referenceType: "STUDENT_FEE_INVOICE",
      referenceId: { [Op.in]: studentFeeInvoiceIds },
    },
    include: [
      {
        model: model.studentFeePaymentModel,
        as: "payment",
        attributes: [],
        required: true,
        where: {
          paymentType: "INCOMING",
          instituteId,
        },
      },
    ],
    group: ["referenceId"],
    raw: true,
    transaction: options.transaction,
  });

  const paidByInvoiceId = new Map();
  for (const row of rows) {
    paidByInvoiceId.set(Number(row.referenceId), toMoneyNumber(row.paidAmount ?? 0));
  }
  return paidByInvoiceId;
}

export function collectStudentPayeeIdsFromPayments(paymentRows) {
  const ids = new Set();
  for (const row of paymentRows) {
    const plain = row?.get ? row.get({ plain: true }) : row;
    if (plain?.payeeType === "STUDENT" && plain.payeeId != null) {
      ids.add(plain.payeeId);
    }
  }
  return [...ids];
}

export async function findStudentsByIdsForPaymentList(studentIds, instituteId, options = {}) {
  if (!studentIds.length) return [];

  return model.studentModel.findAll({
    where: { studentId: { [Op.in]: studentIds }, instituteId },
    attributes: [
      "studentId",
      "firstName",
      "middleName",
      "lastName",
      "scholarNumber",
      "courseId",
      "sessionId",
      "feePlanProfileId",
      "email",
      "mobileNumber",
      "enrollNumber",
    ],
    include: [
      {
        model: model.courseModel,
        as: "course",
        attributes: ["courseId", "courseName"],
      },
      {
        model: model.sessionModel,
        as: "studentSession",
        attributes: ["sessionId", "sessionName"],
      },
      {
        model: model.feePlanProfileModel,
        as: "studentFeePlanProfile",
        attributes: ["feePlanProfileId", "name"],
      },
    ],
    transaction: options.transaction,
  });
}

export async function findStudentCourseSessionById(studentId, instituteId, options = {}) {
  return model.studentModel.findOne({
    where: { studentId, instituteId },
    attributes: [
      "studentId",
      "firstName",
      "middleName",
      "lastName",
      "scholarNumber",
      "courseId",
      "sessionId",
      "feePlanProfileId",
      "email",
      "mobileNumber",
      "enrollNumber",
    ],
    include: [
      {
        model: model.courseModel,
        as: "course",
        attributes: ["courseId", "courseName"],
      },
      {
        model: model.sessionModel,
        as: "studentSession",
        attributes: ["sessionId", "sessionName"],
      },
      {
        model: model.feePlanProfileModel,
        as: "studentFeePlanProfile",
        attributes: ["feePlanProfileId", "name", "planType", "courseSessionId"],
      },
    ],
    transaction: options.transaction,
  });
}
