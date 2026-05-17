import sequelize from "../database/sequelizeConfig.js";
import * as repo from "../repository/studentFeeInvoiceRepository.js";
import * as feeTypeCatalogRepo from "../repository/feeTypeCatalogRepository.js";
import {
  decimalCompare,
  decimalSubtract,
  decimalSum,
  toMoneyNumber,
} from "../utility/decimalMoney.js";



function netLineAmount(amount, waiver) {
  const lineAmount = toMoneyNumber(amount);
  if (waiver === undefined || waiver === null) return lineAmount;
  return decimalSubtract(lineAmount, toMoneyNumber(waiver));
}

function paymentSummaryFromPlain(p) {
  const payments = p.feePayments ?? [];
  const totalPaid = decimalSum(payments.map((pay) => toMoneyNumber(pay.paidAmount)));
  const invoiceTotal = toMoneyNumber(p.total);
  return {
    paymentStatus: p.paymentStatus ?? "unpaid",
    totalPaid,
    balanceDue: decimalSubtract(invoiceTotal, totalPaid),
  };
}

function toPlain(row) {
  if (!row) return null;
  return typeof row.get === "function" ? row.get({ plain: true }) : row;
}

function formatStudentFeeInvoiceListStudent(student) {
  const s = toPlain(student);
  if (!s?.studentId) return null;

  return {
    studentId: s.studentId,
    studentName: formatStudentDisplayName(s) || null,
    scholarNumber: s.scholarNumber ?? null,
  };
}

function formatStudentFeeInvoiceStudent(student) {
  const s = toPlain(student);
  if (!s?.studentId) return null;

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
    feePlanProfileId: s.feePlanProfileId ?? null,
  };
}

function mapAdditionalFeeLine(line) {
  const catalog = line.additionalFee?.feeTypeCatalog ?? {};
  const amount = toMoneyNumber(line.amount);
  const waiver =
    line.waiver === undefined || line.waiver === null ? null : toMoneyNumber(line.waiver);
  const netAmount = netLineAmount(line.amount, line.waiver);

  return {
    studentInvoiceAdditionalFeeId: line.studentInvoiceAdditionalFeeId,
    additionalFeeId: line.additionalFeeId,
    feeTypeCatalogId: catalog.feeTypeCatalogId ?? line.additionalFee?.feeTypeCatalogId ?? null,
    name: catalog.name ?? null,
    description: catalog.description ?? null,
    catalogAmount: catalog.amount != null ? toMoneyNumber(catalog.amount) : null,
    amount,
    waiver,
    netAmount,
  };
}

/**
 * Builds GET/POST response: additionalFees[], computed total, verified against DB total.
 * Frontend should use `total` (computed); `storedTotal` + `totalVerified` for audit.
 */
export function formatStudentFeeInvoiceResponse(row) {
  const p = toPlain(row);
  if (!p) return null;

  const item = p.feePlanItem ?? {};
  const baseAmount = toMoneyNumber(p.amount);
  const additionalFees = (p.invoiceAdditionalFees ?? []).map(mapAdditionalFeeLine);
  const additionalFeesTotal = decimalSum(additionalFees.map((l) => l.netAmount));
  const storedTotal = toMoneyNumber(p.total);
  const isAdhocInvoice = p.feePlanItemId === null;

  const computedTotal = isAdhocInvoice
    ? storedTotal
    : decimalSum([baseAmount, additionalFeesTotal]);
  const totalVerified = isAdhocInvoice
    ? decimalCompare(additionalFeesTotal, storedTotal) === 0 &&
      decimalCompare(baseAmount, storedTotal) === 0
    : decimalCompare(computedTotal, storedTotal) === 0;

  const student = formatStudentFeeInvoiceStudent(p.studentFeeInvoiceStudent);

  return {
    studentFeeInvoiceId: p.studentFeeInvoiceId,
    studentId: p.studentId,
    student,
    feePlanItemId: p.feePlanItemId,
    instituteId: p.instituteId,
    amount: baseAmount,
    additionalFeesTotal,
    total: computedTotal,
    storedTotal,
    totalVerified,
    createDate: p.createDate,
    dueDate: p.dueDate ?? null,
    status: p.status,
    ...paymentSummaryFromPlain(p),
    createdAt: p.createdAt ?? p.created_at ?? null,
    updatedAt: p.updatedAt ?? p.updated_at ?? null,
    feePlanItem: {
      feePlanItemId: item.feePlanItemId ?? p.feePlanItemId,
      feePlanProfileId: item.feePlanProfileId ?? null,
      termName: item.termName ?? null,
      amount: toMoneyNumber(item.amount ?? p.amount),
      createDate: item.createDate ?? null,
      dueDate: item.dueDate ?? null,
    },
    additionalFees,
  };
}

