import sequelize from "../database/sequelizeConfig.js";
import * as repo from "../repository/feePlanItemRepository.js";
import { resolveActiveAcademicYearContext } from "../utility/curriculumSubjectsByActiveYear.js";
import {
  buildTermName,
  resolveTotalTerms,
  termsForYear,
} from "../utility/courseTerms.js";
import {
  decimalAdd,
  decimalSubtract,
  decimalMultiply,
  decimalDivide,
  decimalSum,
  toIntegerNumber,
  toMoneyNumber,
} from "../utility/decimalMoney.js";
import { FEE_PLAN_PUBLISH_STATUS } from "../constant.js";
import { getTenantStore } from "../utility/requestContext.js";

function httpError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  throw err;
}

function resolveStatus(items) {
  if (!items.length) return "Setup Required";

  let published = 0;
  let draft = 0;
  for (const item of items) {
    if (item.publishStatus === FEE_PLAN_PUBLISH_STATUS.PUBLISHED) {
      published = decimalAdd(published, 1);
    } else {
      draft = decimalAdd(draft, 1);
    }
  }
  if (published && !draft) return "Published";
  if (published && draft) return "In Review";
  return "Draft";
}

function resolveYearConfigStatus(items) {
  if (!items.length) return "Not Started";

  let published = 0;
  let draft = 0;
  for (const item of items) {
    if (item.publishStatus === FEE_PLAN_PUBLISH_STATUS.PUBLISHED) {
      published = decimalAdd(published, 1);
    } else {
      draft = decimalAdd(draft, 1);
    }
  }
  if (published && !draft) return "Approved";
  if (published && draft) return "In Review";
  return "Draft";
}

function sumSubItemsAmount(subItems) {
  let total = 0;
  for (const sub of subItems || []) {
    total = decimalAdd(total, toMoneyNumber(sub.amount));
  }
  return total;
}

function sumItemsAmount(items) {
  let total = 0;
  for (const item of items) {
    total = decimalAdd(total, sumSubItemsAmount(item.feePlanSubItems));
  }
  return total;
}

function countComponents(items) {
  let count = 0;
  for (const item of items) {
    count = decimalAdd(count, (item.feePlanSubItems || []).length);
  }
  return count;
}

function buildCurrentTerms(course, yearNumber) {
  const terms = [];
  for (const term of termsForYear(yearNumber, course)) {
    terms.push({ term, termName: buildTermName(course.termType, term) });
  }
  return terms;
}

function academicPositionLabel(course, yearNumber) {
  const terms = buildCurrentTerms(course, yearNumber);
  if (!terms.length) return `Year ${yearNumber}`;
  if (terms.length === 1) return `${terms[0].termName}`;
  return `${terms[0].termName} – ${terms[terms.length - 1].termName}`;
}

function groupItemsByYear(items) {
  const byYear = new Map();
  for (const item of items) {
    const year = item.year != null ? Number(item.year) : 0;
    if (!byYear.has(year)) {
      byYear.set(year, []);
    }
    byYear.get(year).push(item);
  }
  return byYear;
}

function mapSubItem(sub) {
  return {
    feePlanSubitemId: sub.feePlanSubitemId,
    feeTypeId: sub.feeTypeId,
    name: sub.feeTypeCatalog ? sub.feeTypeCatalog.name : null,
    ledgerType: sub.feeTypeCatalog ? sub.feeTypeCatalog.ledgerType : null,
    refundable: sub.feeTypeCatalog ? sub.feeTypeCatalog.refundable : null,
    amount: toMoneyNumber(sub.amount),
    isMainSubItem: sub.isMainSubItem === true || sub.isMainSubItem === 1,
    createdAt: sub.createdAt,
    updatedAt: sub.updatedAt,
  };
}

function resolveBillingStatus({
  createDate,
  raisedCount,
  expectedStudents,
  publishStatus,
}) {
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  if (expectedStudents > 0 && raisedCount >= expectedStudents) {
    return "Done";
  }
  if (publishStatus !== FEE_PLAN_PUBLISH_STATUS.PUBLISHED) {
    return "Draft";
  }
  if (createDate && createDate > today) {
    return "Upcoming";
  }
  if (createDate && createDate < today) {
    return "Due";
  }
  return "Ready to Raise";
}

async function assertFeeTypeCatalogsExist(feeTypeCatalogIds, transaction) {
  const rows = await repo.findFeeTypeCatalogsByIds(feeTypeCatalogIds, {
    transaction,
  });
  if (rows.length !== feeTypeCatalogIds.length) {
    httpError("One or more feeTypeCatalogId values were not found", 400);
  }
}

async function loadFeePlanItemDetail(feePlanItemId, transaction) {
  const row = await repo.findFeePlanItemById(feePlanItemId, {
    withSubItems: true,
    transaction,
  });
  if (!row) {
    httpError(`Fee plan item (ID: ${feePlanItemId}) not found`, 404);
  }
  const plain = row.get({ plain: true });
  const feePlanSubItems = [];
  for (const sub of plain.feePlanSubItems || []) {
    feePlanSubItems.push(mapSubItem(sub));
  }
  return {
    feePlanItemId: plain.feePlanItemId,
    batchId: plain.batchId,
    year: plain.year,
    name: plain.name,
    academicPeriod: plain.academicPeriod,
    createDate: plain.createDate,
    dueDate: plain.dueDate,
    publishStatus: plain.publishStatus,
    publishedAt: plain.publishedAt,
    publishedBy: plain.publishedBy,
    amount: sumSubItemsAmount(plain.feePlanSubItems),
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
    feePlanSubItems,
  };
}

