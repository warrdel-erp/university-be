import sequelize from "../database/sequelizeConfig.js";
import * as repo from "../repository/studentFeeInvoiceRepository.js";
import * as feePlanProfileRepo from "../repository/feePlanProfileRepository.js";
import * as feeTypeCatalogRepo from "../repository/feeTypeCatalogRepository.js";
import {
  decimalCompare,
  decimalSubtract,
  decimalSum,
  toMoneyNumber,
} from "../utility/decimalMoney.js";
import { FEE_PLAN_PUBLISH_STATUS } from "../constant.js";

function netInvoiceItemAmount(amount, waiver) {
  const lineAmount = toMoneyNumber(amount);
  if (waiver === undefined || waiver === null) return lineAmount;
  return decimalSubtract(lineAmount, toMoneyNumber(waiver));
}

function getMainInvoiceItem(items) {
  return (items ?? []).find((line) => line.isMainItem);
}

function getMainInvoiceItemNetAmount(items) {
  const main = getMainInvoiceItem(items);
  if (!main) return 0;
  return netInvoiceItemAmount(main.amount, main.waiver);
}

function getSupplementalInvoiceItems(items) {
  return (items ?? []).filter((line) => !line.isMainItem);
}

function paymentSummaryFromPlain(p, invoiceTotal) {
  const totalPaid = toMoneyNumber(p.paidAmount ?? 0);
  const total = invoiceTotal ?? toMoneyNumber(p.total);
  return {
    paymentStatus: p.paymentStatus ?? "unpaid",
    totalPaid,
    paidAmount: totalPaid,
    balanceDue: decimalSubtract(total, totalPaid),
  };
}

function toPlain(row) {
  if (!row) return null;
  return typeof row.get === "function" ? row.get({ plain: true }) : row;
}

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function assertStudentFeePlanProfilePublished(feePlanProfileId, transaction) {
  const profile = await feePlanProfileRepo.findFeePlanProfileByIdForInstitute(
    feePlanProfileId,
    { transaction }
  );
  if (!profile) {
    throw httpError("Fee plan profile not found for this institute", 404);
  }
  const plain = toPlain(profile);
  if (plain.publishStatus !== FEE_PLAN_PUBLISH_STATUS.PUBLISHED) {
    throw httpError(
      "Invoices can only be generated for students assigned to a published fee plan",
      400
    );
  }
}

function invoiceItemsPlain(p) {
  return (p.feeInvoiceItems || []).map((row) => {
    const line = typeof row.get === "function" ? row.get({ plain: true }) : row;
    const catalog = line.feeTypeCatalog || {};
    return {
      studentFeeInvoiceItemsId: line.studentFeeInvoiceItemsId,
      feeTypeId: line.feeTypeId,
      isMainItem: line.isMainItem,
      name: catalog.name,
      description: catalog.description,
      ledgerType: catalog.ledgerType,
      amount: toMoneyNumber(line.amount),
      waiver: line.waiver != null ? toMoneyNumber(line.waiver) : line.waiver,
      netAmount: netInvoiceItemAmount(line.amount, line.waiver),
    };
  });
}

function invoiceTotalFromItems(feeInvoiceItems) {
  return decimalSum((feeInvoiceItems ?? []).map((line) => line.netAmount));
}

function splitInvoiceAmounts(p) {
  const feeInvoiceItems = invoiceItemsPlain(p);
  const supplementalFees = getSupplementalInvoiceItems(feeInvoiceItems);
  return {
    isAdhocInvoice: p.feePlanItemId === null,
    baseAmount: getMainInvoiceItemNetAmount(feeInvoiceItems),
    feeInvoiceItems,
    supplementalFees,
    supplementalFeesTotal: decimalSum(supplementalFees.map((l) => l.netAmount)),
    total: invoiceTotalFromItems(feeInvoiceItems),
  };
}

