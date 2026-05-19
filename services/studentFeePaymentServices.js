import sequelize from "../database/sequelizeConfig.js";
import * as paymentRepo from "../repository/studentFeePaymentRepository.js";
import * as invoiceRepo from "../repository/studentFeeInvoiceRepository.js";
import * as feePlanProfileRepository from "../repository/feePlanProfileRepository.js";
import { formatStudentFeeInvoiceResponse } from "./studentFeeInvoiceServices.js";
import {
  decimalAdd,
  decimalCompare,
  decimalGreaterThan,
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

function formatFeePlanProfile(profile) {
  const p = toPlain(profile);
  if (!p?.feePlanProfileId) return null;

  return {
    feePlanProfileId: p.feePlanProfileId,
    name: p.name ?? null,
    planType: p.planType ?? null,
    courseSessionId: p.courseSessionId ?? null,
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
  };
}

export function formatStudentFeePayment(row) {
  const p = toPlain(row);
  if (!p) return null;
  return {
    studentFeePaymentId: p.studentFeePaymentId,
    studentFeeInvoiceId: p.studentFeeInvoiceId,
    paymentType: p.paymentType,
    payeeId: p.payeeId,
    payeeType: p.payeeType,
    amount: toMoneyNumber(p.amount),
    paymentMethod: p.paymentMethod,
    referenceNumber: p.referenceNumber ?? null,
    transactionId: p.transactionId ?? null,
    instituteId: p.instituteId,
    createdBy: p.createdBy,
    paymentItems: (p.paymentItems ?? []).map(formatPaymentItem),
    createdAt: p.createdAt ?? p.created_at ?? null,
    updatedAt: p.updatedAt ?? p.updated_at ?? null,
  };
}

export async function recordStudentFeePayment(body, instituteId, createdBy) {
  const amount = toMoneyNumber(body.amount);
  if (decimalCompare(amount, 0) <= 0) {
    throw httpError("amount must be greater than 0");
  }

  const paymentType = body.paymentType ?? "INCOMING";
  if (paymentType !== "INCOMING") {
    throw httpError("Only INCOMING payments are supported for student fee invoices");
  }

  const studentFeePaymentId = await sequelize.transaction(async (transaction) => {
    const invoice = await paymentRepo.findStudentFeeInvoiceForPayment(
      body.studentFeeInvoiceId,
      instituteId,
      { transaction }
    );
    if (!invoice) {
      throw httpError("Student fee invoice not found", 404);
    }

    const invoicePlain = toPlain(invoice);
    if (invoicePlain.status !== "generated") {
      throw httpError("Invoice must be generated before recording payment");
    }

    const invoiceTotal = toMoneyNumber(invoicePlain.total);
    const alreadyPaid = await paymentRepo.sumPaidAmountByInvoiceId(
      body.studentFeeInvoiceId,
      instituteId,
      { transaction }
    );
    const totalAfterPayment = decimalAdd(alreadyPaid, amount);

    if (decimalGreaterThan(totalAfterPayment, invoiceTotal)) {
      const balanceDue = decimalSubtract(invoiceTotal, alreadyPaid);
      throw httpError(`Payment exceeds balance due. Maximum payable: ${balanceDue}`, 400);
    }

    const payment = await paymentRepo.createStudentFeePayment(
      {
        studentFeeInvoiceId: body.studentFeeInvoiceId,
        paymentType,
        payeeId: body.payeeId ?? invoicePlain.studentId,
        payeeType: body.payeeType ?? "STUDENT",
        amount,
        paymentMethod: body.paymentMethod,
        referenceNumber: body.referenceNumber ?? null,
        transactionId: body.transactionId ?? null,
        instituteId,
        createdBy,
      },
      { transaction }
    );

    await paymentRepo.createPaymentItem(
      {
        paymentId: payment.studentFeePaymentId,
        referenceId: body.studentFeeInvoiceId,
        referenceType: "STUDENT_FEE_INVOICE",
        amount,
      },
      { transaction }
    );

    const paymentStatus = resolvePaymentStatus(totalAfterPayment, invoiceTotal);
    await paymentRepo.updateInvoicePaymentStatus(
      body.studentFeeInvoiceId,
      instituteId,
      paymentStatus,
      { transaction }
    );

    return payment.studentFeePaymentId;
  });

  const payment = await paymentRepo.findStudentFeePaymentById(studentFeePaymentId, instituteId);
  const invoice = await invoiceRepo.findStudentFeeInvoiceById(
    body.studentFeeInvoiceId,
    instituteId
  );

  return {
    payment: formatStudentFeePayment(payment),
    invoice: formatStudentFeeInvoiceResponse(invoice),
  };
}

export async function listPaymentsByInvoiceId(studentFeeInvoiceId, instituteId) {
  const invoiceRow = await invoiceRepo.findStudentFeeInvoiceById(
    studentFeeInvoiceId,
    instituteId
  );
  if (!invoiceRow) {
    throw httpError("Student fee invoice not found", 404);
  }

  const invoicePlain = toPlain(invoiceRow);
  const invoice = formatStudentFeeInvoiceResponse(invoiceRow);
  const studentId = invoicePlain.studentId;

  const [paymentRows, studentRow] = await Promise.all([
    paymentRepo.findPaymentsByInvoiceId(studentFeeInvoiceId, instituteId),
    paymentRepo.findStudentCourseSessionById(studentId, instituteId),
  ]);

  const feePlanProfileId =
    invoicePlain.studentFeeInvoiceStudent?.feePlanProfileId ??
    toPlain(studentRow)?.feePlanProfileId ??
    invoice?.feePlanItem?.feePlanProfileId ??
    null;

  let feePlan = null;

  if (feePlanProfileId) {
    const profileRow = await feePlanProfileRepository.findFeePlanProfileByIdForInstitute(
      feePlanProfileId,
      instituteId
    );
    feePlan = formatFeePlanProfile(profileRow);
  }

  const invoiceTotal = invoice?.total ?? toMoneyNumber(invoicePlain.total);
  const totalPaid =
    invoice?.totalPaid ??
    decimalSum(paymentRows.map((r) => toMoneyNumber(toPlain(r).amount)));
  const balanceDue = invoice?.balanceDue ?? decimalSubtract(invoiceTotal, totalPaid);
  const paymentStatus = invoice?.paymentStatus ?? invoicePlain.paymentStatus;

  return {
    studentFeeInvoiceId,
    student: formatPaymentListStudent(studentRow),
    invoice,
    feePlan,
    invoiceTotal,
    totalPaid,
    balanceDue,
    paymentStatus,
    payments: paymentRows.map((r) => formatStudentFeePayment(r)),
  };
}