/** Minimal row for student invoice list / printable table. */
function formatStudentFeeInvoiceListRow(row) {
  const p = toPlain(row);
  if (!p) return null;

  const item = p.feePlanItem ?? {};
  const baseAmount = toMoneyNumber(p.amount);
  const additionalFees = (p.invoiceAdditionalFees ?? []).map(mapAdditionalFeeLine);
  const additionalFeesTotal = decimalSum(additionalFees.map((l) => l.netAmount));
  const total = decimalSum([baseAmount, additionalFeesTotal]);

  return {
    studentFeeInvoiceId: p.studentFeeInvoiceId,
    termName: item.termName ?? null,
    createDate: p.createDate,
    dueDate: p.dueDate ?? null,
    amount: baseAmount,
    additionalFeesTotal,
    total,
    status: p.status,
    ...paymentSummaryFromPlain(p),
    additionalFees: additionalFees.map((l) => ({
      name: l.name,
      amount: l.netAmount,
    })),
  };
}

export async function generateStudentFeeInvoice({ studentId, feePlanItemId }, instituteId) {
  const studentFeeInvoiceId = await sequelize.transaction(async (transaction) => {
    const feePlanItem = await repo.findFeePlanItemById(feePlanItemId, instituteId, { transaction });
    if (!feePlanItem) throw new Error("Fee plan item not found");

    const student = await repo.findStudentById(studentId, instituteId, { transaction });
    if (!student) throw new Error("Student not found");

    const studentPlain = toPlain(student);
    const feePlanItemPlain = toPlain(feePlanItem);
    const studentProfileId = studentPlain.feePlanProfileId;
    if (!studentProfileId) {
      throw new Error("Student has no fee plan profile assigned");
    }

    if (feePlanItemPlain.feePlanProfileId !== studentProfileId) {
      throw new Error("Fee plan item does not belong to the student's fee plan profile");
    }

    const existing = await repo.findStudentFeeInvoiceByStudentAndItem(
      studentId,
      feePlanItemId,
      instituteId,
      { transaction }
    );
    if (existing) {
      throw new Error("Invoice already exists for this student and fee plan item");
    }

    const additionalFees = await repo.findAdditionalFeesByFeePlanItemId(feePlanItemId, instituteId, {
      transaction,
    });

    const baseAmount = toMoneyNumber(feePlanItem.amount);
    const additionalAmounts = additionalFees.map((af) => toMoneyNumber(af.amount));
    const total = decimalSum([baseAmount, ...additionalAmounts]);

    const invoice = await repo.createStudentFeeInvoice(
      {
        studentId,
        feePlanItemId,
        instituteId,
        amount: baseAmount,
        total,
        createDate: feePlanItem.createDate,
        dueDate: feePlanItem.dueDate,
        status: "generated",
        paymentStatus: "unpaid",
      },
      { transaction }
    );

    if (additionalFees.length > 0) {
      await repo.bulkCreateStudentInvoiceAdditionalFees(
        additionalFees.map((af) => ({
          studentFeeInvoiceId: invoice.studentFeeInvoiceId,
          additionalFeeId: af.additionalFeeId,
          amount: toMoneyNumber(af.amount),
          waiver: null,
        })),
        { transaction }
      );
    }

    return invoice.studentFeeInvoiceId;
  });

  const full = await repo.findStudentFeeInvoiceById(studentFeeInvoiceId, instituteId);
  return formatStudentFeeInvoiceResponse(full);
}

/**
 * Adhoc invoice from fee type catalog lines (misconduct, fine, etc.).
 * One additional_fee per fee line; invoice total = sum of (amount - waiver) per line.
 * fee_plan_item_id NULL on student_fee_invoice and additional_fee.
 */
