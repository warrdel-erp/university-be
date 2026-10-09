import sequelize from "../database/sequelizeConfig.js";
import * as repo from "../repository/billingScheduleRepository.js";
import * as repoPaymentTerms from "../repository/billingSchedulePaymentTermsRepository.js";
import { resolveActiveAcademicYearContext } from "../utility/curriculumSubjectsByActiveYear.js";
import { resolveBatchCurrentPosition, buildCurrentTermsForYear, termsForYear, buildTermName } from "../utility/courseTerms.js";
import { decimalAdd, decimalSubtract, toMoneyNumber } from "../utility/decimalMoney.js";

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/**
 * Create billing schedule item(s) with optional sub-items breakdown.
 * Supports both a single object OR an array of objects for bulk creation.
 */
export async function createBillingSchedule(payload, user = {}) {
  let scheduleItems = [];
  let isSingle = false;

  if (Array.isArray(payload)) {
    scheduleItems = payload;
  } else if (Array.isArray(payload?.schedules)) {
    scheduleItems = payload.schedules.map((item) => ({
      ...item,
      feePlanItemId: item.feePlanItemId || payload.feePlanItemId,
    }));
  } else if (payload && typeof payload === "object") {
    scheduleItems = [payload];
    isSingle = true;
  }

  if (scheduleItems.length === 0) {
    throw httpError("At least one billing schedule item is required", 400);
  }

  // 1. Validate that all fee plan items exist
  const planItemIds = [...new Set(scheduleItems.map((s) => s.feePlanItemId))];
  const planItemMap = new Map();
  for (const id of planItemIds) {
    if (!id) {
      throw httpError("feePlanItemId is required for each schedule item", 400);
    }
    const feePlanItem = await repo.findFeePlanItemById(id);
    if (!feePlanItem) {
      throw httpError(`Fee plan item with ID ${id} not found`, 404);
    }
    
    // Fetch course details manually if not included by the repo function
    const { batchModel, sessionModel, courseModel } = await import("../models/index.js");
    const feePlanItemWithCourse = await feePlanItem.reload({
      include: [
        {
          model: batchModel,
          as: "batch",
          include: [
            {
              model: sessionModel,
              as: "session",
              include: [
                {
                  model: courseModel,
                  as: "course"
                }
              ]
            }
          ]
        }
      ]
    });
    
    planItemMap.set(id, feePlanItemWithCourse);
  }

  const createdIds = [];

  // 2. Execute all creation in a single transaction
  await sequelize.transaction(async (t) => {
    const termCounterMap = new Map();

    for (const item of scheduleItems) {
      const { feePlanItemId, name, amount, plannedDate, status, subItems } =
        item;

      let totalAmount = amount != null ? toMoneyNumber(amount) : 0;
      if (Array.isArray(subItems) && subItems.length > 0 && amount == null) {
        totalAmount = subItems.reduce(
          (sum, sub) => decimalAdd(sum, toMoneyNumber(sub.amount || 0)),
          0,
        );
      }

      const feePlan = planItemMap.get(feePlanItemId);
      const universityId = user?.universityId || feePlan?.universityId || null;
      const instituteId = user?.instituteId || feePlan?.instituteId;

      let scheduleName = name || null;
      if (!scheduleName) {
        let currentIndex = termCounterMap.get(feePlanItemId) || 0;
        const course = feePlan?.batch?.session?.course;
        if (course) {
          const generatedTerms = termsForYear(feePlan.year, course);
          if (generatedTerms && currentIndex < generatedTerms.length) {
            scheduleName = buildTermName(course.termType, generatedTerms[currentIndex]);
          } else {
            scheduleName = `Installment ${currentIndex + 1}`;
          }
        } else {
          scheduleName = `Installment ${currentIndex + 1}`;
        }
        termCounterMap.set(feePlanItemId, currentIndex + 1);
      }

      const parentRecord = await repo.createBillingScheduleItem(
        {
          feePlanItemId,
          name: scheduleName,
          amount: totalAmount,
          plannedDate: plannedDate || null,
          status: status || "pending",
          universityId,
          instituteId,
        },
        { transaction: t },
      );

      const createdItemId = parentRecord.billingScheduleItemId;
      createdIds.push(createdItemId);

      if (Array.isArray(subItems) && subItems.length > 0) {
        const subItemsData = subItems.map((sub) => ({
          billingScheduleItemId: createdItemId,
          feePlanSubItemId: sub.feePlanSubItemId,
          amount: toMoneyNumber(sub.amount || 0),
          universityId,
          instituteId,
        }));

        await repo.bulkCreateBillingScheduleSubItems(subItemsData, {
          transaction: t,
        });
      }

      const { paymentTerms, installment } = item;
      if (Array.isArray(paymentTerms) && paymentTerms.length > 0) {
        const termsData = paymentTerms.map((pt) => ({
          billingScheduleItemId: createdItemId,
          installment: Number(pt.installment || pt),
        }));
        await repoPaymentTerms.bulkCreatePaymentTerms(termsData, {
          transaction: t,
        });
      } else if (installment != null) {
        await repoPaymentTerms.createPaymentTerm(
          {
            billingScheduleItemId: createdItemId,
            installment: Number(installment),
          },
          { transaction: t },
        );
      }
    }
  });

  // 3. Fetch created items with full details
  const results = await Promise.all(
    createdIds.map((id) => repo.findBillingScheduleItemById(id)),
  );

  return isSingle ? results[0] : results;
}