export async function getFeePlanBatches(filters = {}) {
  const [batchRows, academicCtx] = await Promise.all([
    repo.findFeePlanBatchesOverview(filters),
    resolveActiveAcademicYearContext(),
  ]);

  const activeCalendarYear = Number(academicCtx.activeBatchYear);
  const academicYearPlain = academicCtx.academicYear.get
    ? academicCtx.academicYear.get({ plain: true })
    : academicCtx.academicYear;

  const batchIds = [];
  for (const row of batchRows) {
    batchIds.push(Number(row.batchId));
  }
  const studentCountMap = await repo.countStudentsByBatchIds(batchIds);

  const search = filters.search
    ? String(filters.search).trim().toLowerCase()
    : "";
  const statusFilter = filters.status;
  const summary = {
    totalBatches: 0,
    published: 0,
    inReview: 0,
    draft: 0,
    setupRequired: 0,
  };
  const groupMap = new Map();

  for (const row of batchRows) {
    const plain = row.get({ plain: true });
    const session = plain.session;
    const course = session.course;
    const batchYear = Number(plain.batch);
    const duration = Number(course.courseDuration) || 0;
    const currentYear = decimalAdd(decimalSubtract(activeCalendarYear, batchYear), 1);
    const endYear = decimalAdd(batchYear, duration);
    const items = plain.feePlanItems || [];

    if (search) {
      const text =
        `${course.courseName} ${course.courseCode} ${session.sessionName} ${batchYear}`.toLowerCase();
      if (!text.includes(search)) continue;
    }

    const status = resolveStatus(items);
    if (statusFilter && status !== statusFilter) continue;

    const inRange = currentYear >= 1 && currentYear <= duration;
    const currentTerms = inRange ? buildCurrentTerms(course, currentYear) : [];
    let currentPositionLabel = null;
    if (inRange && currentTerms.length) {
      currentPositionLabel = `${academicPositionLabel(course, currentYear)} · Year ${currentYear}`;
    } else if (inRange) {
      currentPositionLabel = `Year ${currentYear}`;
    }

    summary.totalBatches = decimalAdd(summary.totalBatches, 1);
    if (status === "Published") summary.published = decimalAdd(summary.published, 1);
    else if (status === "In Review") summary.inReview = decimalAdd(summary.inReview, 1);
    else if (status === "Draft") summary.draft = decimalAdd(summary.draft, 1);
    else summary.setupRequired = decimalAdd(summary.setupRequired, 1);

    const groupKey = `${course.courseId}_${session.sessionId}`;
    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, {
        courseId: course.courseId,
        courseName: course.courseName,
        courseCode: course.courseCode,
        sessionId: session.sessionId,
        sessionName: session.sessionName,
        batches: [],
      });
    }

    groupMap.get(groupKey).batches.push({
      batchId: Number(plain.batchId),
      batch: batchYear,
      admissionBatch: `${batchYear}-${String(endYear).slice(-2)}`,
      academicYears: `${batchYear} - ${endYear}`,
      currentYear: inRange ? currentYear : null,
      currentTerms,
      currentPositionLabel,
      feePlan: {
        feePlanItemCount: items.length,
      },
      studentCount: studentCountMap.get(Number(plain.batchId)) || 0,
      currentYearStatus: status,
    });
  }

  const groups = [];
  for (const group of groupMap.values()) {
    groups.push(group);
  }

  return {
    activeCalendarYear,
    academicYear: `${activeCalendarYear}-${String(decimalAdd(activeCalendarYear, 1)).slice(-2)}`,
    academicYearId: academicCtx.academicYearId,
    yearTitle: academicYearPlain.yearTitle,
    summary,
    groups,
  };
}

export async function getBatchFeePlanOverview(batchId) {
  const resolvedBatchId = Number(batchId);

  const [batchRow, academicCtx, studentCountMap] = await Promise.all([
    repo.findBatchWithFeePlanItems(resolvedBatchId, { withSubItems: true }),
    resolveActiveAcademicYearContext(),
    repo.countStudentsByBatchIds([resolvedBatchId]),
  ]);

  if (!batchRow) {
    httpError(`Batch (ID: ${resolvedBatchId}) not found`, 404);
  }

  const batch = batchRow.get({ plain: true });
  const session = batch.session;
  if (!session || !session.course) {
    httpError(
      `Batch (ID: ${resolvedBatchId}) is missing session or course`,
      400,
    );
  }
  const course = session.course;
  const batchYear = Number(batch.batch);
  const duration = Number(course.courseDuration) || 0;
  const totalTerms = resolveTotalTerms(course);
  const activeCalendarYear = Number(academicCtx.activeBatchYear);
  const currentYear = decimalAdd(decimalSubtract(activeCalendarYear, batchYear), 1);
  const endYear = decimalAdd(batchYear, duration);
  const items = batch.feePlanItems || [];
  const itemsByYear = groupItemsByYear(items);

  const feeYears = [];
  let plannedAmount = 0;
  let currentYearAmount = 0;
  let futurePlannedAmount = 0;
  let plannedYearsCount = 0;
  let latestBatchUpdate = null;

  for (let year = 1; year <= duration; year++) {
    const yearItems = itemsByYear.get(year) || [];
    const amount = sumItemsAmount(yearItems);
    const status = resolveYearConfigStatus(yearItems);
    const academicCalendarYear = decimalAdd(batchYear, decimalSubtract(year, 1));
    const isCurrent = year === currentYear;

    let latestYearUpdate = null;
    for (const item of yearItems) {
      const itemUpdate = item.updatedAt || item.createdAt;
      if (itemUpdate) {
        const itemDate = new Date(itemUpdate);
        if (!latestYearUpdate || itemDate > new Date(latestYearUpdate)) {
          latestYearUpdate = itemUpdate;
        }
      }
      for (const sub of item.feePlanSubItems || []) {
        const subUpdate = sub.updatedAt || sub.createdAt;
        if (subUpdate) {
          const subDate = new Date(subUpdate);
          if (!latestYearUpdate || subDate > new Date(latestYearUpdate)) {
            latestYearUpdate = subUpdate;
          }
        }
      }
    }

    if (latestYearUpdate) {
      const yearDate = new Date(latestYearUpdate);
      if (!latestBatchUpdate || yearDate > new Date(latestBatchUpdate)) {
        latestBatchUpdate = latestYearUpdate;
      }
    }

    let yearRole = "Planned";
    if (currentYear >= 1 && currentYear <= duration) {
      if (year < currentYear) yearRole = "Completed";
      else if (year === currentYear) yearRole = "Current";
    }

    if (yearItems.length) {
      plannedYearsCount = decimalAdd(plannedYearsCount, 1);
      plannedAmount = decimalAdd(plannedAmount, amount);
      if (isCurrent) {
        currentYearAmount = amount;
      } else if (year > currentYear) {
        futurePlannedAmount = decimalAdd(futurePlannedAmount, amount);
      }
    }

    feeYears.push({
      year,
      yearLabel: `Year ${year}`,
      yearRole,
      isCurrent,
      academicYear: `${academicCalendarYear}-${String(decimalAdd(academicCalendarYear, 1)).slice(-2)}`,
      academicCalendarYear,
      academicPosition: academicPositionLabel(course, year),
      terms: buildCurrentTerms(course, year),
      configurationStatus: status,
      feeReceiptCount: yearItems.length,
      componentCount: countComponents(yearItems),
      amount,
      lastUpdate: latestYearUpdate,
      lastUpdated: latestYearUpdate,
      updatedAt: latestYearUpdate,
    });
  }

  const inRange = currentYear >= 1 && currentYear <= duration;

  return {
    batch: {
      batchId: Number(batch.batchId),
      batch: batchYear,
      admissionBatch: `${batchYear}-${String(endYear).slice(-2)}`,
      status: batch.status,
    },
    session: {
      sessionId: session.sessionId,
      sessionName: session.sessionName,
    },
    course: {
      courseId: course.courseId,
      courseName: course.courseName,
      courseCode: course.courseCode,
      duration,
      totalTerms,
      termType: course.termType,
      termRange: {
        from: totalTerms > 0 ? buildTermName(course.termType, 1) : null,
        to: totalTerms > 0 ? buildTermName(course.termType, totalTerms) : null,
      },
    },
    currentAcademicYear: `${activeCalendarYear}-${String(decimalAdd(activeCalendarYear, 1)).slice(-2)}`,
    currentYear: inRange ? currentYear : null,
    currentPositionLabel: inRange
      ? `${academicPositionLabel(course, currentYear)} · Year ${currentYear}`
      : null,
    studentCount: studentCountMap.get(resolvedBatchId) || 0,
    lastUpdate: latestBatchUpdate,
    lastUpdated: latestBatchUpdate,
    updatedAt: latestBatchUpdate,
    summary: {
      totalCurrentlyPlanned: plannedAmount,
      plannedYears: plannedYearsCount,
      totalYears: duration,
      currentYearAmount,
      futurePlannedAmount,
      lastUpdate: latestBatchUpdate,
      lastUpdated: latestBatchUpdate,
      updatedAt: latestBatchUpdate,
    },
    feeYears,
  };
}