function formatStudentDisplayName(student) {
  return [student.firstName, student.middleName, student.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function formatStudentFeeInvoiceListStudent(student) {
  const s = toPlain(student);
  return {
    studentId: s.studentId,
    studentName: formatStudentDisplayName(s),
    scholarNumber: s.scholarNumber,
  };
}

function buildFeePlanCascade(feePlanItem) {
  if (!feePlanItem) return null;

  const { feePlanProfile, feePlanSubItems, ...item } = feePlanItem;
  if (!feePlanProfile) {
    return {
      feePlanItem: {
        ...item,
        feePlanSubItems,
      },
    };
  }

  const { courseSessionMapping, ...profile } = feePlanProfile;

  return {
    ...profile,
    courseSessionMapping,
    feePlanItem: {
      ...item,
      feePlanSubItems,
    },
  };
}

function buildInvoiceCascade(invoice, split, payment) {
  return {
    studentFeeInvoiceId: invoice.studentFeeInvoiceId,
    createDate: invoice.createDate,
    dueDate: invoice.dueDate,
    total: invoice.total,
    status: invoice.status,
    paymentStatus: payment.paymentStatus,
    paidAmount: invoice.paidAmount,
    studentId: invoice.studentId,
    feePlanItemId: invoice.feePlanItemId,
    instituteId: invoice.instituteId,
    created_at: invoice.created_at,
    updated_at: invoice.updated_at,
    amounts: {
      termFee: split.isAdhocInvoice ? null : split.baseAmount,
      supplementalFees: split.supplementalFeesTotal,
      invoiceTotal: split.total,
      paid: payment.paidAmount,
      balanceDue: payment.balanceDue,
    },
    feeInvoiceItems: split.feeInvoiceItems,
  };
}

export function formatStudentFeeInvoiceResponse(row) {
  const p = toPlain(row);
  const {
    studentFeeInvoiceStudent,
    instituteStudentFeeInvoice,
    feePlanItem,
    feeInvoiceItems: _feeInvoiceItems,
    ...invoice
  } = p;

  const split = splitInvoiceAmounts(p);
  const payment = paymentSummaryFromPlain(p, split.total);

  return {
    student: studentFeeInvoiceStudent,
    institute: instituteStudentFeeInvoice,
    feePlan: buildFeePlanCascade(feePlanItem),
    invoice: buildInvoiceCascade(invoice, split, payment),
  };
}

function formatStudentFeeInvoiceListRow(row) {
  const p = toPlain(row);
  if (!p) return null;

  const split = splitInvoiceAmounts(p);

  return {
    studentFeeInvoiceId: p.studentFeeInvoiceId,
    createDate: p.createDate,
    dueDate: p.dueDate ?? null,
    amount: split.isAdhocInvoice ? 0 : split.baseAmount,
    supplementalFeesTotal: split.supplementalFeesTotal,
    total: split.total,
    status: p.status,
    ...paymentSummaryFromPlain(p, split.total),
    supplementalFees: split.supplementalFees.map((l) => ({
      name: l.name,
      amount: l.netAmount,
    })),
    feeInvoiceItems: split.feeInvoiceItems,
  };
}

export async function generateStudentFeeInvoice({ studentId, feePlanItemId }) {
  const studentFeeInvoiceId = await sequelize.transaction(async (transaction) => {
    const feePlanItem = toPlain(
      await repo.findFeePlanItemById(feePlanItemId, { transaction })
    );
    if (!feePlanItem) throw httpError("Fee plan item not found", 404);

    const student = toPlain(await repo.findStudentById(studentId, { transaction }));
    if (!student) throw httpError("Student not found", 404);
    if (!student.feePlanProfileId) {
      throw httpError("Student has no fee plan profile assigned", 400);
    }

    await assertStudentFeePlanProfilePublished(student.feePlanProfileId, transaction);

    if (feePlanItem.feePlanProfileId !== student.feePlanProfileId) {
      throw httpError("Fee plan item does not belong to the student's fee plan profile", 400);
    }
    if (
      await repo.findStudentFeeInvoiceByStudentAndItem(studentId, feePlanItemId, { transaction })
    ) {
      throw httpError("Invoice already exists for this student and fee plan item", 409);
    }

    const planFeesPlain = (
      await repo.findFeePlanSubItemsByFeePlanItemId(feePlanItemId, { transaction })
    ).map(toPlain);

    const invoice = await repo.createStudentFeeInvoice(
      {
        studentId,
        feePlanItemId,
        total: decimalSum(planFeesPlain.map((line) => toMoneyNumber(line.amount))),
        createDate: feePlanItem.createDate,
        dueDate: feePlanItem.dueDate ?? null,
        status: "generated",
        paymentStatus: "unpaid",
      },
      { transaction }
    );

    await repo.bulkCreateStudentFeeInvoiceItems(
      planFeesPlain.map((line) => ({
        studentFeeInvoiceId: invoice.studentFeeInvoiceId,
        feeTypeId: line.feeTypeId,
        amount: toMoneyNumber(line.amount),
        waiver: null,
        isMainItem: line.isMainSubItem,
      })),
      { transaction }
    );

    return invoice.studentFeeInvoiceId;
  });

  return formatStudentFeeInvoiceResponse(
    await repo.findStudentFeeInvoiceById(studentFeeInvoiceId)
  );
}

export async function generateAdhocStudentFeeInvoice({
  studentId,
  feeTypeCatalogs,
  total,
  createDate,
  dueDate,
}) {
  const feeLines = feeTypeCatalogs.map((line) => ({
    feeTypeId: line.feeTypeCatalogId,
    amount: toMoneyNumber(line.amount),
    waiver: line.waiver == null ? null : toMoneyNumber(line.waiver),
  }));
  const invoiceTotal = decimalSum(
    feeLines.map((line) => netInvoiceItemAmount(line.amount, line.waiver))
  );

  if (total !== undefined && decimalCompare(invoiceTotal, toMoneyNumber(total)) !== 0) {
    throw httpError("total must equal sum of feeTypeCatalogs amounts after waivers", 400);
  }

  const studentFeeInvoiceId = await sequelize.transaction(async (transaction) => {
    if (!(await repo.findStudentById(studentId, { transaction }))) {
      throw httpError("Student not found", 404);
    }

    const catalogIds = [...new Set(feeLines.map((line) => line.feeTypeId))];
    if (
      (
        await feeTypeCatalogRepo.findFeeTypeCatalogsByIds(catalogIds, {
          transaction,
        })
      ).length !== catalogIds.length
    ) {
      throw httpError("One or more fee type catalog entries not found", 404);
    }

    const invoice = await repo.createStudentFeeInvoice(
      {
        studentId,
        feePlanItemId: null,
        total: invoiceTotal,
        createDate,
        dueDate: dueDate ?? null,
        status: "generated",
        paymentStatus: "unpaid",
      },
      { transaction }
    );

    await repo.bulkCreateStudentFeeInvoiceItems(
      feeLines.map((line) => ({
        studentFeeInvoiceId: invoice.studentFeeInvoiceId,
        feeTypeId: line.feeTypeId,
        amount: line.amount,
        waiver: line.waiver,
        isMainItem: false,
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

export async function getStudentFeeInvoiceById(studentFeeInvoiceId) {
  const row = await repo.findStudentFeeInvoiceById(studentFeeInvoiceId);
  if (!row) throw httpError("Student fee invoice not found", 404);
  return formatStudentFeeInvoiceResponse(row);
}

export async function listStudentFeeInvoicesByStudentId(studentId) {
  const student = await repo.findStudentById(studentId, {
    attributes: ["studentId", "firstName", "middleName", "lastName", "scholarNumber"],
  });
  if (!student) throw httpError("Student not found", 404);

  return {
    student: formatStudentFeeInvoiceListStudent(student),
    invoices: (await repo.findStudentFeeInvoicesByStudentId(studentId)).map(
      formatStudentFeeInvoiceListRow
    ),
  };
}

function formatFeesInvoiceTableRow(row) {
  const p = toPlain(row);
  const payment = paymentSummaryFromPlain(p);
  const student = p.studentFeeInvoiceStudent || {};

  return {
    studentFeeInvoiceId: p.studentFeeInvoiceId,
    invoiceNo: p.studentFeeInvoiceId,
    studentId: p.studentId,
    studentName: formatStudentDisplayName(student),
    scholarNumber: student.scholarNumber,
    amount: toMoneyNumber(p.total),
    paid: payment.totalPaid,
    deposits: null,
    balanceDue: payment.balanceDue,
    status: p.paymentStatus.toUpperCase(),
    paymentStatus: p.paymentStatus,
    createDate: p.createDate,
    dueDate: p.dueDate,
  };
}

export async function listAllStudentFeeInvoices(status = "all", { page, limit, search } = {}) {
  const result = await repo.findAllStudentFeeInvoicesByInstitute({
    page,
    limit,
    search,
    paymentStatuses:
      status === "pending"
        ? ["unpaid", "partial"]
        : status === "completed"
          ? ["paid"]
          : null,
  });

  return {
    status,
    invoices: (result.rows || []).map((row) => formatFeesInvoiceTableRow(row)),
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: Math.ceil((result.total || 0) / (result.limit || 1)),
    },
  };
}