/**
 * Get paginated list of billing schedule items with filters
 */
export async function getBillingSchedules(queryParams = {}) {
  const {
    feePlanItemId,
    status,
    fromDate,
    toDate,
    page = 1,
    limit = 10,
  } = queryParams;

  const filters = {};
  if (feePlanItemId) filters.feePlanItemId = Number(feePlanItemId);
  if (status) filters.status = status;
  if (fromDate) filters.fromDate = fromDate;
  if (toDate) filters.toDate = toDate;

  const result = await repo.findBillingScheduleItems(filters, { page, limit });

  return {
    items: result.rows,
    paginationData: {
      total: result.total,
      page: result.page,
      limit: result.limit,
    },
  };
}

/**
 * Get single billing schedule item details
 */
export async function getSingleBillingSchedule(billingScheduleItemId) {
  if (!billingScheduleItemId) {
    throw httpError("billingScheduleItemId is required", 400);
  }

  const item = await repo.findBillingScheduleItemById(billingScheduleItemId);
  if (!item) {
    throw httpError(
      `Billing schedule item with ID ${billingScheduleItemId} not found`,
      404,
    );
  }

  return item;
}

/**
 * Update billing schedule item and optionally sync its sub-items
 */
export async function updateBillingSchedule(
  billingScheduleItemId,
  payload,
  user = {},
) {
  if (!billingScheduleItemId) {
    throw httpError("billingScheduleItemId is required", 400);
  }

  const existingItem = await repo.findBillingScheduleItemById(
    billingScheduleItemId,
  );
  if (!existingItem) {
    throw httpError(
      `Billing schedule item with ID ${billingScheduleItemId} not found`,
      404,
    );
  }

  const universityId = user?.universityId || existingItem.universityId || null;
  const instituteId = user?.instituteId || existingItem.instituteId;

  await sequelize.transaction(async (t) => {
    const updateData = {};

    if (payload.plannedDate !== undefined)
      updateData.plannedDate = payload.plannedDate;
    if (payload.status !== undefined) updateData.status = payload.status;

    // Handle amount & subItems re-sync
    if (Array.isArray(payload.subItems)) {
      let totalAmount =
        payload.amount != null ? toMoneyNumber(payload.amount) : null;
      if (totalAmount == null) {
        totalAmount = payload.subItems.reduce(
          (sum, sub) => decimalAdd(sum, toMoneyNumber(sub.amount || 0)),
          0,
        );
      }
      updateData.amount = totalAmount;

      // Replace sub-items
      await repo.deleteBillingScheduleSubItemsByItemId(billingScheduleItemId, {
        transaction: t,
      });

      if (payload.subItems.length > 0) {
        const subItemsData = payload.subItems.map((sub) => ({
          billingScheduleItemId,
          feePlanSubItemId: sub.feePlanSubItemId,
          amount: toMoneyNumber(sub.amount || 0),
          universityId,
          instituteId,
        }));

        await repo.bulkCreateBillingScheduleSubItems(subItemsData, {
          transaction: t,
        });
      }
    } else if (payload.amount !== undefined) {
      updateData.amount = toMoneyNumber(payload.amount);
    }

    if (Object.keys(updateData).length > 0) {
      await repo.updateBillingScheduleItem(billingScheduleItemId, updateData, {
        transaction: t,
      });
    }
  });

  return repo.findBillingScheduleItemById(billingScheduleItemId);
}

/**
 * Quick status update for billing schedule item
 */
export async function updateBillingScheduleStatus(
  billingScheduleItemId,
  status,
) {
  if (!billingScheduleItemId) {
    throw httpError("billingScheduleItemId is required", 400);
  }
  if (!status) {
    throw httpError("status is required", 400);
  }

  const existing = await repo.findBillingScheduleItemById(
    billingScheduleItemId,
  );
  if (!existing) {
    throw httpError(
      `Billing schedule item with ID ${billingScheduleItemId} not found`,
      404,
    );
  }

  await repo.updateBillingScheduleItem(billingScheduleItemId, { status });
  return repo.findBillingScheduleItemById(billingScheduleItemId);
}

/**
 * Delete billing schedule item
 */
export async function deleteBillingSchedule(billingScheduleItemId) {
  if (!billingScheduleItemId) {
    throw httpError("billingScheduleItemId is required", 400);
  }

  const existing = await repo.findBillingScheduleItemById(
    billingScheduleItemId,
  );
  if (!existing) {
    throw httpError(
      `Billing schedule item with ID ${billingScheduleItemId} not found`,
      404,
    );
  }

  await sequelize.transaction(async (t) => {
    await repo.deleteBillingScheduleSubItemsByItemId(billingScheduleItemId, {
      transaction: t,
    });
    await repo.deleteBillingScheduleItem(billingScheduleItemId, {
      transaction: t,
    });
  });

  return { billingScheduleItemId };
}