export async function getBatchFeePlanYear(batchId, year) {
  const resolvedBatchId = Number(batchId);
  const yearNum = Number(year);

  const [batchRow, academicCtx] = await Promise.all([
    repo.findBatchWithFeePlanItems(resolvedBatchId, {
      year: yearNum,
      withSubItems: true,
    }),
    resolveActiveAcademicYearContext(),
  ]);

  if (!batchRow) {
    httpError(`Batch (ID: ${resolvedBatchId}) not found`, 404);
  }

  const batch = batchRow.get({ plain: true });
  const session = batch.session;
  if (!session || !session.course) {
    httpError(
      `Batch (ID: ${resolvedBatchId}) is missing session or course`,
      400,
    );
  }
  const course = session.course;
  const duration = Number(course.courseDuration) || 0;
  if (yearNum < 1 || yearNum > duration) {
    httpError(`year must be between 1 and ${duration}`, 400);
  }

  const batchYear = Number(batch.batch);
  const activeCalendarYear = Number(academicCtx.activeBatchYear);
  const currentYear = decimalAdd(decimalSubtract(activeCalendarYear, batchYear), 1);
  const academicCalendarYear = decimalAdd(batchYear, decimalSubtract(yearNum, 1));
  const items = batch.feePlanItems || [];

  let latestYearUpdate = null;
  const feeReceipts = [];
  for (const item of items) {
    const itemUpdate = item.updatedAt || item.createdAt;
    if (itemUpdate) {
      const itemDate = new Date(itemUpdate);
      if (!latestYearUpdate || itemDate > new Date(latestYearUpdate)) {
        latestYearUpdate = itemUpdate;
      }
    }
    const subItems = [];
    for (const sub of item.feePlanSubItems || []) {
      const subUpdate = sub.updatedAt || sub.createdAt;
      if (subUpdate) {
        const subDate = new Date(subUpdate);
        if (!latestYearUpdate || subDate > new Date(latestYearUpdate)) {
          latestYearUpdate = subUpdate;
        }
      }
      subItems.push(mapSubItem(sub));
    }

    feeReceipts.push({
      feePlanItemId: item.feePlanItemId,
      year: item.year != null ? Number(item.year) : yearNum,
      name: item.name,
      academicPeriod: item.academicPeriod,
      createDate: item.createDate,
      dueDate: item.dueDate,
      publishStatus: item.publishStatus,
      publishedAt: item.publishedAt,
      amount: sumItemsAmount([item]),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      feePlanSubItems: subItems,
    });
  }

  return {
    batchId: resolvedBatchId,
    batch: batchYear,
    year: yearNum,
    yearLabel: `Year ${yearNum}`,
    isCurrent: yearNum === currentYear,
    academicYear: `${academicCalendarYear}-${String(decimalAdd(academicCalendarYear, 1)).slice(-2)}`,
    academicPosition: academicPositionLabel(course, yearNum),
    terms: buildCurrentTerms(course, yearNum),
    configurationStatus: resolveYearConfigStatus(items),
    feeReceiptCount: feeReceipts.length,
    componentCount: countComponents(items),
    amount: sumItemsAmount(items),
    lastUpdate: latestYearUpdate,
    lastUpdated: latestYearUpdate,
    updatedAt: latestYearUpdate,
    feeReceipts,
  };
}

/** Billing screen: planned fee receipts for a batch year with raise status. */
export async function getBatchBillingDetails(batchId, year) {
  const resolvedBatchId = Number(batchId);
  const yearNum = Number(year);

  const [batchRow, academicCtx, studentCountMap] = await Promise.all([
    repo.findBatchWithFeePlanItems(resolvedBatchId, {
      year: yearNum,
      withSubItems: true,
    }),
    resolveActiveAcademicYearContext(),
    repo.countStudentsByBatchIds([resolvedBatchId]),
  ]);

  if (!batchRow) {
    httpError(`Batch (ID: ${resolvedBatchId}) not found`, 404);
  }

  const batch = batchRow.get({ plain: true });
  const session = batch.session;
  if (!session || !session.course) {
    httpError(
      `Batch (ID: ${resolvedBatchId}) is missing session or course`,
      400,
    );
  }
  const course = session.course;
  const duration = Number(course.courseDuration) || 0;
  if (yearNum < 1 || yearNum > duration) {
    httpError(`year must be between 1 and ${duration}`, 400);
  }

  const batchYear = Number(batch.batch);
  const endYear = decimalAdd(batchYear, duration);
  const activeCalendarYear = Number(academicCtx.activeBatchYear);
  const currentYear = decimalAdd(decimalSubtract(activeCalendarYear, batchYear), 1);
  const expectedStudents = studentCountMap.get(resolvedBatchId) || 0;
  const items = batch.feePlanItems || [];

  const feePlanItemIds = [];
  for (const item of items) {
    feePlanItemIds.push(Number(item.feePlanItemId));
  }
  const raisedMap =
    await repo.countRaisedInvoicesByFeePlanItemIds(feePlanItemIds);

  const plannedFeeReceipts = [];
  for (const item of items) {
    const amountPerStudent = sumSubItemsAmount(item.feePlanSubItems);
    const raisedCount = raisedMap.get(Number(item.feePlanItemId)) || 0;
    const status = resolveBillingStatus({
      createDate: item.createDate,
      raisedCount,
      expectedStudents,
      publishStatus: item.publishStatus,
    });

    const subLines = [];
    for (const sub of item.feePlanSubItems || []) {
      subLines.push(mapSubItem(sub));
    }

    plannedFeeReceipts.push({
      feePlanItemId: item.feePlanItemId,
      name: item.name,
      academicPeriod: item.academicPeriod,
      plannedRaiseDate: item.createDate,
      dueDate: item.dueDate,
      publishStatus: item.publishStatus,
      amountPerStudent,
      expectedStudents,
      expectedBatchAmount: decimalMultiply(amountPerStudent, expectedStudents),
      raisedInvoiceCount: raisedCount,
      status,
      feePlanSubItems: subLines,
    });
  }

  const inRange = currentYear >= 1 && currentYear <= duration;

  return {
    batch: {
      batchId: resolvedBatchId,
      batch: batchYear,
      admissionBatch: `${batchYear}-${String(endYear).slice(-2)}`,
      status: batch.status,
    },
    session: {
      sessionId: session.sessionId,
      sessionName: session.sessionName,
    },
    course: {
      courseId: course.courseId,
      courseName: course.courseName,
      courseCode: course.courseCode,
    },
    academicYear: `${activeCalendarYear}-${String(decimalAdd(activeCalendarYear, 1)).slice(-2)}`,
    currentYear: inRange ? currentYear : null,
    currentPositionLabel: inRange
      ? `${academicPositionLabel(course, currentYear)} · Year ${currentYear}`
      : null,
    studentCount: expectedStudents,
    feeYear: {
      year: yearNum,
      yearLabel: `Year ${yearNum}`,
      configurationStatus: resolveYearConfigStatus(items),
    },
    plannedFeeReceipts,
  };
}

