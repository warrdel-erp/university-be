import sequelize from "../database/sequelizeConfig.js";
import * as paymentRepo from "../repository/studentFeePaymentRepository.js";
import * as invoiceRepo from "../repository/studentFeeInvoiceRepository.js";
import * as feePlanProfileRepository from "../repository/feePlanProfileRepository.js";
import * as studentRepository from "../repository/studentRepository.js";
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

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

function resolveTermDisplayStatus(feePlanItem, invoice, today = todayDateOnly()) {
  const startDate = String(feePlanItem.createDate).slice(0, 10);

  if (!invoice) {
    return startDate > today ? "upcoming" : "pending";
  }

  if (invoice.paymentStatus === "paid") return "paid";
  if (invoice.paymentStatus === "partial") return "partial";
  return "unpaid";
}

function buildStudentInvoiceMap(invoices) {
  const byStudent = new Map();
  for (const inv of invoices) {
    const p = toPlain(inv);
    if (!byStudent.has(p.studentId)) {
      byStudent.set(p.studentId, new Map());
    }
    if (p.feePlanItemId != null) {
      byStudent.get(p.studentId).set(p.feePlanItemId, p);
    }
  }
  return byStudent;
}

function formatPaymentTermRow(feePlanItem, invoice, index) {
  const item = toPlain(feePlanItem);
  const inv = invoice ? toPlain(invoice) : null;

  return {
    sno: index + 1,
    feePlanItemId: item.feePlanItemId,
    termName: item.termName ?? null,
    startDate: item.createDate,
    endDate: item.dueDate ?? null,
    amount: toMoneyNumber(item.amount),
    status: resolveTermDisplayStatus(item, inv),
    studentFeeInvoiceId: inv?.studentFeeInvoiceId ?? null,
    paymentStatus: inv?.paymentStatus ?? null,
    isCurrentInvoice: false,
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
  let terms = [];

  if (feePlanProfileId) {
    const [profileRow, feePlanItems, studentInvoices] = await Promise.all([
      feePlanProfileRepository.findFeePlanProfileByIdForInstitute(
        feePlanProfileId,
        instituteId,
      ),
      studentRepository.findFeePlanItemsByProfileIds([feePlanProfileId], instituteId),
      studentRepository.findInvoicesByStudentIds([studentId], instituteId),
    ]);

    feePlan = formatFeePlanProfile(profileRow);
    const invoiceByItem = buildStudentInvoiceMap(studentInvoices).get(studentId) ?? new Map();

    terms = feePlanItems.map((item, index) => {
      const row = formatPaymentTermRow(item, invoiceByItem.get(toPlain(item).feePlanItemId), index);
      row.isCurrentInvoice = row.studentFeeInvoiceId === studentFeeInvoiceId;
      return row;
    });
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
    terms,
    invoiceTotal,
    totalPaid,
    balanceDue,
    paymentStatus,
    payments: paymentRows.map((r) => formatStudentFeePayment(r)),
  };
}
