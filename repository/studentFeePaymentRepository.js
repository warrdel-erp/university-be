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
      "billingScheduleItemId",
      "instituteId",
      "baseAmount",
      "discountAmount",
      "total",
      "paidAmount",
      "status",
      "paymentStatus",
    ],
    transaction: options.transaction,
    lock: options.transaction?.LOCK?.UPDATE,
  });
}

// Invoice total: invoice.total is payable amount (baseAmount - discountAmount is truth).
export async function sumInvoiceTotalFromInvoiceItemsByInvoiceId(studentFeeInvoiceId, options = {}) {
  const invoice = await findStudentFeeInvoiceForPayment(studentFeeInvoiceId, options);
  if (!invoice) return 0;
  const invPlain = invoice.get ? invoice.get({ plain: true }) : invoice;
  const base = toMoneyNumber(invPlain.baseAmount != null ? invPlain.baseAmount : invPlain.total);
  const disc = toMoneyNumber(invPlain.discountAmount ?? 0);
  return toMoneyNumber(
    invPlain.total != null && Number(invPlain.total) > 0
      ? invPlain.total
      : Math.max(0, base - disc)
  );
}

export async function sumInvoiceTotalsByInvoiceIds(studentFeeInvoiceIds, options = {}) {
  const totals = new Map();
  if (!studentFeeInvoiceIds.length) return totals;

  const rows = await scoped(model.studentFeeInvoiceModel).findAll({
    attributes: [
      "studentFeeInvoiceId",
      "baseAmount",
      "discountAmount",
      "total",
    ],
    where: { studentFeeInvoiceId: { [Op.in]: studentFeeInvoiceIds } },
    raw: true,
    transaction: options.transaction,
  });

  for (const row of rows) {
    const base = toMoneyNumber(row.baseAmount != null ? row.baseAmount : row.total);
    const disc = toMoneyNumber(row.discountAmount ?? 0);
    const tot = toMoneyNumber(
      row.total != null && Number(row.total) > 0 ? row.total : Math.max(0, base - disc)
    );
    totals.set(Number(row.studentFeeInvoiceId), tot);
  }

  return totals;
}

export async function getInvoicePaymentTotals(studentFeeInvoiceId, options = {}) {
  const [invoice, paidAmount] = await Promise.all([
    findStudentFeeInvoiceForPayment(studentFeeInvoiceId, options),
    sumPaidAmountFromPaymentItemsByInvoiceId(studentFeeInvoiceId, options),
  ]);

  if (!invoice) return null;

  const invPlain = invoice.get ? invoice.get({ plain: true }) : invoice;
  const baseAmount = toMoneyNumber(
    invPlain.baseAmount != null
      ? invPlain.baseAmount
      : Number(invPlain.total || 0) + Number(invPlain.discountAmount || 0)
  );
  const discountAmount = toMoneyNumber(invPlain.discountAmount != null ? invPlain.discountAmount : 0);
  // Total is payable amount, baseAmount - discountAmount is truth
  const total = toMoneyNumber(
    invPlain.total != null && Number(invPlain.total) > 0
      ? invPlain.total
      : Math.max(0, baseAmount - discountAmount)
  );

  return { invoice, total, paidAmount };
}

// paidAmount = SUM(payment_item.amount) for reference_id + reference_type (INCOMING only).
export async function sumPaidAmountFromPaymentItemsByReference(
  referenceId,
  referenceType,
  options = {}
) {
  const row = await scoped(model.paymentItemModel).findOne({
    attributes: [[fn("SUM", col("payment_item.amount")), "paidAmount"]],
    where: { referenceId, referenceType },
    include: [
      {
        model: model.studentFeePaymentModel,
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
  return scoped(model.paymentItemModel).create(data, { transaction: options.transaction });
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

export async function findStudentFeePaymentsByInvoiceId(studentFeeInvoiceId, options = {}) {
  const itemRows = await scoped(model.paymentItemModel).findAll({
    attributes: ["paymentId"],
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
          ...buildScope(model.studentFeePaymentModel),
        },
      },
    ],
    transaction: options.transaction,
  });

  const paymentIds = [
    ...new Set(
      itemRows.map((row) => {
        const plain = row.get ? row.get({ plain: true }) : row;
        return plain.paymentId;
      }),
    ),
  ];

  if (!paymentIds.length) {
    return [];
  }

  return scoped(model.studentFeePaymentModel).findAll({
    where: { studentFeePaymentId: { [Op.in]: paymentIds } },
    include: [{ model: model.paymentItemModel, as: "paymentItems" }],
    order: [["studentFeePaymentId", "DESC"]],
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
        { admissionNumber: pattern },
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
      "admissionNumber",
      "courseId",
      "sessionId",
      "batchId",
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

export async function findGeneratedInvoicesForPaymentDetails(
  studentId,
  { billingScheduleItemId } = {},
  options = {}
) {
  const where = { studentId, status: "generated" };
  if (billingScheduleItemId != null) {
    where.billingScheduleItemId = Number(billingScheduleItemId);
  }

  return scoped(model.studentFeeInvoiceModel).findAll({
    where,
    attributes: [
      "studentFeeInvoiceId",
      "studentId",
      "billingScheduleItemId",
      "baseAmount",
      "discountAmount",
      "total",
      "paidAmount",
      "paymentStatus",
      "createDate",
      "dueDate",
      "status",
    ],
    include: [
      {
        model: model.billingScheduleItemsModel,
        as: "billingScheduleItem",
        required: false,
        attributes: [
          "billingScheduleItemId",
          "amount",
          "plannedDate",
          "status",
        ],
      },
    ],
    order: [["studentFeeInvoiceId", "DESC"]],
    transaction: options.transaction,
  });
}

export async function findInvoiceByBillingScheduleItemAndStudent(
  billingScheduleItemId,
  studentId,
  options = {}
) {
  return scoped(model.studentFeeInvoiceModel).findOne({
    where: {
      billingScheduleItemId: Number(billingScheduleItemId),
      studentId: Number(studentId),
      status: "generated",
    },
    transaction: options.transaction,
  });
}

// paidAmount per reference_id for a given reference_type (INCOMING payments only).
export async function sumPaidAmountByReferenceIds(referenceIds, referenceType, options = {}) {
  if (!referenceIds.length) return new Map();

  const rows = await scoped(model.paymentItemModel).findAll({
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
        model: model.studentFeePaymentModel,
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
      "batchId",
      "email",
      "mobileNumber",
      "enrollNumber",
      "admissionNumber",
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
      "batchId",
      "email",
      "mobileNumber",
      "enrollNumber",
      "admissionNumber",
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
    ],
    transaction: options.transaction,
  });
}