export async function createFeePlanItemWithSubItems(body) {
  const feeTypeCatalogIds = [];
  for (const line of body.feePlanSubItems) {
    feeTypeCatalogIds.push(line.feeTypeCatalogId);
  }

  const feePlanItemId = await sequelize.transaction(async (transaction) => {
    const batch = await repo.findBatchBasics(body.batchId, { transaction });
    if (!batch) {
      httpError(`Batch (ID: ${body.batchId}) not found`, 404);
    }
    const batchPlain = batch.get({ plain: true });
    const duration = Number(batchPlain.session.course.courseDuration) || 0;
    if (body.year < 1 || body.year > duration) {
      httpError(`year must be between 1 and ${duration}`, 400);
    }

    await assertFeeTypeCatalogsExist(feeTypeCatalogIds, transaction);

    const item = await repo.createFeePlanItem(
      {
        batchId: body.batchId,
        year: body.year,
        name: body.name,
        academicPeriod: body.academicPeriod,
        createDate: body.createDate,
        dueDate: body.dueDate ?? null,
        publishStatus: FEE_PLAN_PUBLISH_STATUS.DRAFT,
      },
      { transaction },
    );

    for (const line of body.feePlanSubItems) {
      await repo.createFeePlanSubItem(
        {
          feePlanItemId: item.feePlanItemId,
          feeTypeId: line.feeTypeCatalogId,
          amount: toMoneyNumber(line.amount),
          isMainSubItem: line.isMainSubItem === true,
        },
        { transaction },
      );
    }

    return item.feePlanItemId;
  });

  return loadFeePlanItemDetail(feePlanItemId);
}

export async function updateFeePlanItem(body) {
  const feePlanItemId = Number(body.feePlanItemId);

  await sequelize.transaction(async (transaction) => {
    const existing = await repo.findFeePlanItemById(feePlanItemId, {
      transaction,
    });
    if (!existing) {
      httpError(`Fee plan item (ID: ${feePlanItemId}) not found`, 404);
    }
    if (
      existing.get({ plain: true }).publishStatus ===
      FEE_PLAN_PUBLISH_STATUS.PUBLISHED
    ) {
      httpError(
        "Published fee plan items cannot be edited. Unpublish the year first (blocked if invoices exist).",
        400,
      );
    }

    const updates = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.academicPeriod !== undefined)
      updates.academicPeriod = body.academicPeriod;
    if (body.createDate !== undefined) updates.createDate = body.createDate;
    if (body.dueDate !== undefined) updates.dueDate = body.dueDate;
    if (body.year !== undefined) updates.year = body.year;

    if (Object.keys(updates).length) {
      await repo.updateFeePlanItemById(feePlanItemId, updates, { transaction });
    }

    if (body.feePlanSubItems !== undefined) {
      const feeTypeCatalogIds = [];
      for (const line of body.feePlanSubItems) {
        feeTypeCatalogIds.push(line.feeTypeCatalogId);
      }
      await assertFeeTypeCatalogsExist(feeTypeCatalogIds, transaction);

      await repo.deleteFeePlanSubItemsByItemId(feePlanItemId, { transaction });
      for (const line of body.feePlanSubItems) {
        await repo.createFeePlanSubItem(
          {
            feePlanItemId,
            feeTypeId: line.feeTypeCatalogId,
            amount: toMoneyNumber(line.amount),
            isMainSubItem: line.isMainSubItem === true,
          },
          { transaction },
        );
      }
    }
  });

  return loadFeePlanItemDetail(feePlanItemId);
}

export async function deleteFeePlanItem(feePlanItemId) {
  const resolvedId = Number(feePlanItemId);

  await sequelize.transaction(async (transaction) => {
    const existing = await repo.findFeePlanItemById(resolvedId, {
      transaction,
    });
    if (!existing) {
      httpError(`Fee plan item (ID: ${resolvedId}) not found`, 404);
    }
    if (
      existing.get({ plain: true }).publishStatus ===
      FEE_PLAN_PUBLISH_STATUS.PUBLISHED
    ) {
      httpError(
        "Published fee plan items cannot be edited. Unpublish the year first (blocked if invoices exist).",
        400,
      );
    }

    const raised = await repo.countRaisedInvoicesForFeePlanItemIds(
      [resolvedId],
      {
        transaction,
      },
    );
    if (raised > 0) {
      httpError(
        "Cannot delete fee plan item with generated student invoices",
        400,
      );
    }

    await repo.deleteFeePlanSubItemsByItemId(resolvedId, { transaction });
    await repo.deleteFeePlanItemById(resolvedId, { transaction });
  });

  return { feePlanItemId: resolvedId };
}

