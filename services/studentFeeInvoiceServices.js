import sequelize from "../database/sequelizeConfig.js";
import * as repo from "../repository/studentFeeInvoiceRepository.js";
import {
  decimalCompare,
  decimalSubtract,
  decimalSum,
  toMoneyNumber,
} from "../utility/decimalMoney.js";

function toPlain(row) {
  if (!row) return null;
  return typeof row.get === "function" ? row.get({ plain: true }) : row;
}

function mapAdditionalFeeLine(line) {
  const catalog = line.additionalFee?.feeTypeCatalog ?? {};
  const amount = toMoneyNumber(line.amount);
  const waiver = line.waiver != null ? toMoneyNumber(line.waiver) : null;
  const netAmount = waiver != null ? decimalSubtract(amount, waiver) : amount;

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
  const computedTotal = decimalSum([baseAmount, additionalFeesTotal]);
  const storedTotal = toMoneyNumber(p.total);
  const totalVerified = decimalCompare(computedTotal, storedTotal) === 0;

  return {
    studentFeeInvoiceId: p.studentFeeInvoiceId,
    studentId: p.studentId,
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
    additionalFees: additionalFees.map((l) => ({
      name: l.name,
      amount: l.netAmount,
    })),
  };
}

export async function generateStudentFeeInvoice({ studentId, feePlanItemId }, instituteId) {
  const studentFeeInvoiceId = await sequelize.transaction(async (transaction) => {
    const feePlanItem = await repo.findFeePlanItemById(feePlanItemId, instituteId, { transaction });
    if (!feePlanItem) {
      const err = new Error("Fee plan item not found");
      err.statusCode = 404;
      throw err;
    }

    const student = await repo.findStudentById(studentId, instituteId, { transaction });
    if (!student) {
      const err = new Error("Student not found");
      err.statusCode = 404;
      throw err;
    }

    const existing = await repo.findStudentFeeInvoiceByStudentAndItem(
      studentId,
      feePlanItemId,
      instituteId,
      { transaction }
    );
    if (existing) {
      const err = new Error("Invoice already exists for this student and fee plan item");
      err.statusCode = 409;
      throw err;
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

export async function getStudentFeeInvoiceById(studentFeeInvoiceId, instituteId) {
  const row = await repo.findStudentFeeInvoiceById(studentFeeInvoiceId, instituteId);
  if (!row) {
    const err = new Error("Student fee invoice not found");
    err.statusCode = 404;
    throw err;
  }
  return formatStudentFeeInvoiceResponse(row);
}

export async function listStudentFeeInvoicesByStudentId(studentId, instituteId) {
  const student = await repo.findStudentById(studentId, instituteId);
  if (!student) {
    const err = new Error("Student not found");
    err.statusCode = 404;
    throw err;
  }
  const rows = await repo.findStudentFeeInvoicesByStudentId(studentId, instituteId);
  return rows.map((r) => formatStudentFeeInvoiceListRow(r));
}
