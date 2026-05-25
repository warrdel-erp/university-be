import sequelize from "../database/sequelizeConfig.js";
import * as paymentRepo from "../repository/studentFeePaymentRepository.js";
import {
  decimalAdd,
  decimalCompare,
  decimalSubtract,
  decimalSum,
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
    receivedBy: p.receivedBy ?? null,
    remark: p.remark ?? null,
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

export async function recordStudentFeePaymentFromDetails(body, instituteId, createdBy) {
  const paymentType = body.paymentType ?? "INCOMING";
  if (paymentType !== "INCOMING") {
    throw httpError("Only INCOMING payments are supported for student fee invoices");
  }

  const referenceKeys = body.paymentItems.map(
    (line) => `${line.referenceType}:${line.referenceId}`
  );
  if (new Set(referenceKeys).size !== referenceKeys.length) {
    throw httpError("Duplicate referenceId and referenceType in paymentItems", 400);
  }

  const paymentTotal = toMoneyNumber(body.amount);
  const itemsTotal = decimalSum(
    body.paymentItems.map((item) => toMoneyNumber(item.amount))
  );

  if (decimalCompare(paymentTotal, 0) <= 0) {
    throw httpError("amount must be greater than 0");
  }

  if (decimalCompare(paymentTotal, itemsTotal) !== 0) {
    throw httpError(
      `amount must equal the sum of paymentItems amounts (${itemsTotal})`
    );
  }

  const { studentFeePaymentId, resolvedLines } = await sequelize.transaction(async (transaction) => {
    const lines = [];

    for (const line of body.paymentItems) {
      const referenceId = line.referenceId;
      const referenceType = line.referenceType;
      const amount = toMoneyNumber(line.amount);

      if (decimalCompare(amount, 0) <= 0) {
        throw httpError("Each payment item amount must be greater than 0");
      }

      if (referenceType === "STUDENT_FEE_INVOICE") {
        if (body.payeeType !== "STUDENT") {
          throw httpError("payeeType must be STUDENT for student fee invoice payment items", 400);
        }

        const invoiceTotals = await paymentRepo.getInvoicePaymentTotals(
          referenceId,
          instituteId,
          { transaction }
        );
        if (!invoiceTotals) {
          throw httpError(`Student fee invoice not found: ${referenceId}`, 404);
        }

        const invoicePlain = toPlain(invoiceTotals.invoice);
        const invoiceTotal = invoiceTotals.total;
        const previousPaidAmount = invoiceTotals.paidAmount;
        const dueAmount = decimalSubtract(invoiceTotal, previousPaidAmount);

        if (Number(body.payeeId) !== Number(invoicePlain.studentId)) {
          throw httpError("payeeId does not match the invoice student", 400);
        }

        if (invoicePlain.status !== "generated") {
          throw httpError(`Invoice must be generated before recording payment: ${referenceId}`);
        }

        if (decimalCompare(previousPaidAmount, invoiceTotal) >= 0) {
          throw httpError("Invoice is already fully paid", 400);
        }
        if (decimalCompare(amount, dueAmount) > 0) {
          throw httpError(
            `Payment amount exceeds due amount (total - paidAmount). Maximum payable: ${dueAmount}`,
            400
          );
        }

        lines.push({
          referenceId,
          referenceType,
          amount,
          total: invoiceTotal,
          previousPaidAmount,
          newPaidAmount: decimalAdd(previousPaidAmount, amount),
        });
        continue;
      }

      if (referenceType === "STUDENT_LIBRARY_INVOICE") {
        throw httpError("STUDENT_LIBRARY_INVOICE payment items are not supported yet", 400);
      }

      lines.push({ referenceId, referenceType, amount });
    }

    const payment = await paymentRepo.createStudentFeePayment(
      {
        paymentType,
        payeeId: body.payeeId,
        payeeType: body.payeeType,
        amount: paymentTotal,
        paymentMethod: body.paymentMethod,
        referenceNumber: body.referenceNumber,
        transactionId: body.transactionId,
        receivedBy: body.receivedBy ?? null,
        remark: body.remark ?? null,
        instituteId,
        createdBy,
      },
      { transaction }
    );

    for (const line of lines) {
      await paymentRepo.createPaymentItem(
        {
          paymentId: payment.studentFeePaymentId,
          referenceId: line.referenceId,
          referenceType: line.referenceType,
          amount: line.amount,
        },
        { transaction }
      );

      if (line.referenceType === "STUDENT_FEE_INVOICE") {
        const totalsAfter = await paymentRepo.getInvoicePaymentTotals(
          line.referenceId,
          instituteId,
          { transaction }
        );
        const paidAfter = toMoneyNumber(totalsAfter.paidAmount);
        let paymentStatus = "unpaid";
        if (decimalCompare(paidAfter, 0) > 0) {
          paymentStatus =
            decimalCompare(paidAfter, totalsAfter.total) < 0 ? "partial" : "paid";
        }

        line.amountsAfterPayment = {
          total: totalsAfter.total,
          paidAmount: paidAfter,
          dueAmount: decimalSubtract(totalsAfter.total, paidAfter),
          paymentStatus,
        };

        await paymentRepo.updateInvoicePaymentStatus(
          line.referenceId,
          instituteId,
          paymentStatus,
          paidAfter,
          { transaction }
        );
      }
    }

    return { studentFeePaymentId: payment.studentFeePaymentId, resolvedLines: lines };
  });

  const payment = await paymentRepo.findStudentFeePaymentById(studentFeePaymentId, instituteId);

  const verifiedPaymentItems = [];
  for (const line of resolvedLines) {
    const verified = {
      referenceId: line.referenceId,
      referenceType: line.referenceType,
      amount: toMoneyNumber(line.amount),
    };
    if (line.amountsAfterPayment) {
      verified.total = line.amountsAfterPayment.total;
      verified.paidAmount = line.amountsAfterPayment.paidAmount;
      verified.dueAmount = line.amountsAfterPayment.dueAmount;
      verified.paymentStatus = line.amountsAfterPayment.paymentStatus;
    }
    verifiedPaymentItems.push(verified);
  }

  return {
    payment: formatStudentFeePayment(payment),
    verified: {
      payeeId: body.payeeId,
      total: paymentTotal,
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
  const [studentRow, invoiceRows, lastPaymentRow] = await Promise.all([
    paymentRepo.findStudentForPaymentDetails(studentId, instituteId),
    paymentRepo.findGeneratedInvoicesForPaymentDetails(studentId, instituteId),
    paymentRepo.findLastIncomingPaymentForStudentPayee(studentId, instituteId),
  ]);

  if (!studentRow) {
    throw httpError("Student not found", 404);
  }

  const invoices = [];
  const invoiceIds = [];
  for (const row of invoiceRows) {
    const invoice = toPlain(row);
    invoices.push(invoice);
    invoiceIds.push(invoice.studentFeeInvoiceId);
  }

  const [paidByReferenceId, totalByInvoiceId] = await Promise.all([
    paymentRepo.sumPaidAmountByReferenceIds(invoiceIds, "STUDENT_FEE_INVOICE", instituteId),
    paymentRepo.sumInvoiceTotalsByInvoiceIds(invoiceIds, instituteId),
  ]);

  const outstandingInvoices = [];
  const balanceDueAmounts = [];

  for (const invoice of invoices) {
    const paidAmount = toMoneyNumber(paidByReferenceId.get(invoice.studentFeeInvoiceId) ?? 0);
    const total = toMoneyNumber(totalByInvoiceId.get(invoice.studentFeeInvoiceId) ?? 0);
    const balanceDue = decimalSubtract(total, paidAmount);

    if (decimalCompare(paidAmount, total) >= 0) continue;

    let paymentStatus = "unpaid";
    if (decimalCompare(paidAmount, 0) > 0) {
      paymentStatus = decimalCompare(paidAmount, total) < 0 ? "partial" : "paid";
    }

    outstandingInvoices.push({
      studentFeeInvoiceId: invoice.studentFeeInvoiceId,
      studentId: invoice.studentId,
      feePlanItemId: invoice.feePlanItemId,
      createDate: invoice.createDate,
      dueDate: invoice.dueDate ?? null,
      status: invoice.status,
      total,
      paidAmount,
      balanceDue,
      paymentStatus,
    });
    balanceDueAmounts.push(balanceDue);
  }

  const lastPayment = toPlain(lastPaymentRow);

  return {
    student: formatPaymentListStudent(studentRow),
    totalInvoices: invoices.length,
    lastPayment: lastPayment
      ? {
          studentFeePaymentId: lastPayment.studentFeePaymentId,
          amount: toMoneyNumber(lastPayment.amount),
          paymentMethod: lastPayment.paymentMethod ?? null,
          paymentDate: lastPayment.createdAt ?? lastPayment.created_at ?? null,
        }
      : null,
    outstandingAmount: decimalSum(balanceDueAmounts),
    totalPaymentReceived: decimalSum([...paidByReferenceId.values()]),
    invoices: outstandingInvoices,
  };
}