export async function addFeePlanSubItem(body) {
  const feePlanItemId = body.feePlanItemId;

  const feePlanSubitemId = await sequelize.transaction(async (transaction) => {
    const item = await repo.findFeePlanItemById(feePlanItemId, { transaction });
    if (!item) {
      httpError(`Fee plan item (ID: ${feePlanItemId}) not found`, 404);
    }
    if (
      item.get({ plain: true }).publishStatus ===
      FEE_PLAN_PUBLISH_STATUS.PUBLISHED
    ) {
      httpError(
        "Published fee plan items cannot be edited. Unpublish the year first (blocked if invoices exist).",
        400,
      );
    }

    await assertFeeTypeCatalogsExist([body.feeTypeCatalogId], transaction);

    const created = await repo.createFeePlanSubItem(
      {
        feePlanItemId,
        feeTypeId: body.feeTypeCatalogId,
        amount: toMoneyNumber(body.amount),
        isMainSubItem: body.isMainSubItem === true,
      },
      { transaction },
    );

    return created.feePlanSubitemId;
  });

  const detail = await loadFeePlanItemDetail(feePlanItemId);
  let added = null;
  for (const sub of detail.feePlanSubItems) {
    if (sub.feePlanSubitemId === feePlanSubitemId) {
      added = sub;
      break;
    }
  }

  return {
    feePlanItemId,
    feePlanSubItem: added,
    feePlanItem: detail,
  };
}

export async function deleteFeePlanSubItem(feePlanSubitemId) {
  const resolvedId = Number(feePlanSubitemId);

  const feePlanItemId = await sequelize.transaction(async (transaction) => {
    const sub = await repo.findFeePlanSubItemById(resolvedId, { transaction });
    if (!sub) {
      httpError(`Fee plan sub-item (ID: ${resolvedId}) not found`, 404);
    }

    const plain = sub.get({ plain: true });
    const item = await repo.findFeePlanItemById(plain.feePlanItemId, {
      transaction,
    });
    if (!item) {
      httpError(`Fee plan item (ID: ${plain.feePlanItemId}) not found`, 404);
    }
    if (
      item.get({ plain: true }).publishStatus ===
      FEE_PLAN_PUBLISH_STATUS.PUBLISHED
    ) {
      httpError(
        "Published fee plan items cannot be edited. Unpublish the year first (blocked if invoices exist).",
        400,
      );
    }

    await repo.deleteFeePlanSubItemById(resolvedId, { transaction });
    return plain.feePlanItemId;
  });

  return {
    feePlanSubitemId: resolvedId,
    feePlanItemId,
  };
}

/** Publish all fee_plan_item rows for a batch year. */
export async function publishBatchFeePlanYear({ batchId, year }) {
  const resolvedBatchId = Number(batchId);
  const yearNum = Number(year);
  const store = getTenantStore();
  const publishedBy = store.userId != null ? Number(store.userId) : null;
  const publishedAt = new Date();

  const historyId = await sequelize.transaction(async (transaction) => {
    const batch = await repo.findBatchBasics(resolvedBatchId, { transaction });
    if (!batch) {
      httpError(`Batch (ID: ${resolvedBatchId}) not found`, 404);
    }
    const batchPlain = batch.get({ plain: true });
    const duration = Number(batchPlain.session.course.courseDuration) || 0;
    if (yearNum < 1 || yearNum > duration) {
      httpError(`year must be between 1 and ${duration}`, 400);
    }

    const items = await repo.findFeePlanItemsByBatchAndYear(
      resolvedBatchId,
      yearNum,
      {
        withSubItems: true,
        transaction,
      },
    );
    if (!items.length) {
      httpError("No fee plan items found for this batch year", 400);
    }

    const feePlanItemIds = [];
    for (const row of items) {
      const plain = row.get({ plain: true });
      if (!(plain.feePlanSubItems || []).length) {
        httpError(
          `Fee plan item (ID: ${plain.feePlanItemId}) must have at least one fee component before publishing`,
          400,
        );
      }
      feePlanItemIds.push(Number(plain.feePlanItemId));
    }

    let alreadyPublished = 0;
    for (const row of items) {
      if (
        row.get({ plain: true }).publishStatus ===
        FEE_PLAN_PUBLISH_STATUS.PUBLISHED
      ) {
        alreadyPublished = decimalAdd(alreadyPublished, 1);
      }
    }
    if (alreadyPublished === items.length) {
      httpError("Fee plan year is already published", 400);
    }

    await repo.updateFeePlanItemsPublishByIds(
      feePlanItemIds,
      {
        publishStatus: FEE_PLAN_PUBLISH_STATUS.PUBLISHED,
        publishedAt,
        publishedBy,
      },
      { transaction },
    );

    const history = await repo.createFeePlanPublishHistory(
      {
        batchId: resolvedBatchId,
        year: yearNum,
        action: "publish",
        publishedAt,
        publishedBy,
      },
      { transaction },
    );

    return history.feePlanPublishHistoryId;
  });

  return {
    batchId: resolvedBatchId,
    year: yearNum,
    feePlanPublishHistoryId: historyId,
    publishStatus: FEE_PLAN_PUBLISH_STATUS.PUBLISHED,
    publishedAt,
    publishedBy,
  };
}

/** Unpublish a batch year (blocked if any student invoices were generated). */
export async function unpublishBatchFeePlanYear({ batchId, year }) {
  const resolvedBatchId = Number(batchId);
  const yearNum = Number(year);
  const store = getTenantStore();
  const publishedBy = store.userId != null ? Number(store.userId) : null;
  const publishedAt = new Date();

  const historyId = await sequelize.transaction(async (transaction) => {
    const items = await repo.findFeePlanItemsByBatchAndYear(
      resolvedBatchId,
      yearNum,
      {
        withSubItems: true,
        transaction,
      },
    );
    if (!items.length) {
      httpError("No fee plan items found for this batch year", 400);
    }

    const feePlanItemIds = [];
    let publishedCount = 0;
    for (const row of items) {
      const plain = row.get({ plain: true });
      feePlanItemIds.push(Number(plain.feePlanItemId));
      if (plain.publishStatus === FEE_PLAN_PUBLISH_STATUS.PUBLISHED) {
        publishedCount = decimalAdd(publishedCount, 1);
      }
    }
    if (!publishedCount) {
      httpError("Fee plan year is not published", 400);
    }

    const raised = await repo.countRaisedInvoicesForFeePlanItemIds(
      feePlanItemIds,
      {
        transaction,
      },
    );
    if (raised > 0) {
      httpError(
        "Cannot unpublish: student invoices have already been generated for this year",
        400,
      );
    }

    await repo.updateFeePlanItemsPublishByIds(
      feePlanItemIds,
      {
        publishStatus: FEE_PLAN_PUBLISH_STATUS.DRAFT,
        publishedAt: null,
        publishedBy: null,
      },
      { transaction },
    );

    const history = await repo.createFeePlanPublishHistory(
      {
        batchId: resolvedBatchId,
        year: yearNum,
        action: "unpublish",
        publishedAt,
        publishedBy,
      },
      { transaction },
    );

    return history.feePlanPublishHistoryId;
  });

  return {
    batchId: resolvedBatchId,
    year: yearNum,
    feePlanPublishHistoryId: historyId,
    publishStatus: FEE_PLAN_PUBLISH_STATUS.DRAFT,
  };
}