/**
 * Add a single sub-item to an existing billing schedule
 */
export async function addBillingScheduleSubItem(payload, user = {}) {
  const { billingScheduleItemId, feePlanSubItemId, amount } = payload;

  if (!billingScheduleItemId) {
    throw httpError("billingScheduleItemId is required", 400);
  }
  if (!feePlanSubItemId) {
    throw httpError("feePlanSubItemId is required", 400);
  }

  const scheduleItem = await repo.findBillingScheduleItemById(
    billingScheduleItemId,
  );
  if (!scheduleItem) {
    throw httpError(
      `Billing schedule item with ID ${billingScheduleItemId} not found`,
      404,
    );
  }

  const subItemAmount = toMoneyNumber(amount || 0);
  const universityId = user?.universityId || scheduleItem.universityId || null;
  const instituteId = user?.instituteId || scheduleItem.instituteId;

  let newSubItem;
  await sequelize.transaction(async (t) => {
    newSubItem = await repo.createBillingScheduleSubItem(
      {
        billingScheduleItemId,
        feePlanSubItemId,
        amount: subItemAmount,
        universityId,
        instituteId,
      },
      { transaction: t },
    );

    // Increment parent amount
    const newTotal = decimalAdd(
      toMoneyNumber(scheduleItem.amount || 0),
      subItemAmount,
    );
    await repo.updateBillingScheduleItem(
      billingScheduleItemId,
      { amount: newTotal },
      { transaction: t },
    );
  });

  return newSubItem;
}

/**
 * Delete a single sub-item from a billing schedule
 */
export async function deleteBillingScheduleSubItem(billingScheduleSubItemId) {
  if (!billingScheduleSubItemId) {
    throw httpError("billingScheduleSubItemId is required", 400);
  }

  const subItem = await repo.findBillingScheduleSubItemById(
    billingScheduleSubItemId,
  );
  if (!subItem) {
    throw httpError(
      `Billing schedule sub-item with ID ${billingScheduleSubItemId} not found`,
      404,
    );
  }

  await sequelize.transaction(async (t) => {
    const parent = await repo.findBillingScheduleItemById(
      subItem.billingScheduleItemId,
      {
        transaction: t,
      },
    );
    if (parent) {
      const newTotal = Math.max(
        0,
        toMoneyNumber(parent.amount || 0) - toMoneyNumber(subItem.amount || 0),
      );
      await repo.updateBillingScheduleItem(
        parent.billingScheduleItemId,
        { amount: newTotal },
        { transaction: t },
      );
    }

    await repo.deleteBillingScheduleSubItemById(billingScheduleSubItemId, {
      transaction: t,
    });
  });

  return { billingScheduleSubItemId };
}

/**
 * Add a single payment term to an existing billing schedule item
 */
export async function addBillingSchedulePaymentTerm(payload) {
  const { billingScheduleItemId, installment } = payload;
  if (!billingScheduleItemId) {
    throw httpError("billingScheduleItemId is required", 400);
  }
  if (installment == null || !Number.isInteger(Number(installment))) {
    throw httpError("installment must be an integer", 400);
  }

  const scheduleItem = await repo.findBillingScheduleItemById(
    billingScheduleItemId,
  );
  if (!scheduleItem) {
    throw httpError(
      `Billing schedule item with ID ${billingScheduleItemId} not found`,
      404,
    );
  }

  const newTerm = await repoPaymentTerms.createPaymentTerm({
    billingScheduleItemId,
    installment: Number(installment),
  });

  return repoPaymentTerms.findPaymentTermById(
    newTerm.billingSchedulePaymentTermsId,
  );
}

/**
 * Delete a payment term by ID
 */
export async function deleteBillingSchedulePaymentTerm(
  billingSchedulePaymentTermsId,
) {
  if (!billingSchedulePaymentTermsId) {
    throw httpError("billingSchedulePaymentTermsId is required", 400);
  }

  const term = await repoPaymentTerms.findPaymentTermById(
    billingSchedulePaymentTermsId,
  );
  if (!term) {
    throw httpError(
      `Billing schedule payment term with ID ${billingSchedulePaymentTermsId} not found`,
      404,
    );
  }

  await repoPaymentTerms.deletePaymentTerm(billingSchedulePaymentTermsId);
  return { billingSchedulePaymentTermsId };
}

