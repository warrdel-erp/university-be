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
 * Service to calculate and return student fee breakdown and billing preview.
 */
export async function getStudentBillingBreakdown({ studentId, feePlanItemId }, authUser = {}) {
  if (!studentId) {
    throw httpError("studentId is required", 400);
  }
  if (!feePlanItemId) {
    throw httpError("feePlanItemId is required", 400);
  }

  // 1. Fetch student
  const studentRow = await repo.findStudentById(studentId);
  if (!studentRow) {
    throw httpError(`Student with ID ${studentId} not found`, 404);
  }
  const student = toPlain(studentRow);

  // 2. Fetch fee plan item with sub-items
  const feePlanItemRow = await repo.findFeePlanItemWithSubItems(feePlanItemId);
  if (!feePlanItemRow) {
    throw httpError(`Fee plan item with ID ${feePlanItemId} not found`, 404);
  }
  const feePlanItem = toPlain(feePlanItemRow);

  // 3. Resolve Batch & Course details
  const targetBatchId = feePlanItem.batchId || student.batchId;
  let batch = feePlanItem.batch;
  if (!batch && targetBatchId) {
    const batchRow = await repo.findBatchById(targetBatchId);
    batch = toPlain(batchRow);
  }

  const course = student.course || {};
  const batchYear = batch?.batch ? Number(batch.batch) : null;
  const courseDuration = Number(course.courseDuration) || 0;
  const endYear = batchYear && courseDuration ? batchYear + courseDuration : null;
  const admissionBatch = batchYear
    ? endYear
      ? `${batchYear}–${String(endYear).slice(-2)}`
      : `${batchYear}`
    : "";

  const scholarNumber = student.scholarNumber || student.enrollNumber || student.admissionNumber || "";
  const studentName = formatStudentFullName(student);
  const courseName = course.courseName || "";
  const context = [scholarNumber, [courseName, admissionBatch].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(" · ");

  // 4. Check for existing invoice
  const existingInvoiceRow = await repo.findExistingInvoiceForStudentAndPlan({
    studentId,
    feePlanItemId,
  });
  const existingInvoice = toPlain(existingInvoiceRow);

  // 5. Determine UI Status Badge
  let status = "Draft";
  let statusColor = "gray";
  if (existingInvoice) {
    status = existingInvoice.paymentStatus === "paid" ? "Paid" : "Billed";
    statusColor = existingInvoice.paymentStatus === "paid" ? "green" : "blue";
  } else if (feePlanItem.publishStatus === "published") {
    status = "Ready";
    statusColor = "green";
  }

  // 6. Calculate Base Charges
  const subItems = feePlanItem.feePlanSubItems || [];
  const baseComponents = subItems.map((sub) => {
    const catalog = sub.feeTypeCatalog || {};
    return {
      feePlanSubitemId: sub.feePlanSubitemId,
      feeTypeCatalogId: catalog.feeTypeCatalogId || sub.feeTypeId,
      name: catalog.name || "Fee Component",
      amount: toMoneyNumber(sub.amount),
      refundable: catalog.refundable === true || catalog.refundable === 1,
      isMainSubItem: sub.isMainSubItem === true || sub.isMainSubItem === 1,
    };
  });

  const standardFee = decimalSum(baseComponents.map((c) => c.amount));

  // Map components by catalog ID for policy lookup
  const componentByCatalogId = new Map();
  for (const comp of baseComponents) {
    componentByCatalogId.set(Number(comp.feeTypeCatalogId), comp);
  }

  // 7. Calculate Applied Treatments (Fee Policies & Waivers)
  const treatments = [];
  let totalDiscount = 0;
  let totalAddCharge = 0;

  // If invoice already exists with invoice items and explicit waivers
  const invoiceItems = existingInvoice?.feeInvoiceItems || existingInvoice?.studentFeeInvoiceItems || [];
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

  // Fetch active fee policies for this batch and year (if not already fully populated by invoice)
  if (!treatments.length && targetBatchId) {
    const policies = await repo.findFeePoliciesForBatchAndYear({
      batchId: targetBatchId,
      year: feePlanItem.year,
      instituteId: feePlanItem.instituteId || student.instituteId,
    });

    for (const policyRow of policies) {
      const policy = toPlain(policyRow);
      const effect = policy.effect; // "reduce_fee" | "add_charge" | "refund"
      if (effect !== "reduce_fee" && effect !== "add_charge") continue;

      let policyAmount = 0;
      let ruleDesc = policy.description || null;

      // Identify target components
      let targetComponents = [];
      if (policy.appliesTo === "selected_components") {
        const catalogIds = (policy.policyComponents || []).map((pc) => Number(pc.feeTypeCatalogId));
        targetComponents = baseComponents.filter((c) => catalogIds.includes(Number(c.feeTypeCatalogId)));
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

  // 8. Calculate Final Billable Amount
  let finalBillableAmount = decimalSubtract(standardFee, totalDiscount);
  if (totalAddCharge > 0) {
    finalBillableAmount = decimalAdd(finalBillableAmount, totalAddCharge);
  }
  if (finalBillableAmount < 0) {
    finalBillableAmount = 0;
  }

  // 9. Format response exactly matching the UI layout
  return {
    student: {
      studentId: student.studentId,
      name: studentName,
      scholarNumber,
      enrollNumber: student.enrollNumber || null,
      courseName,
      batch: admissionBatch,
      context,
      status,
      statusColor,
    },
    baseCharges: {
      title: "Base Charges (from fee plan)",
      components: baseComponents,
      standardFee,
    },
    appliedTreatments: {
      title: "Applied Treatments",
      treatments,
      totalDiscount,
      totalAddCharge,
    },
    finalBillableAmount,
  };
}