export async function getFeePlanPublishHistory({ batchId, year }) {
  const rows = await repo.findFeePlanPublishHistory({
    batchId: Number(batchId),
    year: year != null ? Number(year) : undefined,
  });

  const history = [];
  for (const row of rows) {
    const plain = row.get({ plain: true });
    history.push({
      feePlanPublishHistoryId: plain.feePlanPublishHistoryId,
      batchId: plain.batchId,
      year: plain.year,
      action: plain.action,
      publishedAt: plain.publishedAt,
      publishedBy: plain.publishedBy,
    });
  }

  return {
    batchId: Number(batchId),
    year: year != null ? Number(year) : null,
    history,
  };
}

export async function getFeePlanPublishHistoryById(feePlanPublishHistoryId) {
  const row = await repo.findFeePlanPublishHistoryById(feePlanPublishHistoryId);
  if (!row) {
    httpError(
      `Publish history (ID: ${feePlanPublishHistoryId}) not found`,
      404,
    );
  }
  const plain = row.get({ plain: true });
  return {
    feePlanPublishHistoryId: plain.feePlanPublishHistoryId,
    batchId: plain.batchId,
    year: plain.year,
    action: plain.action,
    publishedAt: plain.publishedAt,
    publishedBy: plain.publishedBy,
  };
}

