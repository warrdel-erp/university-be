import { col, fn, literal, Op } from "sequelize";
import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";
import { toMoneyNumber } from "../utility/decimalMoney.js";

const invoiceItemNetAmountSql = literal(
  "`student_fee_invoice_items`.`amount` - COALESCE(`student_fee_invoice_items`.`waiver`, 0)"
);

export async function findStudentFeeInvoiceForPayment(studentFeeInvoiceId, options = {}) {
  return scoped(model.studentFeeInvoiceModel).findOne({
    where: { studentFeeInvoiceId },
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
export async function sumInvoiceTotalFromInvoiceItemsByInvoiceId(studentFeeInvoiceId, options = {}) {
  const row = await model.studentFeeInvoiceItemsModel.unscoped().findOne({
    attributes: [[fn("SUM", invoiceItemNetAmountSql), "invoiceTotal"]],
    where: { studentFeeInvoiceId },
    include: [
      {
        model: model.studentFeeInvoiceModel.unscoped(),
        as: "studentFeeInvoice",
        attributes: [],
        required: true,
        where: { studentFeeInvoiceId, ...buildScope(model.studentFeeInvoiceModel) },
      },
    ],
    raw: true,
    transaction: options.transaction,
  });

  return toMoneyNumber(row?.invoiceTotal ?? 0);
}

export async function sumInvoiceTotalsByInvoiceIds(studentFeeInvoiceIds, options = {}) {
  const totals = new Map();
  if (!studentFeeInvoiceIds.length) return totals;

  const rows = await model.studentFeeInvoiceItemsModel.unscoped().findAll({
    attributes: [
      "studentFeeInvoiceId",
      [fn("SUM", invoiceItemNetAmountSql), "invoiceTotal"],
    ],
    where: { studentFeeInvoiceId: { [Op.in]: studentFeeInvoiceIds } },
    include: [
      {
        model: model.studentFeeInvoiceModel.unscoped(),
        as: "studentFeeInvoice",
        attributes: [],
        required: true,
        where: buildScope(model.studentFeeInvoiceModel),
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

export async function getInvoicePaymentTotals(studentFeeInvoiceId, options = {}) {
  const [invoice, total, paidAmount] = await Promise.all([
    findStudentFeeInvoiceForPayment(studentFeeInvoiceId, options),
    sumInvoiceTotalFromInvoiceItemsByInvoiceId(studentFeeInvoiceId, options),
    sumPaidAmountFromPaymentItemsByInvoiceId(studentFeeInvoiceId, options),
  ]);

  if (!invoice) return null;

  return { invoice, total, paidAmount };
}

// paidAmount = SUM(payment_item.amount) for reference_id + reference_type (INCOMING only).
export async function sumPaidAmountFromPaymentItemsByReference(
  referenceId,
  referenceType,
  options = {}
) {
  const row = await model.paymentItemModel.unscoped().findOne({
    attributes: [[fn("SUM", col("payment_item.amount")), "paidAmount"]],
    where: { referenceId, referenceType },
    include: [
      {
        model: model.studentFeePaymentModel.unscoped(),
        as: "payment",
        attributes: [],
        required: true,
        where: {
          paymentType: "INCOMING",
          ...buildScope(model.studentFeePaymentModel),
        },
      },
    ],
    raw: true,
    transaction: options.transaction,
  });

  return toMoneyNumber(row?.paidAmount ?? 0);
}

export async function sumPaidAmountFromPaymentItemsByInvoiceId(studentFeeInvoiceId, options = {}) {
  return sumPaidAmountFromPaymentItemsByReference(
    studentFeeInvoiceId,
    "STUDENT_FEE_INVOICE",
    options
  );
}

export async function sumPaidAmountByInvoiceId(studentFeeInvoiceId, options = {}) {
  return sumPaidAmountFromPaymentItemsByInvoiceId(studentFeeInvoiceId, options);
}

export async function createStudentFeePayment(data, options = {}) {
  return scoped(model.studentFeePaymentModel).create(data, { transaction: options.transaction });
}

export async function createPaymentItem(data, options = {}) {
  return model.paymentItemModel.unscoped().create(data, { transaction: options.transaction });
}

export async function updateInvoicePaymentStatus(
  studentFeeInvoiceId,
  paymentStatus,
  paidAmount,
  options = {}
) {
  return scoped(model.studentFeeInvoiceModel).update(
    { paymentStatus, paidAmount },
    {
      where: { studentFeeInvoiceId },
      transaction: options.transaction,
    }
  );
}

export async function findStudentFeePaymentById(studentFeePaymentId, options = {}) {
  return scoped(model.studentFeePaymentModel).findOne({
    where: { studentFeePaymentId },
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

async function findStudentIdsMatchingPaymentSearch(search, options = {}) {
  const term = search.trim();
  const pattern = { [Op.like]: `%${term}%` };

  const rows = await scoped(model.studentModel).findAll({
    where: {
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

function buildPaymentListWhere(filters, matchingStudentIds = []) {
  const andParts = [{ paymentType: "INCOMING" }];

  if (filters.payeeId != null) {
    andParts.push({ payeeId: filters.payeeId });
  }

  const search = filters.search?.trim();
  if (!search) {
    return andParts.length === 1
      ? { paymentType: "INCOMING", ...(filters.payeeId != null ? { payeeId: filters.payeeId } : {}) }
      : { [Op.and]: andParts };
  }

  const pattern = { [Op.like]: `%${search}%` };
  const orConditions = [
    { referenceNumber: pattern },
    { transactionId: pattern },
    { receivedBy: pattern },
  ];

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

export async function findAllPaymentsPaginated(filters = {}, pagination = {}, options = {}) {
  const { page, limit, offset } = resolvePagination(pagination);

  const matchingStudentIds = filters.search
    ? await findStudentIdsMatchingPaymentSearch(filters.search, options)
    : [];

  const where = buildPaymentListWhere(filters, matchingStudentIds);

  const { count, rows } = await scoped(model.studentFeePaymentModel).findAndCountAll({
    where,
    order: [["studentFeePaymentId", "DESC"]],
    limit,
    offset,
    transaction: options.transaction,
  });

  return { rows, total: count, page, limit };
}

export async function findStudentForPaymentDetails(studentId, options = {}) {
  return scoped(model.studentModel).findOne({
    where: { studentId },
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
export async function findLastIncomingPaymentForStudentPayee(studentId, options = {}) {
  return scoped(model.studentFeePaymentModel).findOne({
    where: {
      payeeId: studentId,
      payeeType: "STUDENT",
      paymentType: "INCOMING",
    },
    order: [["studentFeePaymentId", "DESC"]],
    transaction: options.transaction,
  });
}

export async function findGeneratedInvoicesForPaymentDetails(studentId, options = {}) {
  return scoped(model.studentFeeInvoiceModel).findAll({
    where: { studentId, status: "generated" },
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

// paidAmount per reference_id for a given reference_type (INCOMING payments only).
export async function sumPaidAmountByReferenceIds(referenceIds, referenceType, options = {}) {
  if (!referenceIds.length) return new Map();

  const rows = await model.paymentItemModel.unscoped().findAll({
    attributes: [
      "referenceId",
      [fn("SUM", col("payment_item.amount")), "paidAmount"],
    ],
    where: {
      referenceType,
      referenceId: { [Op.in]: referenceIds },
    },
    include: [
      {
        model: model.studentFeePaymentModel.unscoped(),
        as: "payment",
        attributes: [],
        required: true,
        where: {
          paymentType: "INCOMING",
          ...buildScope(model.studentFeePaymentModel),
        },
      },
    ],
    group: ["referenceId"],
    raw: true,
    transaction: options.transaction,
  });

  const paidByReferenceId = new Map();
  for (const row of rows) {
    paidByReferenceId.set(Number(row.referenceId), toMoneyNumber(row.paidAmount ?? 0));
  }
  return paidByReferenceId;
}

export async function sumPaidAmountByInvoiceIds(studentFeeInvoiceIds, options = {}) {
  return sumPaidAmountByReferenceIds(studentFeeInvoiceIds, "STUDENT_FEE_INVOICE", options);
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

export async function findStudentsByIdsForPaymentList(studentIds, options = {}) {
  if (!studentIds.length) return [];

  return scoped(model.studentModel).findAll({
    where: { studentId: { [Op.in]: studentIds } },
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

export async function findStudentCourseSessionById(studentId, options = {}) {
  return scoped(model.studentModel).findOne({
    where: { studentId },
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
