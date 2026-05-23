import sequelize from "../database/sequelizeConfig.js";
import * as paymentRepo from "../repository/studentFeePaymentRepository.js";
import {
  decimalAdd,
  decimalCompare,
  decimalSubtract,
  toMoneyNumber,
} from "../utility/decimalMoney.js";

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function toPlain(row) {
  if (!row) return null;
  return typeof row.get === "function" ? row.get({ plain: true }) : row;
}

function resolvePaymentStatus(totalPaid, invoiceTotal) {
  if (decimalCompare(totalPaid, 0) <= 0) return "unpaid";
  if (decimalCompare(totalPaid, invoiceTotal) < 0) return "partial";
  return "paid";
}

function formatStudentDisplayName(student) {
  if (!student) return "";
  return [student.firstName, student.middleName, student.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function formatPaymentListStudent(student) {
  const s = toPlain(student);
  if (!s?.studentId) return null;

  const course = s.course ?? {};
  const session = s.studentSession ?? {};
  const profile = s.studentFeePlanProfile ?? {};

  return {
    studentId: s.studentId,
    firstName: s.firstName ?? null,
    middleName: s.middleName ?? null,
    lastName: s.lastName ?? null,
    studentName: formatStudentDisplayName(s) || null,
    scholarNumber: s.scholarNumber ?? null,
    email: s.email ?? null,
    mobileNumber: s.mobileNumber ?? null,
    enrollNumber: s.enrollNumber ?? null,
    feePlanProfileId: s.feePlanProfileId ?? profile.feePlanProfileId ?? null,
    feePlanName: profile.name ?? null,
    courseId: course.courseId ?? s.courseId ?? null,
    courseName: course.courseName ?? null,
    sessionId: session.sessionId ?? s.sessionId ?? null,
    sessionName: session.sessionName ?? null,
  };
}

function formatPaymentItem(row) {
  const item = toPlain(row);
  if (!item) return null;
  return {
    paymentItemId: item.paymentItemId,
    paymentId: item.paymentId,
    referenceId: item.referenceId,
    referenceType: item.referenceType,
    amount: toMoneyNumber(item.amount),
    createdAt: item.createdAt ?? item.created_at ?? null,
    updatedAt: item.updatedAt ?? item.updated_at ?? null,
  };
}

function resolvePayeeForPaymentList(payeeType, payeeId, studentById) {
  if (payeeType !== "STUDENT") {
    return { payeeId, payeeType };
  }

  return formatPaymentListStudent(studentById.get(payeeId)) ?? { payeeId, payeeType };
}

export function formatStudentFeePaymentRecord(row, payee = null) {
  const p = toPlain(row);
  if (!p) return null;

  return {
    studentFeePaymentId: p.studentFeePaymentId,
    paymentType: p.paymentType,
    payeeId: p.payeeId,
    payeeType: p.payeeType,
    payee,
    amount: toMoneyNumber(p.amount),
    paymentMethod: p.paymentMethod,
    referenceNumber: p.referenceNumber ?? null,
    transactionId: p.transactionId ?? null,
    instituteId: p.instituteId,
    createdBy: p.createdBy,
    createdAt: p.createdAt ?? p.created_at ?? null,
    updatedAt: p.updatedAt ?? p.updated_at ?? null,
  };
}

export function formatStudentFeePayment(row) {
  const p = toPlain(row);
  if (!p) return null;

  const paymentItems = [];
  for (const item of p.paymentItems ?? []) {
    paymentItems.push(formatPaymentItem(item));
  }

  return {
    ...formatStudentFeePaymentRecord(row),
    paymentItems,
  };
}

function resolveInvoicePaymentAmounts(total, paidAmount) {
  const paid = toMoneyNumber(paidAmount);
  const dueAmount = decimalSubtract(total, paid);

  return {
    total,
    paidAmount: paid,
    dueAmount,
    balanceDue: dueAmount,
    paymentStatus: resolvePaymentStatus(paid, total),
  };
}

function buildAmountsFromTotals(total, paidAmount) {
  return resolveInvoicePaymentAmounts(total, paidAmount);
}

async function loadInvoicePaymentTotals(studentFeeInvoiceId, instituteId, transaction) {
  const result = await paymentRepo.getInvoicePaymentTotals(
    studentFeeInvoiceId,
    instituteId,
    { transaction }
  );
  if (!result) return null;

  return {
    invoicePlain: toPlain(result.invoice),
    ...buildAmountsFromTotals(result.total, result.paidAmount),
  };
}

function assertPaymentAmountAllowed(paymentAmount, total, previousPaidAmount) {
  const dueAmount = decimalSubtract(total, previousPaidAmount);

  if (decimalCompare(previousPaidAmount, total) >= 0) {
    throw httpError("Invoice is already fully paid", 400);
  }
  if (decimalCompare(paymentAmount, dueAmount) > 0) {
    throw httpError(
      `Payment amount exceeds due amount (total - paidAmount). Maximum payable: ${dueAmount}`,
      400
    );
  }
}

async function resolveInvoiceLineForPayment(line, payeeId, instituteId, transaction) {
  const amount = toMoneyNumber(line.amount);
  if (decimalCompare(amount, 0) <= 0) {
    throw httpError("Each payment item amount must be greater than 0");
  }

  const totals = await loadInvoicePaymentTotals(
    line.studentFeeInvoiceId,
    instituteId,
    transaction
  );
  if (!totals) {
    throw httpError(`Student fee invoice not found: ${line.studentFeeInvoiceId}`, 404);
  }

  const { invoicePlain } = totals;

  if (Number(payeeId) !== Number(invoicePlain.studentId)) {
    throw httpError("payeeId does not match the invoice student", 400);
  }

  if (invoicePlain.status !== "generated") {
    throw httpError(
      `Invoice must be generated before recording payment: ${line.studentFeeInvoiceId}`
    );
  }

  assertPaymentAmountAllowed(amount, totals.total, totals.paidAmount);

  return {
    studentFeeInvoiceId: line.studentFeeInvoiceId,
    amount,
    total: totals.total,
    previousPaidAmount: totals.paidAmount,
    newPaidAmount: decimalAdd(totals.paidAmount, amount),
  };
}

function buildOutstandingInvoiceResponse(invoice, amounts) {
  return {
    studentFeeInvoiceId: invoice.studentFeeInvoiceId,
    studentId: invoice.studentId,
    feePlanItemId: invoice.feePlanItemId,
    createDate: invoice.createDate,
    dueDate: invoice.dueDate ?? null,
    status: invoice.status,
    total: amounts.total,
    paidAmount: amounts.paidAmount,
    balanceDue: amounts.balanceDue,
    paymentStatus: amounts.paymentStatus,
  };
}

function buildVerifiedPaymentItem(line, amountsAfter) {
  return {
    studentFeeInvoiceId: line.studentFeeInvoiceId,
    amount: toMoneyNumber(line.amount),
    total: amountsAfter.total,
    paidAmount: amountsAfter.paidAmount,
    dueAmount: amountsAfter.dueAmount,
    paymentStatus: amountsAfter.paymentStatus,
  };
}

export async function recordStudentFeePaymentFromDetails(body, instituteId, createdBy) {
  const paymentType = body.paymentType ?? "INCOMING";
  if (paymentType !== "INCOMING") {
    throw httpError("Only INCOMING payments are supported for student fee invoices");
  }

  const invoiceIds = body.paymentItems.map((line) => line.studentFeeInvoiceId);
  if (new Set(invoiceIds).size !== invoiceIds.length) {
    throw httpError("Duplicate studentFeeInvoiceId in paymentItems", 400);
  }

  const { studentFeePaymentId, resolvedLines } = await sequelize.transaction(async (transaction) => {
    const lines = [];

    for (const line of body.paymentItems) {
      lines.push(
        await resolveInvoiceLineForPayment(line, body.payeeId, instituteId, transaction)
      );
    }

    let paymentTotal = 0;
    for (const line of lines) {
      paymentTotal = decimalAdd(paymentTotal, line.amount);
    }

    const payment = await paymentRepo.createStudentFeePayment(
      {
        paymentType,
        payeeId: body.payeeId,
        payeeType: body.payeeType ?? "STUDENT",
        amount: paymentTotal,
        paymentMethod: body.paymentMethod,
        referenceNumber: body.referenceNumber,
        transactionId: body.transactionId,
        instituteId,
        createdBy,
      },
      { transaction }
    );

    for (const line of lines) {
      await paymentRepo.createPaymentItem(
        {
          paymentId: payment.studentFeePaymentId,
          referenceId: line.studentFeeInvoiceId,
          referenceType: "STUDENT_FEE_INVOICE",
          amount: line.amount,
        },
        { transaction }
      );

      line.amountsAfterPayment = await loadInvoicePaymentTotals(
        line.studentFeeInvoiceId,
        instituteId,
        transaction
      );

      await paymentRepo.updateInvoicePaymentStatus(
        line.studentFeeInvoiceId,
        instituteId,
        line.amountsAfterPayment.paymentStatus,
        line.amountsAfterPayment.paidAmount,
        { transaction }
      );
    }

    return { studentFeePaymentId: payment.studentFeePaymentId, resolvedLines: lines };
  });

  const payment = await paymentRepo.findStudentFeePaymentById(studentFeePaymentId, instituteId);

  const verifiedPaymentItems = [];
  for (const line of resolvedLines) {
    verifiedPaymentItems.push(buildVerifiedPaymentItem(line, line.amountsAfterPayment));
  }

  let verifiedTotal = 0;
  for (const item of verifiedPaymentItems) {
    verifiedTotal = decimalAdd(verifiedTotal, item.amount);
  }

  return {
    payment: formatStudentFeePayment(payment),
    verified: {
      payeeId: body.payeeId,
      total: verifiedTotal,
      paymentItems: verifiedPaymentItems,
    },
  };
}

export async function getStudentFeePaymentById(studentFeePaymentId, instituteId) {
  const payment = await paymentRepo.findStudentFeePaymentById(studentFeePaymentId, instituteId);
  if (!payment) {
    throw httpError("Student fee payment not found", 404);
  }

  const plain = toPlain(payment);
  const studentById = new Map();

  if (plain.payeeType === "STUDENT") {
    const studentRows = await paymentRepo.findStudentsByIdsForPaymentList(
      [plain.payeeId],
      instituteId
    );
    if (studentRows[0]) {
      studentById.set(toPlain(studentRows[0]).studentId, studentRows[0]);
    }
  }

  const payee = resolvePayeeForPaymentList(plain.payeeType, plain.payeeId, studentById);
  const paymentItems = [];
  for (const item of plain.paymentItems ?? []) {
    paymentItems.push(formatPaymentItem(item));
  }

  return {
    ...formatStudentFeePaymentRecord(payment, payee),
    paymentItems,
  };
}

export async function listStudentFeePayments(instituteId, query) {
  const { rows, total, page, limit } = await paymentRepo.findAllPaymentsPaginated(
    instituteId,
    { payeeId: query.payeeId, search: query.search },
    { page: query.page, limit: query.limit }
  );

  const studentIds = paymentRepo.collectStudentPayeeIdsFromPayments(rows);
  const studentRows = await paymentRepo.findStudentsByIdsForPaymentList(studentIds, instituteId);
  const studentById = new Map();
  for (const row of studentRows) {
    const plain = toPlain(row);
    studentById.set(plain.studentId, row);
  }

  const payments = [];
  for (const row of rows) {
    const plain = toPlain(row);
    const payee = resolvePayeeForPaymentList(plain.payeeType, plain.payeeId, studentById);
    payments.push(formatStudentFeePaymentRecord(row, payee));
  }

  return {
    data: { payments },
    pagination: { page, limit, total },
  };
}

export async function getPaymentDetails(studentId, instituteId) {
  const studentRow = await paymentRepo.findStudentForPaymentDetails(studentId, instituteId);
  if (!studentRow) {
    throw httpError("Student not found", 404);
  }

  const invoiceRows = await paymentRepo.findGeneratedInvoicesForPaymentDetails(
    studentId,
    instituteId
  );

  const invoices = [];
  const invoiceIds = [];
  for (const row of invoiceRows) {
    const invoice = toPlain(row);
    invoices.push(invoice);
    invoiceIds.push(invoice.studentFeeInvoiceId);
  }

  const [paidByInvoiceId, totalByInvoiceId] = await Promise.all([
    paymentRepo.sumPaidAmountByInvoiceIds(invoiceIds, instituteId),
    paymentRepo.sumInvoiceTotalsByInvoiceIds(invoiceIds, instituteId),
  ]);

  const outstandingInvoices = [];
  for (const invoice of invoices) {
    const paidAmount = paidByInvoiceId.get(invoice.studentFeeInvoiceId) ?? 0;
    const total = totalByInvoiceId.get(invoice.studentFeeInvoiceId) ?? 0;
    const amounts = buildAmountsFromTotals(total, paidAmount);

    if (decimalCompare(amounts.paidAmount, amounts.total) >= 0) continue;

    outstandingInvoices.push(buildOutstandingInvoiceResponse(invoice, amounts));
  }

  return {
    student: formatPaymentListStudent(studentRow),
    invoices: outstandingInvoices,
  };
}