export async function getSingleFeePlanItemDetails(feePlanItemId, options = {}) {
  const row = await repo.findFeePlanItemById(feePlanItemId, {
    withSubItems: true,
  });
  if (!row) {
    httpError(`Fee plan item (ID: ${feePlanItemId}) not found`, 404);
  }
  const plainItem = row.get({ plain: true });

  const [batchRow, academicCtx, studentRows, raisedInvoices] =
    await Promise.all([
      repo.findBatchBasics(plainItem.batchId),
      resolveActiveAcademicYearContext(),
      repo.findStudentsByBatchId(plainItem.batchId),
      repo.findRaisedInvoicesByFeePlanItemId(feePlanItemId),
    ]);

  if (!batchRow) {
    httpError(
      `Batch (ID: ${plainItem.batchId}) not found for fee plan item`,
      404,
    );
  }

  const plainBatch = batchRow.get({ plain: true });
  const { session } = plainBatch;
  const course = session?.course || {};

  const activeCalendarYear = Number(academicCtx.activeBatchYear);
  const plainAcademicYear = academicCtx.academicYear?.get
    ? academicCtx.academicYear.get({ plain: true })
    : academicCtx.academicYear || {};

  const academicYearLabel = `${activeCalendarYear}-${String(decimalAdd(activeCalendarYear, 1)).slice(-2)}`;
  const academicYearTitle = plainAcademicYear.yearTitle || academicYearLabel;

  const batchYear = Number(plainBatch.batch);
  const courseDuration = Number(course.courseDuration) || 0;
  const totalTerms = resolveTotalTerms(course);
  const batchEndYear = decimalAdd(batchYear, courseDuration);
  const admissionBatchLabel = `${batchYear}-${String(batchEndYear).slice(-2)}`;
  const batchAcademicYearsLabel = `${batchYear} - ${batchEndYear}`;

  const currentStudyYear = decimalAdd(decimalSubtract(activeCalendarYear, batchYear), 1);
  const isYearWithinCourseDuration =
    currentStudyYear >= 1 && currentStudyYear <= courseDuration;
  const currentTermsNumbers = isYearWithinCourseDuration
    ? termsForYear(currentStudyYear, course)
    : [];
  const currentTerm = currentTermsNumbers[0] || null;
  const currentTermName = currentTerm
    ? buildTermName(course.termType, currentTerm)
    : null;

  const receiptAmount = sumSubItemsAmount(plainItem.feePlanSubItems);
  const studentCount = studentRows.length;
  const raisedInvoiceCount = raisedInvoices.length;

  const todayDateStr = new Date().toISOString().slice(0, 10);
  let status = "Not Configured";
  if (studentCount > 0 && raisedInvoiceCount >= studentCount) {
    status = "Raised";
  } else if (!plainItem.createDate || plainItem.createDate <= todayDateStr) {
    status = "Ready to Raise";
  } else {
    status = "Upcoming";
  }

  const raisedInvoiceMap = new Map();
  for (const invoice of raisedInvoices) {
    const plainInv = invoice.get ? invoice.get({ plain: true }) : invoice;
    raisedInvoiceMap.set(Number(plainInv.studentId), plainInv);
  }

  const isPaginated = options.page != null || options.limit != null;
  const totalRecords = studentRows.length;
  let page = 1;
  let limit = totalRecords;
  let totalPages = 1;
  let paginatedStudentRows = studentRows;

  if (isPaginated) {
    page = Math.max(1, Number(options.page) || 1);
    limit = Math.max(1, Number(options.limit) || 10);
    totalPages = Math.ceil(totalRecords / limit) || 1;
    const offset = (page - 1) * limit;
    paginatedStudentRows = studentRows.slice(offset, decimalAdd(offset, limit));
  }

  const studentsList = paginatedStudentRows.map((st) => {
    const plainSt = st.get ? st.get({ plain: true }) : st;
    const fullName = [plainSt.firstName, plainSt.middleName, plainSt.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    const raisedInvoice = raisedInvoiceMap.get(Number(plainSt.studentId));

    return {
      studentId: plainSt.studentId,
      firstName: plainSt.firstName,
      middleName: plainSt.middleName || null,
      lastName: plainSt.lastName || null,
      fullName,
      enrollNumber: plainSt.enrollNumber || null,
      scholarNumber: plainSt.scholarNumber,
      batchId: Number(plainSt.batchId),
      batchYear,
      currentStudyYear: isYearWithinCourseDuration ? currentStudyYear : null,
      currentTerm,
      currentTermName,
      invoiceAmount: raisedInvoice
        ? toMoneyNumber(raisedInvoice.total)
        : receiptAmount,
      isInvoiceRaised: !!raisedInvoice,
      studentFeeInvoiceId: raisedInvoice
        ? raisedInvoice.studentFeeInvoiceId
        : null,
      invoiceStatus: raisedInvoice ? "Raised" : "Pending",
    };
  });

  const subItems = (plainItem.feePlanSubItems || []).map(mapSubItem);

  return {
    feePlanItemId: plainItem.feePlanItemId,
    invoiceName: plainItem.name || plainItem.academicPeriod || "Fee Receipt",
    academicPeriod: plainItem.academicPeriod,
    createDate: plainItem.createDate,
    dueDate: plainItem.dueDate,
    year: plainItem.year,
    publishStatus: plainItem.publishStatus,
    amount: receiptAmount,
    status,
    studentCount,
    raisedInvoiceCount,
    course: {
      courseId: course.courseId,
      courseName: course.courseName,
      courseCode: course.courseCode,
      courseDuration,
      totalTerms,
      termType: course.termType,
    },
    session: {
      sessionId: session?.sessionId,
      sessionName: session?.sessionName,
    },
    batch: {
      batchId: Number(plainBatch.batchId),
      batchYear,
      admissionBatch: admissionBatchLabel,
      academicYears: batchAcademicYearsLabel,
    },
    activeAcademicYear: {
      academicYearId: academicCtx.academicYearId,
      academicYearLabel,
      academicYearTitle,
      activeCalendarYear,
    },
    subItems,
    pagination: {
      totalRecords,
      totalPages,
      currentPage: page,
      pageSize: limit,
    },
    students: studentsList,
  };
}

function formatRunDate(dateStr) {
  if (!dateStr) return "";
  const parts = String(dateStr).split("-");
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const monthIdx = Number(parts[1]) - 1;
  const day = parts[2];
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${day} ${monthNames[monthIdx] || parts[1]} ${year}`;
}

export async function getBillingRuns(filters = {}) {
  const [items, academicCtx] = await Promise.all([
    repo.findFeePlanItemsWithHierarchy(filters),
    resolveActiveAcademicYearContext(),
  ]);

  const activeBatchYear = Number(academicCtx.activeBatchYear);
  const activeAcademicYear = academicCtx.academicYear;
  const activeAcademicYearText =
    activeAcademicYear?.academicYear ||
    `${activeBatchYear}-${String(activeBatchYear + 1).slice(-2)}`;

  const feePlanItemIds = items.map((it) => Number(it.feePlanItemId));
  const batchIds = Array.from(
    new Set(items.map((it) => Number(it.batchId)).filter(Boolean)),
  );

  const [raisedMap, studentCountMap] = await Promise.all([
    repo.countRaisedInvoicesByFeePlanItemIds(feePlanItemIds),
    repo.countStudentsByBatchIds(batchIds),
  ]);

  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const actionRequired = [];
  const activeBillingRuns = [];
  const upcomingRuns = [];

  const search = filters.search
    ? String(filters.search).trim().toLowerCase()
    : "";

  for (const rawItem of items) {
    const plain = rawItem.get ? rawItem.get({ plain: true }) : rawItem;
    const batch = plain.batch;
    const session = batch?.session;
    const course = session?.course;

    if (!batch || !session || !course) continue;

    const batchYear = Number(batch.batch);
    const duration = Number(course.courseDuration) || 0;
    const endYear = decimalAdd(batchYear, duration);
    const yearNum = plain.year != null ? Number(plain.year) : 1;

    // Only send feePlanItems for the current active year of this batch:
    // e.g. 2025 batch in active calendar year 2026 -> activeYear = 2026 - 2025 + 1 = 2
    const currentActiveYear = decimalAdd(decimalSubtract(activeBatchYear, batchYear), 1);
    const targetYear =
      filters.year != null ? Number(filters.year) : currentActiveYear;
    if (yearNum !== targetYear) {
      continue;
    }

    const billingRun = plain.name || `Year ${yearNum} Fee`;
    const context = `${course.courseName} ${batchYear}-${String(endYear).slice(-2)} · Year ${yearNum}`;
    const feePlanLabel = `Fee Plan ${activeAcademicYearText}`;

    if (search) {
      const matchText =
        `${billingRun} ${course.courseName} ${course.courseCode} ${session.sessionName} ${batchYear}`.toLowerCase();
      if (!matchText.includes(search)) continue;
    }

    const students = studentCountMap.get(Number(batch.batchId)) || 0;
    const raisedInvoiceCount = raisedMap.get(Number(plain.feePlanItemId)) || 0;
    const perStudent = sumSubItemsAmount(plain.feePlanSubItems);
    const runTotal = decimalMultiply(perStudent, students);

    const subLines = (plain.feePlanSubItems || []).map(mapSubItem);
    const formattedPlannedDate = formatRunDate(plain.createDate);

    const baseItemData = {
      feePlanItemId: plain.feePlanItemId,
      billingRun,
      name: plain.name,
      domain: "Academic",
      context,
      feePlanLabel,
      batchId: Number(batch.batchId),
      year: yearNum,
      students,
      perStudent,
      runTotal,
      raisedInvoiceCount,
      createDate: plain.createDate,
      plannedDate: plain.createDate,
      dueDate: plain.dueDate,
      publishStatus: plain.publishStatus,
      lastUpdated: plain.updatedAt,
      createdAt: plain.createdAt,
      course: {
        courseId: course.courseId,
        courseName: course.courseName,
        courseCode: course.courseCode,
      },
      session: {
        sessionId: session.sessionId,
        sessionName: session.sessionName,
      },
      batch: {
        batchId: Number(batch.batchId),
        batch: batchYear,
        admissionBatch: `${batchYear}-${String(endYear).slice(-2)}`,
        status: batch.status,
      },
    };

    // Partitioning:
    // 1. If invoices generated -> ActivebillingRuns
    // 2. If createDate not reached -> upcomingRuns
    // 3. If createDate passed and invoices not generated -> ActionRequired
    if (raisedInvoiceCount > 0) {
      const stage =
        students > 0 && raisedInvoiceCount >= students
          ? "Completed"
          : raisedInvoiceCount > 0
            ? "Partially Completed"
            : plain.publishStatus === "published"
              ? "Ready"
              : "Draft";

      activeBillingRuns.push({
        ...baseItemData,
        stage,
      });
    } else if (plain.createDate && plain.createDate > today) {
      upcomingRuns.push({
        ...baseItemData,
        stage: "Upcoming",
      });
    } else {
      const isPast = plain.createDate && plain.createDate < today;
      const stage = isPast ? "Due for billing" : "Ready to raise";

      actionRequired.push({
        ...baseItemData,
        stage,
      });
    }
  }

  return {
    summary: {
      actionRequiredCount: actionRequired.length,
      activeBillingRunsCount: activeBillingRuns.length,
      upcomingRunsCount: upcomingRuns.length,
      totalRuns: decimalSum([
        actionRequired.length,
        activeBillingRuns.length,
        upcomingRuns.length,
      ]),
    },
    actionRequired,
    activeBillingRuns,
    upcomingRuns,
    ActionRequired: actionRequired,
    ActivebillingRuns: activeBillingRuns,
    upcomingBilling: upcomingRuns,
  };
}

export async function getBillingRunDetails(query = {}, authUser = {}) {
  const { feePlanItemId, page = 1, limit = 10, search } = query;

  if (!feePlanItemId) {
    throw httpError("feePlanItemId is required", 400);
  }

  const rawItem = await repo.findFeePlanItemWithHierarchyById(feePlanItemId);
  if (!rawItem) {
    throw httpError(`Fee plan item with ID ${feePlanItemId} not found`, 404);
  }

  const plainItem = rawItem.get ? rawItem.get({ plain: true }) : rawItem;
  const batch = plainItem.batch;
  const session = batch?.session;
  const course = session?.course;

  const batchYear = Number(batch?.batch);
  const courseDuration = Number(course?.courseDuration) || 0;
  const endYear = decimalAdd(batchYear, courseDuration);
  const yearNum = plainItem.year != null ? Number(plainItem.year) : 1;

  const [studentCountMap, raisedMap, paginatedStudents] = await Promise.all([
    repo.countStudentsByBatchIds([Number(batch.batchId)]),
    repo.countRaisedInvoicesByFeePlanItemIds([Number(plainItem.feePlanItemId)]),
    repo.findPaginatedStudentsByBatchId({
      batchId: Number(batch.batchId),
      page,
      limit,
      search,
    }),
  ]);

  const studentCount = studentCountMap.get(Number(batch.batchId)) || 0;
  const raisedInvoicesCount =
    raisedMap.get(Number(plainItem.feePlanItemId)) || 0;
  const pendingInvoicesCount = Math.max(0, decimalSubtract(studentCount, raisedInvoicesCount));

  const amountPerStudent = sumSubItemsAmount(plainItem.feePlanSubItems);
  const totalBillingAmount = decimalMultiply(amountPerStudent, studentCount);

  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  let stage = "Ready to raise";
  if (raisedInvoicesCount > 0) {
    stage =
      studentCount > 0 && raisedInvoicesCount >= studentCount
        ? "Completed"
        : "Partially Completed";
  } else if (plainItem.createDate && plainItem.createDate > today) {
    stage = "Upcoming";
  } else if (plainItem.createDate && plainItem.createDate < today) {
    stage = "Due for billing";
  }

  const subItems = (plainItem.feePlanSubItems || []).map(mapSubItem);

  const studentIdsOnPage = paginatedStudents.rows.map((s) =>
    Number(s.studentId),
  );
  const invoicesOnPage =
    await repo.findGeneratedInvoicesByFeePlanItemIdAndStudentIds(
      plainItem.feePlanItemId,
      studentIdsOnPage,
    );
  const invoiceMap = new Map(
    invoicesOnPage.map((inv) => [Number(inv.studentId), inv]),
  );

  const studentList = paginatedStudents.rows.map((row) => {
    const s = row.get ? row.get({ plain: true }) : row;
    const inv = invoiceMap.get(Number(s.studentId));

    const mappedFeePolicies = (s.feePolicyStudents || [])
      .map((fps) => {
        const p = fps.policy;
        if (!p) return null;
        return {
          feePolicyStudentId: fps.feePolicyStudentId,
          feePolicyId: p.feePolicyId,
          policyName: p.policyName,
          description: p.description,
          appliesTo: p.appliesTo,
          effect: p.effect,
          calculationType: p.calculationType,
          percentageRate:
            p.percentageRate != null ? Number(p.percentageRate) : null,
          fixedAmount: p.fixedAmount != null ? Number(p.fixedAmount) : null,
          gracePeriodDays:
            p.gracePeriodDays != null ? Number(p.gracePeriodDays) : 0,
          maxCapAmount: p.maxCapAmount != null ? Number(p.maxCapAmount) : null,
          publishStatus: p.publishStatus,
        };
      })
      .filter(Boolean);

    const isFeePolicyMapped = mappedFeePolicies.length > 0;
    const primaryPolicy = isFeePolicyMapped ? mappedFeePolicies[0] : null;

    return {
      studentId: s.studentId,
      userId: s.userId,
      firstName: s.firstName,
      middleName: s.middleName,
      lastName: s.lastName,
      fullName: [s.firstName, s.middleName, s.lastName]
        .filter(Boolean)
        .join(" "),
      scholarNumber: s.scholarNumber,
      enrollNumber: s.enrollNumber,
      admissionNumber: s.admissionNumber,
      studentStatus: s.studentStatus,
      batchId: s.batchId,
      classSectionTermId: s.classSectionTermId,
      isInvoiceRaised: Boolean(inv),
      invoice: inv
        ? {
            studentFeeInvoiceId: inv.studentFeeInvoiceId,
            total: inv.total != null ? Number(inv.total) : null,
            paidAmount: inv.paidAmount != null ? Number(inv.paidAmount) : 0,
            paymentStatus: inv.paymentStatus,
            status: inv.status,
            createDate: inv.createDate,
            dueDate: inv.dueDate,
          }
        : null,
      isFeePolicyMapped,
      feePolicies: mappedFeePolicies,
      feePolicy: primaryPolicy,
    };
  });

  return {
    feePlanItem: {
      feePlanItemId: plainItem.feePlanItemId,
      billingRun: plainItem.name || `Year ${yearNum} Fee`,
      name: plainItem.name,
      domain: "Academic",
      year: yearNum,
      academicPeriod: plainItem.academicPeriod,
      createDate: plainItem.createDate,
      plannedDate: plainItem.createDate,
      dueDate: plainItem.dueDate,
      publishStatus: plainItem.publishStatus,
      stage,
      amountPerStudent,
      totalBillingAmount,
      runTotal: totalBillingAmount,
      raisedInvoicesCount,
      pendingInvoicesCount,
      createdAt: plainItem.createdAt,
      updatedAt: plainItem.updatedAt,
      feePlanSubItems: subItems,
    },
    batch: {
      batchId: Number(batch?.batchId),
      batchYear,
      batch: batchYear,
      admissionBatch: `${batchYear}-${String(endYear).slice(-2)}`,
      academicYears: `${batchYear} - ${endYear}`,
      status: batch?.status,
    },
    course: course
      ? {
          courseId: course.courseId,
          courseName: course.courseName,
          courseCode: course.courseCode,
          courseDuration,
          termType: course.termType,
          totalTerms: course.totalTerms,
        }
      : null,
    session: session
      ? {
          sessionId: session.sessionId,
          sessionName: session.sessionName,
        }
      : null,
    studentCount,
    peginationData: {
      totalRecords: paginatedStudents.totalRecords,
      totalPages: paginatedStudents.totalPages,
      currentPage: paginatedStudents.currentPage,
      pageSize: paginatedStudents.pageSize,
      hasNextPage: paginatedStudents.currentPage < paginatedStudents.totalPages,
      hasPrevPage: paginatedStudents.currentPage > 1,
    },
    students: studentList,
  };
}
