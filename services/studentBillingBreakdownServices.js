import * as repo from "../repository/studentBillingBreakdownRepository.js";
import {
  decimalAdd,
  decimalMultiply,
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

function formatStudentFullName(student) {
  if (!student) return "";
  return [student.firstName, student.middleName, student.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
}

/**
 * Calculate applied discounts / additional charges for a student based on:
 * 1. Existing invoice waivers (if invoice exists)
 * 2. Active batch policies (from feePolicyBatchesModel)
 * 3. Student-specific policies (from feePolicyStudentsModel)
 */
function calculateTreatmentsForStudent(
  student,
  { baseComponents, batchPolicies, studentPoliciesMap, existingInvoice }
) {
  const treatments = [];
  let totalDiscount = 0;
  let totalAddCharge = 0;

  // 1. If invoice already exists with invoice items and explicit waivers
  const invoiceItems =
    existingInvoice?.feeInvoiceItems || existingInvoice?.studentFeeInvoiceItems || [];
  if (Array.isArray(invoiceItems) && invoiceItems.length > 0) {
    for (const item of invoiceItems) {
      const waiver = toMoneyNumber(item.waiver || 0);
      if (waiver > 0) {
        const catName = item.feeTypeCatalog?.name || "Fee Component";
        treatments.push({
          policyId: null,
          name: `Waiver (${catName})`,
          rule: null,
          effect: "reduce_fee",
          amount: -waiver,
        });
        totalDiscount = decimalAdd(totalDiscount, waiver);
      }
    }
  }

  // 2. Combine batch policies and student-specific policies
  if (!treatments.length) {
    const studentPolicies = studentPoliciesMap.get(Number(student.studentId)) || [];
    const policyMap = new Map();

    for (const p of batchPolicies) {
      if (p && p.feePolicyId) {
        policyMap.set(Number(p.feePolicyId), p);
      }
    }
    for (const p of studentPolicies) {
      if (p && p.feePolicyId) {
        policyMap.set(Number(p.feePolicyId), p);
      }
    }

    for (const policy of policyMap.values()) {
      const effect = policy.effect; // "reduce_fee" | "add_charge" | "refund"
      if (effect !== "reduce_fee" && effect !== "add_charge") continue;

      let policyAmount = 0;
      let ruleDesc = policy.description || null;

      // Identify target components
      let targetComponents = [];
      if (policy.appliesTo === "selected_components") {
        const catalogIds = (policy.policyComponents || []).map((pc) =>
          Number(pc.feeTypeCatalogId)
        );
        targetComponents = baseComponents.filter((c) =>
          catalogIds.includes(Number(c.feeTypeCatalogId))
        );
      } else {
        targetComponents = baseComponents;
      }

      if (!targetComponents.length && policy.appliesTo === "selected_components") {
        continue;
      }

      const targetTotalAmount = decimalSum(targetComponents.map((c) => c.amount));

      if (policy.calculationType === "percentage") {
        const rate = Number(policy.percentageRate) || 0;
        policyAmount = toMoneyNumber((targetTotalAmount * rate) / 100);
        const compNames = targetComponents.map((c) => c.name).join(", ");
        ruleDesc = `${rate}% of ${compNames || "Components"}`;
      } else if (policy.calculationType === "fixed_amount") {
        policyAmount = toMoneyNumber(policy.fixedAmount || 0);
      }

      // Check max cap if defined
      if (policy.maxCapAmount != null && policy.maxCapAmount > 0) {
        const cap = toMoneyNumber(policy.maxCapAmount);
        if (policyAmount > cap) {
          policyAmount = cap;
        }
      }

      if (policyAmount > 0) {
        if (effect === "reduce_fee") {
          treatments.push({
            policyId: policy.feePolicyId,
            name: policy.policyName,
            rule: ruleDesc,
            effect: "reduce_fee",
            amount: -policyAmount,
          });
          totalDiscount = decimalAdd(totalDiscount, policyAmount);
        } else if (effect === "add_charge") {
          treatments.push({
            policyId: policy.feePolicyId,
            name: policy.policyName,
            rule: ruleDesc,
            effect: "add_charge",
            amount: policyAmount,
          });
          totalAddCharge = decimalAdd(totalAddCharge, policyAmount);
        }
      }
    }
  }

  return {
    treatments,
    totalDiscount,
    totalAddCharge,
  };
}

/**
 * Service to calculate and return student fee breakdown and billing preview.
 * Anchored on billingScheduleItemsModel / billingScheduleSubItemsModel,
 * returning all students in the batch with applied policies from feePolicyBatchesModel & feePolicyStudentsModel.
 */
export async function getStudentBillingBreakdown(queryParams = {}, authUser = {}) {
  const {
    studentId,
    batchId,
    billingScheduleItemId,
    feePlanItemId,
    year,
    search,
  } = queryParams;

  let effectiveBillingScheduleItemId = billingScheduleItemId
    ? Number(billingScheduleItemId)
    : null;
  let effectiveFeePlanItemId = feePlanItemId ? Number(feePlanItemId) : null;

  if (!effectiveBillingScheduleItemId && !effectiveFeePlanItemId && !batchId && !studentId) {
    throw httpError("Either billingScheduleItemId or feePlanItemId is required", 400);
  }

  // 1. Fetch billing schedule item (primary) or fee plan item
  let schedule = null;
  let feePlanItem = null;

  if (effectiveBillingScheduleItemId) {
    const scheduleRow = await repo.findBillingScheduleItemWithDetails(
      effectiveBillingScheduleItemId
    );
    if (!scheduleRow) {
      throw httpError(
        `Billing schedule item with ID ${effectiveBillingScheduleItemId} not found`,
        404
      );
    }
    schedule = toPlain(scheduleRow);
    feePlanItem = schedule.feePlanItem || null;
    effectiveFeePlanItemId = schedule.feePlanItemId || effectiveFeePlanItemId;
  } else if (effectiveFeePlanItemId) {
    const feePlanItemRow = await repo.findFeePlanItemWithSubItems(effectiveFeePlanItemId);
    if (!feePlanItemRow) {
      throw httpError(`Fee plan item with ID ${effectiveFeePlanItemId} not found`, 404);
    }
    feePlanItem = toPlain(feePlanItemRow);
    const schedules = feePlanItem.billingScheduleItems || [];
    if (schedules.length > 0) {
      schedule = schedules[0];
      effectiveBillingScheduleItemId = schedule.billingScheduleItemId;
    }
  }

  // 2. Resolve target batch and year
  let targetBatchId = batchId ? Number(batchId) : feePlanItem?.batchId || null;
  const targetYear =
    year != null
      ? Number(year)
      : feePlanItem?.year != null
        ? Number(feePlanItem.year)
        : null;

  // If batchId is not known yet and studentId is provided, look up student's batch
  let singleStudentPrefetch = null;
  if (!targetBatchId && studentId) {
    const studentRow = await repo.findStudentById(studentId);
    if (!studentRow) {
      throw httpError(`Student with ID ${studentId} not found`, 404);
    }
    singleStudentPrefetch = toPlain(studentRow);
    targetBatchId = singleStudentPrefetch.batchId;
  }

  if (!targetBatchId) {
    throw httpError("Unable to determine batch for billing breakdown", 400);
  }

  // 3. Resolve Batch details
  let batch = feePlanItem?.batch || null;
  if (!batch && targetBatchId) {
    const batchRow = await repo.findBatchById(targetBatchId);
    batch = toPlain(batchRow);
  }

  // 4. Calculate Base Charges from billing schedule item (primary) or fee plan item
  let baseComponents = [];
  let standardFee = 0;

  if (schedule && Array.isArray(schedule.subItems) && schedule.subItems.length > 0) {
    baseComponents = schedule.subItems.map((sub) => {
      const planSub = sub.feePlanSubItem || {};
      const catalog = planSub.feeTypeCatalog || {};
      return {
        billingScheduleSubItemId: sub.billingScheduleSubItemId,
        feePlanSubItemId: sub.feePlanSubItemId,
        feeTypeCatalogId: catalog.feeTypeCatalogId || planSub.feeTypeId,
        name: catalog.name || "Fee Component",
        amount: toMoneyNumber(sub.amount),
        refundable: catalog.refundable === true || catalog.refundable === 1,
        isMainSubItem: planSub.isMainSubItem === true || planSub.isMainSubItem === 1,
      };
    });
    standardFee = toMoneyNumber(schedule.amount);
    if (!standardFee && baseComponents.length > 0) {
      standardFee = decimalSum(baseComponents.map((c) => c.amount));
    }
  } else if (schedule) {
    standardFee = toMoneyNumber(schedule.amount);
    const subItems = feePlanItem?.feePlanSubItems || [];
    baseComponents = subItems.map((sub) => {
      const catalog = sub.feeTypeCatalog || {};
      return {
        billingScheduleSubItemId: null,
        feePlanSubItemId: sub.feePlanSubitemId,
        feeTypeCatalogId: catalog.feeTypeCatalogId || sub.feeTypeId,
        name: catalog.name || "Fee Component",
        amount: toMoneyNumber(sub.amount),
        refundable: catalog.refundable === true || catalog.refundable === 1,
        isMainSubItem: sub.isMainSubItem === true || sub.isMainSubItem === 1,
      };
    });
    if (!standardFee && baseComponents.length > 0) {
      standardFee = decimalSum(baseComponents.map((c) => c.amount));
    }
  } else if (feePlanItem) {
    const subItems = feePlanItem?.feePlanSubItems || [];
    baseComponents = subItems.map((sub) => {
      const catalog = sub.feeTypeCatalog || {};
      return {
        billingScheduleSubItemId: null,
        feePlanSubItemId: sub.feePlanSubitemId,
        feeTypeCatalogId: catalog.feeTypeCatalogId || sub.feeTypeId,
        name: catalog.name || "Fee Component",
        amount: toMoneyNumber(sub.amount),
        refundable: catalog.refundable === true || catalog.refundable === 1,
        isMainSubItem: sub.isMainSubItem === true || sub.isMainSubItem === 1,
      };
    });
    standardFee = decimalSum(baseComponents.map((c) => c.amount));
  }

  // 5. Fetch students in the batch
  const studentRows = await repo.findStudentsByBatch({
    batchId: targetBatchId,
    studentId: studentId ? Number(studentId) : null,
    search,
  });
  const students = studentRows.map(toPlain);

  // If specific studentId was requested and not found in batch
  if (studentId && !students.length) {
    if (singleStudentPrefetch) {
      students.push(singleStudentPrefetch);
    } else {
      const sRow = await repo.findStudentById(studentId);
      if (sRow) {
        students.push(toPlain(sRow));
      } else {
        throw httpError(`Student with ID ${studentId} not found`, 404);
      }
    }
  }

  const studentIds = students.map((s) => Number(s.studentId));

  // 6. Fetch batch-level fee policies (feePolicyBatchesModel)
  const primaryCourseId = students[0]?.courseId || null;
  const batchPoliciesRows = await repo.findFeePoliciesForBatchAndYear({
    batchId: targetBatchId,
    courseId: primaryCourseId,
    year: targetYear,
    instituteId: schedule?.instituteId || feePlanItem?.instituteId || authUser?.instituteId,
  });
  const batchPolicies = batchPoliciesRows.map(toPlain);

  // 7. Fetch student-specific fee policies (feePolicyStudentsModel)
  const studentPolicyRows = await repo.findFeePoliciesForStudents(studentIds);
  const studentPoliciesMap = new Map();
  for (const row of studentPolicyRows) {
    const item = toPlain(row);
    const sid = Number(item.studentId);
    if (!studentPoliciesMap.has(sid)) {
      studentPoliciesMap.set(sid, []);
    }
    if (item.policy) {
      studentPoliciesMap.get(sid).push(item.policy);
    }
  }

  // 8. Fetch existing invoices for these students
  const invoiceRows = effectiveFeePlanItemId
    ? await repo.findInvoicesForPlanAndStudents({
        feePlanItemId: effectiveFeePlanItemId,
        studentIds,
      })
    : [];
  const invoiceByStudentId = new Map();
  for (const inv of invoiceRows) {
    const plainInv = toPlain(inv);
    invoiceByStudentId.set(Number(plainInv.studentId), plainInv);
  }

  // 9. Map and calculate breakdown for each student
  let totalRunDiscounts = 0;
  let totalRunAddCharges = 0;
  let totalRunNetBillable = 0;
  let billedCount = 0;

  const studentsList = students.map((student) => {
    const existingInvoice = invoiceByStudentId.get(Number(student.studentId)) || null;

    const { treatments, totalDiscount, totalAddCharge } = calculateTreatmentsForStudent(
      student,
      {
        baseComponents,
        batchPolicies,
        studentPoliciesMap,
        existingInvoice,
      }
    );

    let finalBillableAmount = decimalSubtract(standardFee, totalDiscount);
    if (totalAddCharge > 0) {
      finalBillableAmount = decimalAdd(finalBillableAmount, totalAddCharge);
    }
    if (finalBillableAmount < 0) {
      finalBillableAmount = 0;
    }

    let status = "Ready";
    let statusColor = "green";
    let isInvoiceRaised = false;

    if (existingInvoice) {
      isInvoiceRaised = true;
      billedCount += 1;
      status = existingInvoice.paymentStatus === "paid" ? "Paid" : "Billed";
      statusColor = existingInvoice.paymentStatus === "paid" ? "green" : "blue";
    } else if (schedule?.status === "billed") {
      status = "Billed";
      statusColor = "blue";
    } else if (schedule?.status === "pending" || schedule?.status === "scheduled") {
      status = "Ready";
      statusColor = "green";
    }

    totalRunDiscounts = decimalAdd(totalRunDiscounts, totalDiscount);
    totalRunAddCharges = decimalAdd(totalRunAddCharges, totalAddCharge);
    totalRunNetBillable = decimalAdd(totalRunNetBillable, finalBillableAmount);

    const course = student.course || {};
    const batchYear = batch?.batch ? Number(batch.batch) : null;
    const courseDuration = Number(course.courseDuration) || 0;
    const endYear = batchYear && courseDuration ? batchYear + courseDuration : null;
    const admissionBatch = batchYear
      ? endYear
        ? `${batchYear}–${String(endYear).slice(-2)}`
        : `${batchYear}`
      : "";

    const scholarNumber =
      student.scholarNumber || student.enrollNumber || student.admissionNumber || "";
    const studentName = formatStudentFullName(student);
    const courseName = course.courseName || "";
    const studentContext = [
      scholarNumber,
      [courseName, admissionBatch].filter(Boolean).join(" "),
    ]
      .filter(Boolean)
      .join(" · ");

    return {
      studentId: student.studentId,
      name: studentName,
      firstName: student.firstName,
      middleName: student.middleName,
      lastName: student.lastName,
      scholarNumber,
      enrollNumber: student.enrollNumber || null,
      admissionNumber: student.admissionNumber || null,
      batchId: student.batchId,
      courseId: student.courseId,
      courseName,
      batch: admissionBatch,
      context: studentContext,
      status,
      statusColor,
      isInvoiceRaised,
      standardFee,
      appliedTreatments: {
        title: "Applied Treatments",
        treatments,
        totalDiscount,
        totalAddCharge,
      },
      finalBillableAmount,
    };
  });

  // Batch header info
  const primaryCourse = students[0]?.course || {};
  const batchYear = batch?.batch ? Number(batch.batch) : null;
  const courseDuration = Number(primaryCourse.courseDuration) || 0;
  const endYear = batchYear && courseDuration ? batchYear + courseDuration : null;
  const admissionBatch = batchYear
    ? endYear
      ? `${batchYear}–${String(endYear).slice(-2)}`
      : `${batchYear}`
    : "";
  const courseName = primaryCourse.courseName || "";
  const batchContext = [
    courseName,
    admissionBatch,
    targetYear ? `Year ${targetYear}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const targetStudent = studentId
    ? studentsList.find((s) => Number(s.studentId) === Number(studentId)) ||
      studentsList[0] ||
      null
    : null;

  return {
    billingSchedule: schedule
      ? {
          billingScheduleItemId: effectiveBillingScheduleItemId,
          feePlanItemId: effectiveFeePlanItemId,
          plannedDate: schedule.plannedDate || null,
          status: schedule.status || "pending",
          amount: standardFee,
        }
      : null,
    batch: {
      batchId: targetBatchId,
      batch: batch?.batch || null,
      courseName,
      admissionBatch,
      context: batchContext,
      year: targetYear,
    },
    baseCharges: {
      title: schedule
        ? "Base Charges (from billing schedule)"
        : "Base Charges (from fee plan)",
      components: baseComponents,
      standardFee,
    },
    summary: {
      totalStudents: studentsList.length,
      standardFeePerStudent: standardFee,
      totalRunAmount: decimalMultiply(standardFee, studentsList.length),
      totalDiscounts: totalRunDiscounts,
      totalAddCharges: totalRunAddCharges,
      totalNetBillableAmount: totalRunNetBillable,
      billedStudentsCount: billedCount,
      pendingStudentsCount: studentsList.length - billedCount,
    },
    ...(targetStudent
      ? {
          student: {
            studentId: targetStudent.studentId,
            name: targetStudent.name,
            scholarNumber: targetStudent.scholarNumber,
            enrollNumber: targetStudent.enrollNumber,
            courseName: targetStudent.courseName,
            batch: targetStudent.batch,
            context: targetStudent.context,
            status: targetStudent.status,
            statusColor: targetStudent.statusColor,
            isInvoiceRaised: targetStudent.isInvoiceRaised,
          },
          appliedTreatments: targetStudent.appliedTreatments,
          finalBillableAmount: targetStudent.finalBillableAmount,
        }
      : {}),
    students: studentsList,
  };
}
