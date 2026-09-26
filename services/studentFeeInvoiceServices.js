import sequelize from "../database/sequelizeConfig.js";
import * as repo from "../repository/studentFeeInvoiceRepository.js";
import * as feePlanRepo from "../repository/feePlanItemRepository.js";
import * as feeTypeCatalogRepo from "../repository/feeTypeCatalogRepository.js";
import * as acedmicYearRepo from "../repository/acedmicYearRepository.js";
import { resolveActiveAcademicYearContext } from "../utility/curriculumSubjectsByActiveYear.js";
import { normalizeTermType, resolveTotalTerms, termsForYear } from "../utility/courseTerms.js";
import {
  decimalAdd,
  decimalCompare,
  decimalMultiply,
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

  const { feePlanSubItems, ...item } = feePlanItem;
  return {
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

export async function generateStudentFeeInvoice({ studentId, studentIds, batchId, feePlanItemId }) {
  return await sequelize.transaction(async (transaction) => {
    const feePlanItem = toPlain(
      await repo.findFeePlanItemById(feePlanItemId, { transaction })
    );
    if (!feePlanItem) throw httpError("Fee plan item not found", 404);

    if (feePlanItem.batchId == null) {
      throw httpError("Fee plan item is not linked to a batch", 400);
    }
    if (feePlanItem.publishStatus !== FEE_PLAN_PUBLISH_STATUS.PUBLISHED) {
      throw httpError("Invoices can only be generated for a published fee plan year", 400);
    }

    const itemBatchId = Number(feePlanItem.batchId);

    let targetStudents = [];
    const isSingleStudentMode = studentId != null && !studentIds?.length && !batchId;

    if (studentId != null) {
      const student = toPlain(
        await repo.findStudentById(studentId, {
          attributes: ["studentId", "instituteId", "batchId"],
          transaction,
        })
      );
      if (!student) throw httpError("Student not found", 404);
      if (Number(student.batchId) !== itemBatchId) {
        throw httpError("Student does not belong to this fee plan batch", 400);
      }
      targetStudents = [student];
    } else if (Array.isArray(studentIds) && studentIds.length > 0) {
      const uniqueIds = Array.from(new Set(studentIds.map(Number)));
      const students = (await repo.findStudentsByIds(uniqueIds, { transaction })).map(toPlain);
      const invalidBatch = students.find((s) => Number(s.batchId) !== itemBatchId);
      if (invalidBatch) {
        throw httpError(`Student (ID: ${invalidBatch.studentId}) does not belong to fee plan batch ${itemBatchId}`, 400);
      }
      targetStudents = students;
    } else {
      const reqBatchId = batchId != null ? Number(batchId) : itemBatchId;
      if (reqBatchId !== itemBatchId) {
        throw httpError(`batchId ${reqBatchId} does not match fee plan item batchId ${itemBatchId}`, 400);
      }
      targetStudents = (await repo.findStudentsByBatchId(itemBatchId, { transaction })).map(toPlain);
    }

    if (!targetStudents.length) {
      throw httpError("No eligible students found for invoice generation", 400);
    }

    const targetStudentIds = targetStudents.map((s) => Number(s.studentId));
    const existingStudentIdsSet = await repo.findExistingInvoiceStudentIdsByItem(
      feePlanItemId,
      targetStudentIds,
      { transaction }
    );

    if (isSingleStudentMode && existingStudentIdsSet.has(Number(studentId))) {
      throw httpError("Invoice already exists for this student and fee plan item", 409);
    }

    const eligibleStudents = targetStudents.filter(
      (s) => !existingStudentIdsSet.has(Number(s.studentId))
    );

    if (!eligibleStudents.length) {
      if (isSingleStudentMode) {
        throw httpError("Invoice already exists for this student and fee plan item", 409);
      }
      return {
        feePlanItemId: Number(feePlanItemId),
        batchId: itemBatchId,
        totalStudentsCount: targetStudents.length,
        generatedInvoicesCount: 0,
        skippedInvoicesCount: targetStudents.length,
        createdInvoiceIds: [],
        message: "All students already have invoices generated for this fee plan item",
      };
    }

    const planFeesPlain = (
      await repo.findFeePlanSubItemsByFeePlanItemId(feePlanItemId, { transaction })
    ).map(toPlain);

    const invoiceTotal = decimalSum(planFeesPlain.map((line) => toMoneyNumber(line.amount)));

    const createdInvoiceIds = [];
    for (const student of eligibleStudents) {
      const invoice = await repo.createStudentFeeInvoice(
        {
          studentId: student.studentId,
          feePlanItemId: Number(feePlanItemId),
          total: invoiceTotal,
          createDate: feePlanItem.createDate,
          dueDate: feePlanItem.dueDate ?? null,
          status: "generated",
          paymentStatus: "unpaid",
          paidAmount: 0,
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

      createdInvoiceIds.push(invoice.studentFeeInvoiceId);
    }

    if (isSingleStudentMode && createdInvoiceIds.length === 1) {
      return await repo.findStudentFeeInvoiceById(createdInvoiceIds[0], { transaction }).then(formatStudentFeeInvoiceResponse);
    }

    return {
      feePlanItemId: Number(feePlanItemId),
      batchId: itemBatchId,
      totalStudentsCount: targetStudents.length,
      generatedInvoicesCount: createdInvoiceIds.length,
      skippedInvoicesCount: targetStudents.length - createdInvoiceIds.length,
      createdInvoiceIds,
    };
  });
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

export async function listAllStudentFeeInvoices({
  feePlanItemId,
  status = "all",
  page = 1,
  limit = 10,
} = {}) {
  let feePlanItem = null;
  let studentCount = 0;
  let invoicesCount = 0;

  if (feePlanItemId != null) {
    const itemRow = await feePlanRepo.findFeePlanItemById(feePlanItemId, {
      withSubItems: true,
    });
    if (itemRow) {
      const plainItem = itemRow.get({ plain: true });
      const [studentCountMap, raisedCount] = await Promise.all([
        feePlanRepo.countStudentsByBatchIds([plainItem.batchId]),
        feePlanRepo.countRaisedInvoicesForFeePlanItemIds([Number(feePlanItemId)]),
      ]);
      studentCount = studentCountMap.get(Number(plainItem.batchId)) || 0;
      invoicesCount = raisedCount;
      feePlanItem = {
        feePlanItemId: plainItem.feePlanItemId,
        name: plainItem.name || plainItem.academicPeriod || "Fee Receipt",
        academicPeriod: plainItem.academicPeriod,
        year: plainItem.year,
        createDate: plainItem.createDate,
        dueDate: plainItem.dueDate,
        publishStatus: plainItem.publishStatus,
        amount: sumSubItemsAmount(plainItem.feePlanSubItems),
      };
    }
  }

  const queryResult = await repo.findStudentFeeInvoicesOverview({
    feePlanItemId,
    status,
    page,
    limit,
  });

  if (feePlanItemId == null) {
    invoicesCount = queryResult.totalRecords;
  }

  const invoices = queryResult.rows.map((row) => {
    const p = toPlain(row);
    const payment = paymentSummaryFromPlain(p);
    const student = p.studentFeeInvoiceStudent || {};
    const fullName = [student.firstName, student.middleName, student.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    return {
      studentFeeInvoiceId: p.studentFeeInvoiceId,
      invoiceNo: p.studentFeeInvoiceId,
      invoiceNumber: p.studentFeeInvoiceId,
      studentId: p.studentId,
      studentName: fullName || formatStudentDisplayName(student),
      scholarNumber: student.scholarNumber || null,
      enrollNumber: student.enrollNumber || null,
      amount: toMoneyNumber(p.total),
      total: toMoneyNumber(p.total),
      paid: payment.totalPaid,
      paidAmount: payment.totalPaid,
      balanceDue: payment.balanceDue,
      status: p.paymentStatus ? p.paymentStatus.toUpperCase() : "UNPAID",
      paymentStatus: p.paymentStatus || "unpaid",
      createDate: p.createDate,
      dueDate: p.dueDate,
    };
  });

  return {
    feePlanItemId: feePlanItem
      ? feePlanItem.feePlanItemId
      : feePlanItemId
        ? Number(feePlanItemId)
        : null,
    feePlanItemName: feePlanItem ? feePlanItem.name : null,
    feePlanItem,
    studentCount,
    invoicesCount,
    pendingInvoicesCount: Math.max(0, studentCount - invoicesCount),
    status,
    pagination: {
      totalRecords: queryResult.totalRecords,
      totalPages: queryResult.totalPages,
      currentPage: queryResult.currentPage,
      pageSize: queryResult.pageSize,
    },
    invoices,
  };
}

function sumSubItemsAmount(subItems) {
  let total = 0;
  for (const sub of subItems || []) {
    total = decimalAdd(total, toMoneyNumber(sub.amount));
  }
  return total;
}

function matchStatusFilter(batchStatus, filterStatus) {
  if (!filterStatus || filterStatus.toLowerCase() === "all") return true;
  const normFilter = filterStatus.toLowerCase().replace(/_/g, " ").trim();
  const normBatch = (batchStatus || "").toLowerCase().replace(/_/g, " ").trim();
  return normBatch === normFilter;
}

export async function getBillingBatchesOverview(filters = {}) {
  let academicCtx = null;
  if (filters.academicYearId) {
    const ay = await acedmicYearRepo.getSingleacedmicYearDetails(Number(filters.academicYearId));
    if (ay) {
      const plainAy = ay.get ? ay.get({ plain: true }) : ay;
      const activeBatchYear = Number(String(plainAy.startingDate).slice(0, 4)) || 2026;
      academicCtx = {
        academicYearId: plainAy.academicYearId,
        activeBatchYear,
        academicYear: plainAy,
      };
    }
  }

  const activeContext = academicCtx || (await resolveActiveAcademicYearContext());
  const activeCalendarYear = Number(activeContext.activeBatchYear);
  const plainAcademicYear = activeContext.academicYear?.get
    ? activeContext.academicYear.get({ plain: true })
    : activeContext.academicYear || {};

  const academicYearLabel = `${activeCalendarYear}-${String(activeCalendarYear + 1).slice(-2)}`;
  const academicYearTitle = plainAcademicYear.yearTitle || academicYearLabel;

  const batchRows = await feePlanRepo.findFeePlanBatchesOverview({ ...filters, withSubItems: true });
  const batchIds = batchRows.map((r) => Number(r.batchId));
  const studentCountMap = await feePlanRepo.countStudentsByBatchIds(batchIds);

  const feePlanItemIds = batchRows.flatMap((r) => (r.feePlanItems || []).map((item) => Number(item.feePlanItemId)));
  const raisedInvoiceCountMap = await feePlanRepo.countRaisedInvoicesByFeePlanItemIds(feePlanItemIds);

  const todayDateStr = new Date().toISOString().slice(0, 10);
  const searchKeyword = filters.search ? String(filters.search).trim().toLowerCase() : "";

  const summary = {
    totalBatches: 0,
    readyToRaise: 0,
    upcoming: 0,
    fullyBilled: 0,
    notConfigured: 0,
  };

  const groupMap = new Map();

  for (const row of batchRows) {
    const batchData = row.get ? row.get({ plain: true }) : row;
    const { session } = batchData;
    if (!session?.course) continue;
    const { course } = session;

    const batchYear = Number(batchData.batch);
    const courseDuration = Number(course.courseDuration) || 0;
    const totalTerms = resolveTotalTerms(course);
    const batchEndYear = batchYear + courseDuration;
    const admissionBatchLabel = `${batchYear}-${String(batchEndYear).slice(-2)}`;
    const batchAcademicYearsLabel = `${batchYear} - ${batchEndYear}`;

    const currentStudyYear = activeCalendarYear - batchYear + 1;
    const isYearWithinCourseDuration = currentStudyYear >= 1 && currentStudyYear <= courseDuration;

    const studentCount = studentCountMap.get(Number(batchData.batchId)) || 0;

    const currentYearFeeItems = (batchData.feePlanItems || [])
      .filter((item) => Number(item.year) === currentStudyYear)
      .sort((a, b) => (a.createDate || "").localeCompare(b.createDate || "") || a.feePlanItemId - b.feePlanItemId);

    const totalPlannedInvoices = currentYearFeeItems.length;

    const fullyRaisedItemsCount = currentYearFeeItems.filter((item) => {
      const raisedCount = raisedInvoiceCountMap.get(Number(item.feePlanItemId)) || 0;
      return studentCount > 0 ? raisedCount >= studentCount : raisedCount > 0;
    }).length;

    const pendingItemsCount = Math.max(0, totalPlannedInvoices - fullyRaisedItemsCount);

    const nextUnraisedFeeItem = currentYearFeeItems.find((item) => {
      const raisedCount = raisedInvoiceCountMap.get(Number(item.feePlanItemId)) || 0;
      return studentCount > 0 ? raisedCount < studentCount : raisedCount === 0;
    });

    let nextPlannedInvoice = null;
    let batchStatus = "Not Configured";

    if (nextUnraisedFeeItem) {
      const isReadyToRaise = !nextUnraisedFeeItem.createDate || nextUnraisedFeeItem.createDate <= todayDateStr;
      batchStatus = isReadyToRaise ? "Ready to Raise" : "Upcoming";
      nextPlannedInvoice = {
        feePlanItemId: nextUnraisedFeeItem.feePlanItemId,
        invoiceName: nextUnraisedFeeItem.name || nextUnraisedFeeItem.academicPeriod || "Fee Receipt",
        academicPeriod: nextUnraisedFeeItem.academicPeriod,
        createDate: nextUnraisedFeeItem.createDate,
        dueDate: nextUnraisedFeeItem.dueDate,
        status: batchStatus,
      };
    } else if (totalPlannedInvoices > 0) {
      batchStatus = "Fully Billed";
      nextPlannedInvoice = {
        feePlanItemId: null,
        invoiceName: "No remaining planned invoices",
        academicPeriod: null,
        createDate: null,
        dueDate: null,
        status: "Fully Billed",
      };
    } else {
      nextPlannedInvoice = {
        feePlanItemId: null,
        invoiceName: "No planned invoices",
        academicPeriod: null,
        createDate: null,
        dueDate: null,
        status: "Not Configured",
      };
    }

    if (searchKeyword) {
      const searchText = `${course.courseName} ${course.courseCode} ${session.sessionName} ${batchYear} ${admissionBatchLabel}`.toLowerCase();
      if (!searchText.includes(searchKeyword)) continue;
    }

    if (!matchStatusFilter(batchStatus, filters.status)) continue;

    summary.totalBatches += 1;
    if (batchStatus === "Ready to Raise") summary.readyToRaise += 1;
    else if (batchStatus === "Upcoming") summary.upcoming += 1;
    else if (batchStatus === "Fully Billed") summary.fullyBilled += 1;
    else summary.notConfigured += 1;

    const groupKey = `${course.courseId}_${session.sessionId}`;
    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, {
        courseId: course.courseId,
        courseName: course.courseName,
        courseCode: course.courseCode,
        courseDuration,
        totalTerms,
        termType: course.termType,
        sessionId: session.sessionId,
        sessionName: session.sessionName,
        batches: [],
      });
    }

    groupMap.get(groupKey).batches.push({
      batchId: Number(batchData.batchId),
      batchYear,
      batch: batchYear,
      admissionBatch: admissionBatchLabel,
      academicYears: batchAcademicYearsLabel,
      currentStudyYear: isYearWithinCourseDuration ? currentStudyYear : null,
      currentYear: isYearWithinCourseDuration ? currentStudyYear : null,
      status: batchStatus,
      studentCount,
      nextPlannedInvoice,
      nextBilling: nextPlannedInvoice,
      feePlanInvoicesSummary: {
        raisedInvoicesCount: fullyRaisedItemsCount,
        pendingInvoicesCount: pendingItemsCount,
        totalPlannedInvoices,
      },
    });
  }

  const groups = Array.from(groupMap.values()).map((group) => ({
    ...group,
    batchesCount: group.batches.length,
  }));

  return {
    academicYearId: activeContext.academicYearId,
    academicYearLabel,
    academicYear: academicYearLabel,
    academicYearTitle,
    yearTitle: academicYearTitle,
    activeCalendarYear,
    summary,
    groups,
  };
}
