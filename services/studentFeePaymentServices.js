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

export function formatStudentFeePayment(row) {
  const p = toPlain(row);
  if (!p) return null;
  return {
    studentFeePaymentId: p.studentFeePaymentId,
    studentFeeInvoiceId: p.studentFeeInvoiceId,
    instituteId: p.instituteId,
    paidAmount: toMoneyNumber(p.paidAmount),
    paymentDate: p.paymentDate,
    paymentMethod: p.paymentMethod,
    referenceNumber: p.referenceNumber ?? null,
    notes: p.notes ?? null,
    createdBy: p.createdBy,
    createdAt: p.createdAt ?? p.created_at ?? null,
    updatedAt: p.updatedAt ?? p.updated_at ?? null,
  };
}

export async function recordStudentFeePayment(body, instituteId, createdBy) {
  const paidAmount = toMoneyNumber(body.paidAmount);
  if (decimalCompare(paidAmount, 0) <= 0) {
    throw httpError("paidAmount must be greater than 0");
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
    const totalAfterPayment = decimalAdd(alreadyPaid, paidAmount);

    if (decimalGreaterThan(totalAfterPayment, invoiceTotal)) {
      const balanceDue = decimalSubtract(invoiceTotal, alreadyPaid);
      throw httpError(
        `Payment exceeds balance due. Maximum payable: ${balanceDue}`,
        400
      );
    }

    const payment = await paymentRepo.createStudentFeePayment(
      {
        studentFeeInvoiceId: body.studentFeeInvoiceId,
        instituteId,
        paidAmount,
        paymentDate: body.paymentDate,
        paymentMethod: body.paymentMethod,
        referenceNumber: body.referenceNumber ?? null,
        notes: body.notes ?? null,
        createdBy,
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
    instituteId,
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
      instituteId,
    );
    feePlan = formatFeePlanProfile(profileRow);
  }

  const invoiceTotal = invoice?.total ?? toMoneyNumber(invoicePlain.total);
  const totalPaid =
    invoice?.totalPaid ??
    decimalSum(paymentRows.map((r) => toMoneyNumber(toPlain(r).paidAmount)));
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