export async function generateStudentFeeInvoiceFromAdditionalFees(
  { studentId, feeTypeCatalogs, total, createDate, dueDate },
  instituteId
) {
  const feeLines = feeTypeCatalogs.map((line) => ({
    feeTypeCatalogId: line.feeTypeCatalogId,
    amount: toMoneyNumber(line.amount),
    waiver:
      line.waiver === undefined || line.waiver === null ? null : toMoneyNumber(line.waiver),
  }));
  const linesNetTotal = decimalSum(
    feeLines.map((line) => netLineAmount(line.amount, line.waiver))
  );

  if (total !== undefined && decimalCompare(linesNetTotal, toMoneyNumber(total)) !== 0) {
    throw new Error("total must equal sum of feeTypeCatalogs amounts after waivers");
  }

  const invoiceTotal = linesNetTotal;
  const catalogIds = [...new Set(feeLines.map((line) => line.feeTypeCatalogId))];

  const studentFeeInvoiceId = await sequelize.transaction(async (transaction) => {
    const student = await repo.findStudentById(studentId, instituteId, { transaction });
    if (!student) throw new Error("Student not found");

    const catalogs = await feeTypeCatalogRepo.findFeeTypeCatalogsByIds(
      catalogIds,
      instituteId,
      { transaction }
    );
    if (catalogs.length !== catalogIds.length) {
      throw new Error("One or more fee type catalog entries not found");
    }

    const additionalFeeRows = await repo.bulkCreateAdditionalFees(
      feeLines.map((line) => ({
        amount: line.amount,
        feeTypeCatalogId: line.feeTypeCatalogId,
        feePlanItemId: null,
        instituteId,
      })),
      { transaction }
    );

    const invoice = await repo.createStudentFeeInvoice(
      {
        studentId,
        feePlanItemId: null,
        instituteId,
        amount: invoiceTotal,
        total: invoiceTotal,
        createDate,
        dueDate: dueDate ?? null,
        status: "generated",
        paymentStatus: "unpaid",
      },
      { transaction }
    );

    await repo.bulkCreateStudentInvoiceAdditionalFees(
      additionalFeeRows.map((af, index) => ({
        studentFeeInvoiceId: invoice.studentFeeInvoiceId,
        additionalFeeId: af.additionalFeeId,
        amount: feeLines[index].amount,
        waiver: feeLines[index].waiver,
      })),
      { transaction }
    );

    return invoice.studentFeeInvoiceId;
  });

  return {
    studentFeeInvoiceId,
    studentId,
    total: invoiceTotal,
    createDate,
    dueDate: dueDate ?? null,
    paymentStatus: "unpaid",
  };
}

export async function getStudentFeeInvoiceById(studentFeeInvoiceId, instituteId) {
  const row = await repo.findStudentFeeInvoiceById(studentFeeInvoiceId, instituteId);
  if (!row) throw new Error("Student fee invoice not found");
  return formatStudentFeeInvoiceResponse(row);
}

export async function listStudentFeeInvoicesByStudentId(studentId, instituteId) {
  const student = await repo.findStudentById(studentId, instituteId, {
    attributes: ["studentId", "firstName", "middleName", "lastName", "scholarNumber"],
  });
  if (!student) throw new Error("Student not found");

  const rows = await repo.findStudentFeeInvoicesByStudentId(studentId, instituteId);
  return {
    student: formatStudentFeeInvoiceListStudent(student),
    invoices: rows.map((r) => formatStudentFeeInvoiceListRow(r)),
  };
}

function formatStudentDisplayName(student) {
  if (!student) return "";
  return [student.firstName, student.middleName, student.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function resolvePaymentStatusesFilter(paymentTab) {
  if (paymentTab === "pending") return ["unpaid", "partial"];
  if (paymentTab === "completed") return ["paid"];
  return null;
}

/** Fees Invoice table: all institute invoices (no student/fee-plan filter). */
function formatFeesInvoiceTableRow(row) {
  const p = toPlain(row);
  const student = p.studentFeeInvoiceStudent ?? {};
  const item = p.feePlanItem ?? {};
  const payment = paymentSummaryFromPlain(p);

  return {
    studentFeeInvoiceId: p.studentFeeInvoiceId,
    invoiceNo: p.studentFeeInvoiceId,
    studentId: p.studentId,
    studentName: formatStudentDisplayName(student) || null,
    scholarNumber: student.scholarNumber ?? null,
    amount: toMoneyNumber(p.total),
    paid: payment.totalPaid,
    deposits: null,
    balanceDue: payment.balanceDue,
    status: (p.paymentStatus ?? "unpaid").toUpperCase(),
    paymentStatus: p.paymentStatus ?? "unpaid",
    termName: item.termName ?? null,
    createDate: p.createDate,
    dueDate: p.dueDate ?? null,
  };
}

export async function listAllStudentFeeInvoices(instituteId, status = "all") {
  const paymentStatuses = resolvePaymentStatusesFilter(status);
  const rows = await repo.findAllStudentFeeInvoicesByInstitute(instituteId, {
    paymentStatuses,
  });
  return {
    status,
    invoices: rows.map((row) => formatFeesInvoiceTableRow(row)),
  };
}