function formatCurrency(val) {
  const num = toMoneyNumber(val || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

const STANDARD_PAYMENT_TERMS = [
  {
    installment: 1,
    name: "Full Payment",
    structureLabel: "100%",
    dueScheduleLabel: "+15 days",
    splits: [{ installmentNumber: 1, percentage: 100, dueDays: "+15 days" }],
  },
  {
    installment: 2,
    name: "2 Instalments",
    structureLabel: "50% · 50%",
    dueScheduleLabel: "+15 days · +45 days",
    splits: [
      { installmentNumber: 1, percentage: 50, dueDays: "+15 days" },
      { installmentNumber: 2, percentage: 50, dueDays: "+45 days" },
    ],
  },
  {
    installment: 3,
    name: "3 Instalments",
    structureLabel: "34% · 33% · 33%",
    dueScheduleLabel: "+15 days · +45 days · +75 days",
    splits: [
      { installmentNumber: 1, percentage: 34, dueDays: "+15 days" },
      { installmentNumber: 2, percentage: 33, dueDays: "+45 days" },
      { installmentNumber: 3, percentage: 33, dueDays: "+75 days" },
    ],
  },
  {
    installment: 4,
    name: "4 Instalments",
    structureLabel: "25% · 25% · 25% · 25%",
    dueScheduleLabel: "+15 days · +45 days · +75 days · +105 days",
    splits: [
      { installmentNumber: 1, percentage: 25, dueDays: "+15 days" },
      { installmentNumber: 2, percentage: 25, dueDays: "+45 days" },
      { installmentNumber: 3, percentage: 25, dueDays: "+75 days" },
      { installmentNumber: 4, percentage: 25, dueDays: "+105 days" },
    ],
  },
];

function buildPaymentTermsForSchedule(scheduleAmount, savedPaymentTerms = []) {
  const savedInstallmentMap = new Map();
  for (const pt of savedPaymentTerms || []) {
    const plainPt = pt?.get ? pt.get({ plain: true }) : pt;
    const inst = Number(plainPt.installment);
    if (inst) {
      savedInstallmentMap.set(inst, plainPt);
    }
  }

  const hasAnySaved = savedInstallmentMap.size > 0;

  return STANDARD_PAYMENT_TERMS.map((standard) => {
    const isSaved = savedInstallmentMap.has(standard.installment);
    const isEnabled = hasAnySaved ? isSaved : standard.installment === 1;
    const isDefault = standard.installment === 1;
    const savedRecord = savedInstallmentMap.get(standard.installment) || null;

    const splitInstallments = standard.splits.map((split) => {
      const splitAmount = toMoneyNumber(
        (scheduleAmount * split.percentage) / 100
      );
      return {
        installmentNumber: split.installmentNumber,
        percentage: `${split.percentage}%`,
        amount: splitAmount,
        amountFormatted: formatCurrency(splitAmount),
        dueSchedule: split.dueDays,
      };
    });

    return {
      billingSchedulePaymentTermsId: savedRecord?.billingSchedulePaymentTermsId || null,
      paymentTerm: standard.name,
      installment: standard.installment,
      paymentStructure: standard.structureLabel,
      dueSchedule: standard.dueScheduleLabel,
      isDefault,
      isEnabled,
      installments: splitInstallments,
    };
  });
}

/**
 * Review billing schedule screen data (as per Review Billing Schedule UI).
 */
export async function getBillingScheduleReview(queryParams = {}, user = {}) {
  const { feePlanItemId, billingScheduleItemId, batchId, year } = queryParams;

  if (!feePlanItemId && !billingScheduleItemId && !batchId) {
    throw httpError(
      "At least one of feePlanItemId, billingScheduleItemId, or batchId is required",
      400
    );
  }

  const data = await repo.findBillingScheduleReviewData({
    feePlanItemId,
    billingScheduleItemId,
    batchId,
    year,
  });

  const { feePlanItems } = data;
  if (!feePlanItems || feePlanItems.length === 0) {
    throw httpError("No fee plan or billing schedule found for the specified criteria", 404);
  }

  const primaryItem = feePlanItems[0]?.get ? feePlanItems[0].get({ plain: true }) : feePlanItems[0];
  const batch = primaryItem.batch || {};
  const session = batch.session || {};
  const course = session.course || {};

  const resolvedYear = data.targetYear || primaryItem.year || 1;
  const batchYear = Number(batch.batch) || null;
  const courseDuration = Number(course.courseDuration) || 0;
  const endYear = batchYear && courseDuration ? batchYear + courseDuration : null;
  const admissionBatch = batchYear
    ? endYear
      ? `${batchYear}–${String(endYear).slice(-2)}`
      : `${batchYear}`
    : "";

  const calendarYear = batchYear ? batchYear + (resolvedYear - 1) : null;
  const academicYearText = calendarYear
    ? `${calendarYear}–${String(calendarYear + 1).slice(-2)}`
    : "";
  const academicYearLabel = academicYearText ? `AY ${academicYearText}` : "";

  let totalFeePlan = 0;
  for (const rawItem of feePlanItems) {
    const item = rawItem?.get ? rawItem.get({ plain: true }) : rawItem;
    for (const sub of item.feePlanSubItems || []) {
      totalFeePlan = decimalAdd(totalFeePlan, toMoneyNumber(sub.amount));
    }
  }

  const billingPeriods = [];
  const paymentTermsPeriods = [];
  let totalAllocated = 0;

  for (let idx = 0; idx < feePlanItems.length; idx++) {
    const rawItem = feePlanItems[idx];
    const item = rawItem?.get ? rawItem.get({ plain: true }) : rawItem;
    const periodName = item.academicPeriod || item.name || `Period ${idx + 1}`;
    const academicPeriodText = academicYearLabel
      ? `${periodName} · ${academicYearLabel}`
      : periodName;

    const schedules = item.billingScheduleItems || [];

    for (const schedule of schedules) {
      const scheduleAmount = toMoneyNumber(schedule.amount);
      totalAllocated = decimalAdd(totalAllocated, scheduleAmount);

      const subLines = (schedule.subItems || []).map((sub) => {
        const planSub = sub.feePlanSubItem || {};
        const catalog = planSub.feeTypeCatalog || {};
        const subAmount = toMoneyNumber(sub.amount);
        return {
          billingScheduleSubItemId: sub.billingScheduleSubItemId,
          feePlanSubItemId: sub.feePlanSubItemId,
          feeTypeCatalogId: catalog.feeTypeCatalogId || planSub.feeTypeId,
          feeTypeName: catalog.name || null,
          ledgerType: catalog.ledgerType || null,
          refundable: catalog.refundable || null,
          amount: subAmount,
          amountFormatted: formatCurrency(subAmount),
          isMainSubItem: planSub.isMainSubItem === true || planSub.isMainSubItem === 1,
        };
      });

      billingPeriods.push({
        billingScheduleItemId: schedule.billingScheduleItemId,
        feePlanItemId: item.feePlanItemId,
        academicPeriod: academicPeriodText,
        periodName,
        plannedBillingDate: formatDisplayDate(schedule.plannedDate),
        plannedDate: schedule.plannedDate,
        dueDate: schedule.dueDate,
        dueDateFormatted: formatDisplayDate(schedule.dueDate),
        feeAmount: scheduleAmount,
        feeAmountFormatted: formatCurrency(scheduleAmount),
        status: schedule.status || "pending",
        subItemsCount: subLines.length,
        subItems: subLines,
      });

      const cardTitle = `${periodName} · ${formatCurrency(scheduleAmount)}`;
      const cardSubtitleParts = [];
      if (academicYearLabel) cardSubtitleParts.push(academicYearLabel);
      if (schedule.plannedDate) {
        cardSubtitleParts.push(`${formatDisplayDate(schedule.plannedDate)} (Planned Billing Date)`);
      }
      const cardSubtitle = cardSubtitleParts.join(" · ");

      paymentTermsPeriods.push({
        billingScheduleItemId: schedule.billingScheduleItemId,
        feePlanItemId: item.feePlanItemId,
        title: cardTitle,
        subtitle: cardSubtitle,
        periodName,
        amount: scheduleAmount,
        amountFormatted: formatCurrency(scheduleAmount),
        plannedDate: schedule.plannedDate,
        terms: buildPaymentTermsForSchedule(scheduleAmount, schedule.paymentTerms),
      });
    }
  }

  const difference = decimalSubtract(totalAllocated, totalFeePlan);
  const isMatched = difference === 0;

  const amountsFormatted = billingPeriods.map((p) => p.feeAmountFormatted);
  const summaryCalculation =
    amountsFormatted.length > 1
      ? `${amountsFormatted.join(" + ")} = ${formatCurrency(totalAllocated)}`
      : amountsFormatted.length === 1
      ? `${amountsFormatted[0]} = ${formatCurrency(totalAllocated)}`
      : formatCurrency(totalAllocated);

  const matchMessage = isMatched
    ? `Total scheduled amount matches the Year ${resolvedYear} Fee Plan.`
    : `Total scheduled amount differs by ${formatCurrency(Math.abs(difference))} from the Year ${resolvedYear} Fee Plan.`;

  const termType = course.termType || "Semester";
  const billingPeriodsCount = billingPeriods.length;
  const billingPeriodsLabel = `${billingPeriodsCount} ${
    billingPeriodsCount === 1 ? termType : termType + "s"
  }`;

  return {
    title: "Review Billing Schedule",
    subtitle: `Review the Year ${resolvedYear} billing schedule and payment terms before publishing.`,
    academicContext: {
      batchId: Number(batch.batchId) || null,
      batchYear,
      admissionBatch,
      year: resolvedYear,
      academicYear: academicYearText,
      academicYearLabel,
      courseId: course.courseId || null,
      courseName: course.courseName || null,
      courseCode: course.courseCode || null,
      termType,
    },
    summary: {
      billingMethod: "Academic Period",
      billingPeriodsCount,
      billingPeriodsLabel,
      totalFeePlan,
      totalFeePlanFormatted: formatCurrency(totalFeePlan),
      allocated: totalAllocated,
      allocatedFormatted: formatCurrency(totalAllocated),
      difference,
      differenceFormatted: formatCurrency(difference),
      isMatched,
      matchMessage,
      summaryCalculation,
    },
    billingPeriods,
    paymentTerms: paymentTermsPeriods,
    publishInfo: [
      `This schedule becomes the active Year ${resolvedYear} Billing Schedule.`,
      "Billing periods will become available for Billing Runs according to their Planned Billing Dates.",
      "Students can use the enabled Payment Terms for each billing period. If no student-specific Payment Arrangement has been confirmed, the Default Payment Term will apply.",
    ],
  };
}

function buildYearWiseData(feePlanItems = [], course = {}, batchYear, currentYear) {
  const duration = Number(course?.courseDuration) || 0;
  const planByYear = new Map();

  for (const item of feePlanItems) {
    if (item.year) planByYear.set(Number(item.year), item);
  }

  const years = [];
  for (let y = 1; y <= duration; y++) {
    const feePlanItem = planByYear.get(y) || null;
    const schedules = feePlanItem?.billingScheduleItems || [];

    const activeSchedule =
      schedules.find((s) => s.plannedDate && s.status !== "billed" && s.status !== "cancelled") ||
      schedules[0] ||
      null;

    const plannedDate = activeSchedule?.plannedDate || null;
    const amount = activeSchedule?.amount != null ? Number(activeSchedule.amount) : 0;

    const status = !feePlanItem
      ? "Fee Plan Required"
      : schedules.length === 0
        ? "Setup Required"
        : "Published";

    years.push({
      year: y,
      yearLabel: `Year ${y}`,
      isCurrent: y === currentYear,
      academicYear: `${batchYear + y - 1}-${String(batchYear + y).slice(-2)}`,
      semesters: buildCurrentTermsForYear(course, y),
      feePlanItemName: feePlanItem?.name || null,
      feePlanItemId: feePlanItem?.feePlanItemId || null,
      status,
      plannedDate,
      nextBilling: plannedDate,
      amount,
      billingSchedule: schedules.length,
    });
  }

  return years;
}

/**
 * Get all batches grouped course-wise for billing schedule,
 * with active year, semesters, fee plan name, status, next billing,
 * course & session data.
 */
export async function getBillingScheduleBatches(queryParams = {}) {
  if (queryParams.batchId) {
    return getBillingScheduleBatchOverview(queryParams);
  }

  const [academicCtx, batchRows] = await Promise.all([
    resolveActiveAcademicYearContext(),
    repo.findBillingScheduleBatchesOverview(queryParams),
  ]);

  const activeCalendarYear = Number(academicCtx.activeBatchYear);
  const search = queryParams.search ? String(queryParams.search).trim().toLowerCase() : "";
  const statusFilter = queryParams.status ? String(queryParams.status).trim().toLowerCase() : "";

  const summary = {
    totalBatches: 0,
    published: 0,
    setupRequired: 0,
    feePlanRequired: 0,
  };
  const groupMap = new Map();

  for (const row of batchRows) {
    const plain = row.get ? row.get({ plain: true }) : row;
    const { session, feePlanItems = [] } = plain;
    const course = session?.course || {};
    const batchYear = Number(plain.batch);

    const { currentYear, currentTerms } = resolveBatchCurrentPosition({
      batchYear,
      course,
      activeCalendarYear,
    });

    const years = buildYearWiseData(feePlanItems, course, batchYear, currentYear);
    const activeYearData = years.find((y) => y.isCurrent) || years[0] || null;

    const status = activeYearData?.status || "Fee Plan Required";
    const feePlanItemName = activeYearData?.feePlanItemName || null;
    const nextBilling = activeYearData?.nextBilling || null;
    const billingSchedule = activeYearData?.billingSchedule || 0;

    if (statusFilter && status.toLowerCase() !== statusFilter) continue;

    if (search) {
      const text = `${course.courseName} ${course.courseCode} ${session?.sessionName} ${batchYear} ${feePlanItemName} ${status}`.toLowerCase();
      if (!text.includes(search)) continue;
    }

    summary.totalBatches += 1;
    if (status === "Published") summary.published += 1;
    else if (status === "Setup Required") summary.setupRequired += 1;
    else if (status === "Fee Plan Required") summary.feePlanRequired += 1;

    const groupKey = `${course.courseId}_${session?.sessionId}`;
    let group = groupMap.get(groupKey);
    if (!group) {
      group = {
        courseId: course.courseId,
        courseName: course.courseName,
        courseCode: course.courseCode,
        courseDuration: Number(course.courseDuration) || null,
        termType: course.termType,
        sessionId: session?.sessionId,
        sessionName: session?.sessionName,
        batches: [],
      };
      groupMap.set(groupKey, group);
    }

    group.batches.push({
      batchId: Number(plain.batchId),
      batch: batchYear,
      currentYear,
      semesters: currentTerms,
      studentCount: Number(plain.studentCount) || 0,
      feePlanItemName,
      status,
      nextBilling,
      billingSchedule,
      course: {
        courseId: course.courseId,
        courseName: course.courseName,
        courseCode: course.courseCode,
        courseDuration: Number(course.courseDuration) || null,
        termType: course.termType,
        totalTerms: course.totalTerms,
      },
      session: {
        sessionId: session?.sessionId,
        sessionName: session?.sessionName,
      },
    });
  }

  return {
    activeCalendarYear,
    summary,
    groups: Array.from(groupMap.values()),
  };
}

/**
 * Get batch overview with year-by-year breakdown by query key batchId.
 * @param {Object} queryParams - { batchId }
 */
export async function getBillingScheduleBatchOverview(queryParams = {}) {
  const batchId = Number(queryParams.batchId);
  if (!batchId) {
    throw httpError("batchId query parameter is required", 400);
  }

  // Fast path for year filter - direct extraction without normalisation overhead
  if (queryParams.year) {
    const year = Number(queryParams.year);
    const [row] = await repo.findBillingScheduleBatchesOverview({ batchId });
    if (!row) throw httpError(`Batch with ID ${batchId} not found`, 404);

    const plain = row.get ? row.get({ plain: true }) : row;
    const feePlanItem = (plain.feePlanItems || []).find((f) => Number(f.year) === year);
    const schedule = feePlanItem?.billingScheduleItems?.[0];

    return {
      batchId,
      batchYear: Number(plain.batch),
      courseName: plain.session?.course?.courseName || null,
      sessionName: plain.session?.sessionName || null,
      year,
      feePlanItemName: feePlanItem?.name || null,
      feePlanItemId: feePlanItem?.feePlanItemId || null,
      plannedDate: schedule?.plannedDate || null,
      amount: schedule ? Number(schedule.amount) : 0,
      status: !feePlanItem ? "Fee Plan Required" : !schedule ? "Setup Required" : "Published",
    };
  }

  const [academicCtx, batchRows] = await Promise.all([
    resolveActiveAcademicYearContext(),
    repo.findBillingScheduleBatchesOverview({ batchId }),
  ]);

  if (!batchRows || batchRows.length === 0) {
    throw httpError(`Batch with ID ${batchId} not found`, 404);
  }

  const activeCalendarYear = Number(academicCtx.activeBatchYear);
  const plain = batchRows[0].get ? batchRows[0].get({ plain: true }) : batchRows[0];
  const { session, feePlanItems = [] } = plain;
  const course = session?.course || {};
  const batchYear = Number(plain.batch);

  const { currentYear, currentTerms } = resolveBatchCurrentPosition({
    batchYear,
    course,
    activeCalendarYear,
  });

  const years = buildYearWiseData(feePlanItems, course, batchYear, currentYear);
  const activeYearData = years.find((y) => y.isCurrent) || years[0] || null;
  const duration = Number(course.courseDuration) || 0;

  return {
    batchId,
    batch: batchYear,
    batchName: String(plain.batch),
    startYear: batchYear,
    endYear: batchYear + duration,
    studentCount: Number(plain.studentCount) || 0,
    currentYear,
    currentYearLabel: currentYear ? `Year ${currentYear}` : null,
    currentAcademicYear: currentYear
      ? `${batchYear + currentYear - 1}-${String(batchYear + currentYear).slice(-2)}`
      : null,
    semesters: currentTerms,
    feePlanItemName: activeYearData?.feePlanItemName || null,
    status: activeYearData?.status || "Fee Plan Required",
    nextBilling: activeYearData?.nextBilling || null,
    billingSchedule: activeYearData?.billingSchedule || 0,
    course: {
      courseId: course.courseId,
      courseName: course.courseName,
      courseCode: course.courseCode,
      courseDuration: course.courseDuration,
      termType: course.termType,
      totalTerms: course.totalTerms,
    },
    session: session
      ? {
          sessionId: session.sessionId,
          sessionName: session.sessionName,
        }
      : null,
    years,
  };
}

/**
 * Detailed view of a single billing schedule item.
 */
export async function getBillingScheduleView(billingScheduleItemId) {
  if (!billingScheduleItemId) {
    throw httpError("billingScheduleItemId is required", 400);
  }

  const rawItem = await repo.findBillingScheduleItemById(billingScheduleItemId);
  if (!rawItem) {
    throw httpError(
      `Billing schedule item with ID ${billingScheduleItemId} not found`,
      404
    );
  }

  const item = typeof rawItem.get === "function" ? rawItem.get({ plain: true }) : rawItem;
  const plan = item.feePlanItem || {};
  const batch = plan.batch || {};
  const session = batch.session || {};
  const course = session.course || {};

  const scheduleAmount = toMoneyNumber(item.amount);

  const subLines = (item.subItems || []).map((sub) => {
    const planSub = sub.feePlanSubItem || {};
    const catalog = planSub.feeTypeCatalog || {};
    const subAmount = toMoneyNumber(sub.amount);
    return {
      billingScheduleSubItemId: sub.billingScheduleSubItemId,
      feePlanSubItemId: sub.feePlanSubItemId,
      feeTypeCatalogId: catalog.feeTypeCatalogId || planSub.feeTypeId,
      feeTypeName: catalog.name || null,
      ledgerType: catalog.ledgerType || null,
      refundable: catalog.refundable || null,
      amount: subAmount,
      amountFormatted: formatCurrency(subAmount),
      isMainSubItem: planSub.isMainSubItem === true || planSub.isMainSubItem === 1,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
    };
  });

  const batchYear = Number(batch.batch) || null;
  const courseDuration = Number(course.courseDuration) || 0;
  const endYear = batchYear && courseDuration ? batchYear + courseDuration : null;
  const admissionBatch = batchYear
    ? endYear
      ? `${batchYear}–${String(endYear).slice(-2)}`
      : `${batchYear}`
    : "";

  const yearNum = plan.year != null ? Number(plan.year) : 1;
  const calendarYear = batchYear ? batchYear + (yearNum - 1) : null;
  const academicYearText = calendarYear
    ? `${calendarYear}–${String(calendarYear + 1).slice(-2)}`
    : "";

  const paymentOptions = buildPaymentTermsForSchedule(
    scheduleAmount,
    item.paymentTerms
  );

  return {
    billingScheduleItemId: item.billingScheduleItemId,
    feePlanItemId: item.feePlanItemId,
    amount: scheduleAmount,
    amountFormatted: formatCurrency(scheduleAmount),
    plannedDate: item.plannedDate,
    plannedDateFormatted: formatDisplayDate(item.plannedDate),
    dueDate: item.dueDate,
    dueDateFormatted: formatDisplayDate(item.dueDate),
    status: item.status || "pending",
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    feePlanItem: {
      feePlanItemId: plan.feePlanItemId,
      name: plan.name,
      academicPeriod: plan.academicPeriod,
      year: plan.year,
      createDate: plan.createDate,
      dueDate: plan.dueDate,
      publishStatus: plan.publishStatus,
    },
    academicContext: {
      batchId: Number(batch.batchId) || null,
      batchYear,
      admissionBatch,
      year: yearNum,
      academicYear: academicYearText,
      academicYearLabel: academicYearText ? `AY ${academicYearText}` : "",
      courseId: course.courseId || null,
      courseName: course.courseName || null,
      courseCode: course.courseCode || null,
      termType: course.termType || "Semester",
      sessionName: session.sessionName || null,
    },
    subItems: subLines,
    paymentTerms: item.paymentTerms || [],
    paymentOptionsMatrix: paymentOptions,
  };
}

/**
 * Get detailed billing schedule review data for a batch and year.
 * Returns schedule-wise amounts, plannedDates, subItems, and fee plan details.
 * @param {Object} queryParams - { batchId, year }
 */
export async function getBillingScheduleBatchReview(queryParams = {}) {
  const batchId = Number(queryParams.batchId);
  const year = Number(queryParams.year);
  if (!batchId || !year) {
    throw httpError("batchId and year query parameters are required", 400);
  }

  const { batch, feePlanItem } = await repo.findBatchReviewData(batchId, year);
  if (!batch) {
    throw httpError(`Batch with ID ${batchId} not found`, 404);
  }

  const plainBatch = batch.get ? batch.get({ plain: true }) : batch;
  const course = plainBatch.session?.course || {};
  const plainPlan = feePlanItem?.get ? feePlanItem.get({ plain: true }) : feePlanItem;

  // Index sub-items for fast fee name lookup
  const feeSubMap = new Map();
  const feePlanSubItems = (plainPlan?.feePlanSubItems || []).map((sub) => {
    const item = {
      feePlanSubitemId: sub.feePlanSubitemId,
      feeTypeId: sub.feeTypeId,
      feeTypeName: sub.feeTypeCatalog?.name || null,
      amount: Number(sub.amount || 0),
      isMainSubItem: Boolean(sub.isMainSubItem),
    };
    feeSubMap.set(sub.feePlanSubitemId, item.feeTypeName);
    return item;
  });

  let totalAmount = 0;
  const schedules = (plainPlan?.billingScheduleItems || []).map((s) => {
    const scheduleAmount = Number(s.amount || 0);
    totalAmount += scheduleAmount;

    const paymentTerms = (s.paymentTerms || [])
      .map((pt) => ({
        billingSchedulePaymentTermsId: pt.billingSchedulePaymentTermsId,
        billingScheduleItemId: pt.billingScheduleItemId || s.billingScheduleItemId,
        installment: Number(pt.installment),
      }))
      .sort((a, b) => a.installment - b.installment);

    return {
      billingScheduleItemId: s.billingScheduleItemId,
      feePlanItemId: s.feePlanItemId,
      amount: scheduleAmount,
      plannedDate: s.plannedDate || null,
      status: s.status,
      installment: paymentTerms.length > 0 ? paymentTerms[0].installment : null,
      scheduleItems: (s.subItems || []).map((sub) => ({
        billingScheduleSubItemId: sub.billingScheduleSubItemId,
        feePlanSubItemId: sub.feePlanSubItemId,
        feeTypeName: feeSubMap.get(sub.feePlanSubItemId) || null,
        amount: Number(sub.amount || 0),
      })),
      paymentTerms,
    };
  });

  const status = !plainPlan
    ? "Fee Plan Required"
    : schedules.length === 0
      ? "Setup Required"
      : "Published";

  return {
    batchId,
    batchYear: Number(plainBatch.batch),
    courseName: course.courseName || null,
    courseCode: course.courseCode || null,
    sessionName: plainBatch.session?.sessionName || null,
    year,
    status,
    amount: totalAmount,
    feePlanItem: plainPlan
      ? {
          feePlanItemId: plainPlan.feePlanItemId,
          name: plainPlan.name,
          createDate: plainPlan.createDate || null,
          publishStatus: plainPlan.publishStatus,
          subItems: feePlanSubItems,
        }
      : null,
    schedules,
  };
}
