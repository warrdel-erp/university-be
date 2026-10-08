import sequelize from "../database/sequelizeConfig.js";
import * as feePolicyRepo from "../repository/feePolicyRepository.js";
import * as feeTypeCatalogRepo from "../repository/feeTypeCatalogRepository.js";
import {
  decimalAdd,
  decimalSubtract,
  decimalSum,
  toMoneyNumber,
} from "../utility/decimalMoney.js";

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

export function groupPolicyBatchesToCourses(policyBatches = []) {
  const courseMap = new Map();

  for (const pb of policyBatches) {
    if (!pb) continue;
    const courseId = pb.courseId || pb.course?.courseId;
    if (!courseId) continue;

    if (!courseMap.has(courseId)) {
      courseMap.set(courseId, {
        courseId,
        courseName: pb.course?.courseName || null,
        courseCode: pb.course?.courseCode || null,
        yearsMap: new Map(),
      });
    }

    const cEntry = courseMap.get(courseId);
    if (pb.year != null) {
      if (!cEntry.yearsMap.has(pb.year)) {
        cEntry.yearsMap.set(pb.year, new Set());
      }
      if (pb.term != null) {
        cEntry.yearsMap.get(pb.year).add(pb.term);
      }
    }
  }

  const courses = [];
  for (const c of courseMap.values()) {
    const years = [];
    for (const [year, termSet] of c.yearsMap.entries()) {
      years.push({
        year,
        terms: Array.from(termSet).sort((a, b) => a - b),
      });
    }
    years.sort((a, b) => a.year - b.year);
    courses.push({
      courseId: c.courseId,
      courseName: c.courseName,
      courseCode: c.courseCode,
      years,
    });
  }
  return courses;
}

export function formatPolicyResponse(policy) {
  if (!policy) return policy;
  const policyObj =
    typeof policy.toJSON === "function" ? policy.toJSON() : { ...policy };
  policyObj.courses = groupPolicyBatchesToCourses(
    policyObj.policyBatches || [],
  );
  return policyObj;
}

function buildFeePolicyBatchRows(
  courses = [],
  feePolicyId,
  instituteId,
  universityId,
) {
  const rows = [];
  for (const c of courses) {
    if (!c) continue;
    const courseId = c.courseId != null ? Number(c.courseId) : null;
    const batchId = c.batchId != null ? Number(c.batchId) : null;
    if (!courseId && !batchId) continue;

    if (Array.isArray(c.years) && c.years.length) {
      for (const y of c.years) {
        if (!y) continue;
        const yearVal = y.year != null ? Number(y.year) : null;
        if (Array.isArray(y.terms) && y.terms.length) {
          for (const term of y.terms) {
            rows.push({
              feePolicyId,
              courseId,
              batchId,
              year: yearVal,
              term: Number(term),
              instituteId,
              universityId,
            });
          }
        } else {
          rows.push({
            feePolicyId,
            courseId,
            batchId,
            year: yearVal,
            term: null,
            instituteId,
            universityId,
          });
        }
      }
    } else {
      rows.push({
        feePolicyId,
        courseId,
        batchId,
        year: null,
        term: null,
        instituteId,
        universityId,
      });
    }
  }
  return rows;
}

export async function createFeePolicy(body, authUser = {}) {
  return sequelize.transaction(async (transaction) => {
    const {
      policyName,
      description,
      appliesTo = "selected_components",
      effect,
      calculationType,
      percentageRate,
      fixedAmount,
      gracePeriodDays = 0,
      maxCapAmount,
      referenceDateEvent,
      publishStatus = "draft",
      feeTypeCatalogIds = [],
      courses = [],
      batchIds = [],
      batches = [],
      slabs = [],
    } = body;

    if (!policyName || !policyName.trim()) {
      throw httpError("policyName is required", 400);
    }

    if (!effect) {
      throw httpError("effect is required", 400);
    }

    if (!calculationType) {
      throw httpError("calculationType is required", 400);
    }

    if (
      calculationType === "percentage" ||
      calculationType === "percentage_of_outstanding"
    ) {
      if (percentageRate == null) {
        throw httpError(
          "percentageRate is required for percentage calculation",
          400,
        );
      }
    }

    if (calculationType === "fixed_amount" || calculationType === "per_day") {
      if (fixedAmount == null) {
        throw httpError(
          "fixedAmount is required for fixed_amount or per_day calculation",
          400,
        );
      }
    }

    if (
      appliesTo === "selected_components" &&
      (!feeTypeCatalogIds || !feeTypeCatalogIds.length)
    ) {
      throw httpError(
        "feeTypeCatalogIds must be provided when appliesTo is selected_components",
        400,
      );
    }

    if (calculationType === "slab_based" && (!slabs || !slabs.length)) {
      throw httpError(
        "slabs must be provided when calculationType is slab_based",
        400,
      );
    }

    const isPublished = publishStatus === "published";

    const policyPayload = {
      policyName: policyName.trim(),
      description: description ?? null,
      appliesTo,
      effect,
      calculationType,
      percentageRate: percentageRate != null ? Number(percentageRate) : null,
      fixedAmount: fixedAmount != null ? Number(fixedAmount) : null,
      gracePeriodDays: Number(gracePeriodDays) || 0,
      maxCapAmount: maxCapAmount != null ? Number(maxCapAmount) : null,
      referenceDateEvent: referenceDateEvent ?? null,
      publishStatus: isPublished ? "published" : "draft",
      publishedAt: isPublished ? new Date() : null,
      publishedBy: isPublished ? (authUser.userId ?? null) : null,
      createdBy: authUser.userId ?? null,
      updatedBy: authUser.userId ?? null,
    };

    const policy = await feePolicyRepo.createFeePolicy(policyPayload, {
      transaction,
    });
    const feePolicyId = policy.feePolicyId;
    const instituteId = policy.instituteId;
    const universityId = policy.universityId;

    // Components
    if (appliesTo === "selected_components" && feeTypeCatalogIds.length) {
      const uniqueCatalogIds = [...new Set(feeTypeCatalogIds.map(Number))];
      const componentRows = uniqueCatalogIds.map((feeTypeCatalogId) => ({
        feePolicyId,
        feeTypeCatalogId,
        instituteId,
        universityId,
      }));
      await feePolicyRepo.bulkCreateFeePolicyComponents(componentRows, {
        transaction,
      });
    }

    // Courses / Batches Scopes
    const courseList = courses && courses.length ? courses : batches;
    const batchRows = buildFeePolicyBatchRows(
      courseList,
      feePolicyId,
      instituteId,
      universityId,
    );
    if (batchRows.length) {
      await feePolicyRepo.bulkCreateFeePolicyBatches(batchRows, {
        transaction,
      });
    }

    // Slabs
    if (calculationType === "slab_based" && slabs.length) {
      const slabRows = slabs.map((slab, index) => ({
        feePolicyId,
        relativePeriod: slab.relativePeriod ?? null,
        fromUnit: Number(slab.fromUnit) || 0,
        toUnit: slab.toUnit != null ? Number(slab.toUnit) : null,
        slabValue: Number(slab.slabValue) || 0,
        orderIndex:
          slab.orderIndex != null ? Number(slab.orderIndex) : index + 1,
        instituteId,
        universityId,
      }));
      await feePolicyRepo.bulkCreateFeePolicySlabs(slabRows, { transaction });
    }

    // Students
    if (body.studentIds && body.studentIds.length) {
      const uniqueStudentIds = [...new Set(body.studentIds.map(Number))];
      const students = await feePolicyRepo.findStudentsByIds(uniqueStudentIds, { transaction });
      const studentRows = students.map((st) => ({
        feePolicyId,
        studentId: st.studentId,
        instituteId: st.instituteId || instituteId,
        universityId: st.universityId || universityId,
      }));
      await feePolicyRepo.bulkCreateFeePolicyStudents(studentRows, { transaction });
    }

    const created = await feePolicyRepo.findFeePolicyById(feePolicyId, {
      transaction,
    });
    return formatPolicyResponse(created);
  });
}

export async function getFeePolicies(query = {}) {
  const result = await feePolicyRepo.findFeePolicies(query);
  if (result?.rows) {
    result.rows = result.rows.map(formatPolicyResponse);
  }
  return result;
}

export async function getSingleFeePolicy(feePolicyId) {
  const policy = await feePolicyRepo.findFeePolicyById(feePolicyId);
  if (!policy) {
    throw httpError(`Fee policy with ID ${feePolicyId} not found`, 404);
  }
  return formatPolicyResponse(policy);
}

export async function updateFeePolicy(feePolicyId, body, authUser = {}) {
  return sequelize.transaction(async (transaction) => {
    const existing = await feePolicyRepo.findFeePolicyById(feePolicyId, {
      transaction,
    });
    if (!existing) {
      throw httpError(`Fee policy with ID ${feePolicyId} not found`, 404);
    }

    const {
      policyName,
      description,
      appliesTo,
      effect,
      calculationType,
      percentageRate,
      fixedAmount,
      gracePeriodDays,
      maxCapAmount,
      referenceDateEvent,
      isActive,
      feeTypeCatalogIds,
      courses,
      batchIds,
      batches,
      slabs,
    } = body;

    const updateFields = {
      updatedBy: authUser.userId ?? null,
    };

    if (policyName !== undefined) updateFields.policyName = policyName.trim();
    if (description !== undefined) updateFields.description = description;
    if (appliesTo !== undefined) updateFields.appliesTo = appliesTo;
    if (effect !== undefined) updateFields.effect = effect;
    if (calculationType !== undefined)
      updateFields.calculationType = calculationType;
    if (percentageRate !== undefined)
      updateFields.percentageRate =
        percentageRate != null ? Number(percentageRate) : null;
    if (fixedAmount !== undefined)
      updateFields.fixedAmount =
        fixedAmount != null ? Number(fixedAmount) : null;
    if (gracePeriodDays !== undefined)
      updateFields.gracePeriodDays = Number(gracePeriodDays) || 0;
    if (maxCapAmount !== undefined)
      updateFields.maxCapAmount =
        maxCapAmount != null ? Number(maxCapAmount) : null;
    if (referenceDateEvent !== undefined)
      updateFields.referenceDateEvent = referenceDateEvent;
    if (isActive !== undefined) updateFields.isActive = Boolean(isActive);

    await feePolicyRepo.updateFeePolicy(feePolicyId, updateFields, {
      transaction,
    });

    const instituteId = existing.instituteId;
    const universityId = existing.universityId;

    // Update Components if passed
    if (feeTypeCatalogIds !== undefined) {
      await feePolicyRepo.deleteFeePolicyComponents(feePolicyId, {
        transaction,
      });
      const currentAppliesTo = appliesTo ?? existing.appliesTo;
      if (
        currentAppliesTo === "selected_components" &&
        feeTypeCatalogIds &&
        feeTypeCatalogIds.length
      ) {
        const uniqueCatalogIds = [...new Set(feeTypeCatalogIds.map(Number))];
        const componentRows = uniqueCatalogIds.map((feeTypeCatalogId) => ({
          feePolicyId: Number(feePolicyId),
          feeTypeCatalogId,
          instituteId,
          universityId,
        }));
        await feePolicyRepo.bulkCreateFeePolicyComponents(componentRows, {
          transaction,
        });
      }
    }

    // Update Batches & Courses if passed
    if (courses !== undefined || batches !== undefined) {
      await feePolicyRepo.deleteFeePolicyBatches(feePolicyId, { transaction });
      const courseList = (courses && courses.length ? courses : batches) || [];
      const batchRows = buildFeePolicyBatchRows(
        courseList,
        feePolicyId,
        instituteId,
        universityId,
      );
      if (batchRows.length) {
        await feePolicyRepo.bulkCreateFeePolicyBatches(batchRows, {
          transaction,
        });
      }
    }

    // Update Slabs if passed
    if (slabs !== undefined) {
      await feePolicyRepo.deleteFeePolicySlabs(feePolicyId, { transaction });
      const currentCalcType = calculationType ?? existing.calculationType;
      if (currentCalcType === "slab_based" && slabs && slabs.length) {
        const slabRows = slabs.map((slab, index) => ({
          feePolicyId: Number(feePolicyId),
          relativePeriod: slab.relativePeriod ?? null,
          fromUnit: Number(slab.fromUnit) || 0,
          toUnit: slab.toUnit != null ? Number(slab.toUnit) : null,
          slabValue: Number(slab.slabValue) || 0,
          orderIndex:
            slab.orderIndex != null ? Number(slab.orderIndex) : index + 1,
          instituteId,
          universityId,
        }));
        await feePolicyRepo.bulkCreateFeePolicySlabs(slabRows, { transaction });
      }
    }

    // Students
    if (body.studentIds !== undefined) {
      await feePolicyRepo.deleteFeePolicyStudents({ feePolicyId }, { transaction });
      if (Array.isArray(body.studentIds) && body.studentIds.length) {
        const uniqueStudentIds = [...new Set(body.studentIds.map(Number))];
        const students = await feePolicyRepo.findStudentsByIds(uniqueStudentIds, { transaction });
        const studentRows = students.map((st) => ({
          feePolicyId,
          studentId: st.studentId,
          instituteId: st.instituteId || instituteId,
          universityId: st.universityId || universityId,
        }));
        await feePolicyRepo.bulkCreateFeePolicyStudents(studentRows, { transaction });
      }
    }

    const updated = await feePolicyRepo.findFeePolicyById(feePolicyId, {
      transaction,
    });
    return formatPolicyResponse(updated);
  });
}

export async function publishFeePolicy(feePolicyId, authUser = {}) {
  const policy = await feePolicyRepo.findFeePolicyById(feePolicyId);
  if (!policy) {
    throw httpError(`Fee policy with ID ${feePolicyId} not found`, 404);
  }

  if (policy.publishStatus === "published") {
    throw httpError("Fee policy is already published", 400);
  }

  await feePolicyRepo.updateFeePolicy(feePolicyId, {
    publishStatus: "published",
    publishedAt: new Date(),
    publishedBy: authUser.userId ?? null,
    updatedBy: authUser.userId ?? null,
  });

  const updated = await feePolicyRepo.findFeePolicyById(feePolicyId);
  return formatPolicyResponse(updated);
}

export async function unpublishFeePolicy(feePolicyId, authUser = {}) {
  const policy = await feePolicyRepo.findFeePolicyById(feePolicyId);
  if (!policy) {
    throw httpError(`Fee policy with ID ${feePolicyId} not found`, 404);
  }

  if (policy.publishStatus === "draft") {
    throw httpError("Fee policy is already in draft status", 400);
  }

  await feePolicyRepo.updateFeePolicy(feePolicyId, {
    publishStatus: "draft",
    updatedBy: authUser.userId ?? null,
  });

  const updated = await feePolicyRepo.findFeePolicyById(feePolicyId);
  return formatPolicyResponse(updated);
}

export async function deleteFeePolicy(feePolicyId) {
  const policy = await feePolicyRepo.findFeePolicyById(feePolicyId);
  if (!policy) {
    throw httpError(`Fee policy with ID ${feePolicyId} not found`, 404);
  }

  await feePolicyRepo.deleteFeePolicy(feePolicyId);
  return true;
}

export async function mapStudentWithFeePolicies(body, authUser = {}) {
  const { studentId, studentIds, feePolicyId, feePolicyIds, mappings, replace = false } = body;

  const pairs = [];
  if (Array.isArray(mappings) && mappings.length) {
    for (const m of mappings) {
      if (m && m.studentId && m.feePolicyId) {
        pairs.push({
          studentId: Number(m.studentId),
          feePolicyId: Number(m.feePolicyId),
        });
      }
    }
  }

  const sIds = [];
  if (studentId != null) sIds.push(Number(studentId));
  if (Array.isArray(studentIds)) {
    for (const s of studentIds) {
      if (s != null) sIds.push(Number(s));
    }
  }

  const pIds = [];
  if (feePolicyId != null) pIds.push(Number(feePolicyId));
  if (Array.isArray(feePolicyIds)) {
    for (const p of feePolicyIds) {
      if (p != null) pIds.push(Number(p));
    }
  }

  if (sIds.length && pIds.length) {
    for (const sid of sIds) {
      for (const pid of pIds) {
        pairs.push({ studentId: sid, feePolicyId: pid });
      }
    }
  }

  if (!pairs.length) {
    throw httpError("At least one studentId and feePolicyId mapping must be provided", 400);
  }

  // Deduplicate input pairs
  const uniquePairs = [];
  const seenPairs = new Set();
  for (const pair of pairs) {
    const key = `${pair.studentId}_${pair.feePolicyId}`;
    if (!seenPairs.has(key)) {
      seenPairs.add(key);
      uniquePairs.push(pair);
    }
  }

  const distinctStudentIds = [...new Set(uniquePairs.map((p) => p.studentId))];
  const distinctPolicyIds = [...new Set(uniquePairs.map((p) => p.feePolicyId))];

  const [students, policies] = await Promise.all([
    feePolicyRepo.findStudentsByIds(distinctStudentIds),
    feePolicyRepo.findPoliciesByIds(distinctPolicyIds),
  ]);

  const studentMap = new Map(students.map((s) => [Number(s.studentId), s]));
  const policyMap = new Map(policies.map((p) => [Number(p.feePolicyId), p]));

  const missingStudent = distinctStudentIds.find((id) => !studentMap.has(id));
  if (missingStudent) {
    throw httpError(`Student with ID ${missingStudent} not found`, 404);
  }

  const missingPolicy = distinctPolicyIds.find((id) => !policyMap.has(id));
  if (missingPolicy) {
    throw httpError(`Fee policy with ID ${missingPolicy} not found`, 404);
  }

  return sequelize.transaction(async (transaction) => {
    if (replace) {
      for (const sid of distinctStudentIds) {
        await feePolicyRepo.deleteFeePolicyStudents({ studentId: sid }, { transaction });
      }
    }

    const rows = uniquePairs.map((pair) => {
      const student = studentMap.get(pair.studentId);
      const policy = policyMap.get(pair.feePolicyId);
      return {
        studentId: pair.studentId,
        feePolicyId: pair.feePolicyId,
        instituteId: student?.instituteId || policy?.instituteId || authUser?.instituteId,
        universityId: student?.universityId || policy?.universityId || authUser?.universityId || null,
      };
    });

    await feePolicyRepo.bulkCreateFeePolicyStudents(rows, { transaction });

    return feePolicyRepo.findFeePolicyStudents(
      distinctStudentIds.length === 1
        ? { studentId: distinctStudentIds[0] }
        : distinctPolicyIds.length === 1
        ? { feePolicyId: distinctPolicyIds[0] }
        : {},
      { transaction }
    );
  });
}

export async function removeStudentFeePolicyMapping(query = {}, authUser = {}) {
  const { studentId, feePolicyId } = query;
  if (!studentId && !feePolicyId) {
    throw httpError("Either studentId or feePolicyId must be provided to remove mapping", 400);
  }
  const deletedCount = await feePolicyRepo.deleteFeePolicyStudents({
    studentId: studentId ? Number(studentId) : undefined,
    feePolicyId: feePolicyId ? Number(feePolicyId) : undefined,
  });
  return { deletedCount };
}

export async function getStudentFeePolicies(query = {}, authUser = {}) {
  const { studentId, feePolicyId } = query;
  return feePolicyRepo.findFeePolicyStudents({
    studentId: studentId ? Number(studentId) : undefined,
    feePolicyId: feePolicyId ? Number(feePolicyId) : undefined,
  });
}

function formatFeePolicyOption(p) {
  return {
    label: p.policyName,
    value: p.feePolicyId,
    feePolicyId: p.feePolicyId,
    policyName: p.policyName,
  };
}

export async function getFeePolicyOptions(query = {}, authUser = {}) {
  const { studentId, courseId, batchId, year, effect, calculationType, search, publishStatus } = query;

  if (studentId) {
    const numStudentId = Number(studentId);
    if (!numStudentId || !Number.isInteger(numStudentId) || numStudentId <= 0) {
      throw httpError("Valid studentId is required", 400);
    }

    const result = await feePolicyRepo.findFeePoliciesByStudentId(numStudentId, { year });
    if (!result || !result.student) {
      throw httpError(`Student with ID ${numStudentId} not found`, 404);
    }

    const { studentPolicyRows, batchPolicyRows } = result;
    const policyMap = new Map();

    for (const row of studentPolicyRows || []) {
      const p = row.policy
        ? typeof row.policy.get === "function"
          ? row.policy.get({ plain: true })
          : row.policy
        : null;
      if (p && p.feePolicyId) {
        policyMap.set(Number(p.feePolicyId), p);
      }
    }

    for (const pRow of batchPolicyRows || []) {
      const p = typeof pRow.get === "function" ? pRow.get({ plain: true }) : pRow;
      if (p && p.feePolicyId && !policyMap.has(Number(p.feePolicyId))) {
        policyMap.set(Number(p.feePolicyId), p);
      }
    }

    let policies = Array.from(policyMap.values());

    if (publishStatus && publishStatus !== "all") {
      policies = policies.filter((p) => p.publishStatus === publishStatus);
    }
    if (effect) {
      policies = policies.filter((p) => p.effect === effect);
    }
    return policies.map(formatFeePolicyOption);
  }

  const policies = await feePolicyRepo.findFeePoliciesOptions({
    courseId,
    batchId,
    year,
    effect,
    calculationType,
    publishStatus: publishStatus || "all",
    search,
  });

  return policies.map((p) => {
    const plain = typeof p.get === "function" ? p.get({ plain: true }) : p;
    return formatFeePolicyOption(plain);
  });
}

export async function getFeePoliciesByStudentId(query = {}, authUser = {}) {
  return getFeePolicyOptions(query, authUser);
}


export async function getStudentFeeTreatmentSummary(query = {}, authUser = {}) {
  const studentId = Number(query.studentId);
  if (!studentId || !Number.isInteger(studentId) || studentId <= 0) {
    throw httpError("Valid studentId is required", 400);
  }

  const studentRow = await feePolicyRepo.findStudentFeeDetailsWithIncludes(studentId);
  if (!studentRow) {
    throw httpError(`Student with ID ${studentId} not found`, 404);
  }

  const student = studentRow.get({ plain: true });
  const invoices = student.studentFeeInvoices || [];
  const todayStr = new Date().toISOString().split("T")[0];

  // 1. Fee components breakdown & refundable calculation from studentFeeInvoice
  const componentMap = new Map();
  let totalFee = 0;
  let totalPaid = 0;

  for (const inv of invoices) {
    const invTotal = Number(inv.total) || 0;
    const invPaid = Number(inv.paidAmount) || 0;
    const paidRatio = invTotal > 0 ? invPaid / invTotal : 0;
    totalFee += invTotal;
    totalPaid += invPaid;

    for (const item of inv.feeInvoiceItems || []) {
      const catId = item.feeTypeId;
      const amount = Number(item.amount) || 0;
      const waiver = Number(item.waiver) || 0;
      const net = Math.max(0, amount - waiver);
      const isRefundable = Boolean(item.feeTypeCatalog?.refundable);
      const itemPaid = invPaid >= invTotal ? net : net * paidRatio;

      if (!componentMap.has(catId)) {
        componentMap.set(catId, {
          feeTypeId: catId,
          name: item.feeTypeCatalog?.name || "Fee Component",
          totalAmount: 0,
          waiver: 0,
          netAmount: 0,
          isRefundable,
          refundableAmount: 0,
          paidAmount: 0,
          currentBalance: 0,
        });
      }
      const c = componentMap.get(catId);
      c.totalAmount = toMoneyNumber(c.totalAmount + amount);
      c.waiver = toMoneyNumber(c.waiver + waiver);
      c.netAmount = toMoneyNumber(c.netAmount + net);
      c.paidAmount = toMoneyNumber(c.paidAmount + itemPaid);
      c.currentBalance = toMoneyNumber(Math.max(0, c.netAmount - c.paidAmount));
      if (isRefundable) {
        c.refundableAmount = c.netAmount;
      }
    }
  }

  const feeAmountWiseBreakdown = Array.from(componentMap.values());

  // 2. Fee Treatments (student-specific & batch-level policies)
  const policies = [];
  const seenPolicy = new Set();
  const addPolicy = (p) => {
    if (!p || seenPolicy.has(p.feePolicyId)) return;
    seenPolicy.add(p.feePolicyId);
    policies.push(p);
  };
  for (const sp of student.feePolicyStudents || []) addPolicy(sp.policy);
  for (const bp of student.batch?.feePolicyBatches || []) addPolicy(bp.policy);

  let totalDiscount = 0;
  let totalAddCharge = 0;

  const feeTreatments = policies.map((policy) => {
    let targetAmount = totalFee;
    if (policy.appliesTo === "selected_components") {
      const compIds = (policy.policyComponents || []).map((pc) => pc.feeTypeCatalogId);
      targetAmount = feeAmountWiseBreakdown
        .filter((c) => compIds.includes(c.feeTypeId))
        .reduce((sum, c) => sum + c.totalAmount, 0);
    }

    let calculatedDiscount = 0;
    if (policy.calculationType === "percentage") {
      calculatedDiscount = (targetAmount * (Number(policy.percentageRate) || 0)) / 100;
    } else if (policy.calculationType === "fixed_amount") {
      calculatedDiscount = Number(policy.fixedAmount) || 0;
    }
    if (policy.maxCapAmount && calculatedDiscount > Number(policy.maxCapAmount)) {
      calculatedDiscount = Number(policy.maxCapAmount);
    }
    calculatedDiscount = toMoneyNumber(calculatedDiscount);

    if (policy.effect === "reduce_fee") {
      totalDiscount += calculatedDiscount;
    } else if (policy.effect === "add_charge") {
      totalAddCharge += calculatedDiscount;
    }

    return {
      feePolicyId: policy.feePolicyId,
      policyName: policy.policyName,
      effect: policy.effect,
      calculationType: policy.calculationType,
      percentageRate: policy.percentageRate,
      calculatedDiscount: policy.effect === "reduce_fee" ? calculatedDiscount : 0,
      calculatedCharge: policy.effect === "add_charge" ? calculatedDiscount : 0,
      amountToBePaid: toMoneyNumber(Math.max(0, targetAmount - calculatedDiscount)),
    };
  });

  // 3. Year-wise fee status
  const yearMap = new Map();
  for (const inv of invoices) {
    const y = inv.feePlanItem?.year || 1;
    const invTotal = Number(inv.total) || 0;
    const invPaid = Number(inv.paidAmount) || 0;
    const balance = Math.max(0, invTotal - invPaid);
    const isOverdue = inv.paymentStatus !== "paid" && Boolean(inv.dueDate && inv.dueDate < todayStr);
    const overdueAmount = isOverdue ? balance : 0;

    let refundable = 0;
    for (const item of inv.feeInvoiceItems || []) {
      if (item.feeTypeCatalog?.refundable) {
        refundable += Math.max(0, (Number(item.amount) || 0) - (Number(item.waiver) || 0));
      }
    }

    if (!yearMap.has(y)) {
      yearMap.set(y, {
        year: y,
        totalAmount: 0,
        amountPaidTillNow: 0,
        currentBalance: 0,
        isOverdue: false,
        overdueAmount: 0,
        refundableDeposit: 0,
        paymentStatus: "unpaid",
      });
    }
    const yStat = yearMap.get(y);
    yStat.totalAmount = toMoneyNumber(yStat.totalAmount + invTotal);
    yStat.amountPaidTillNow = toMoneyNumber(yStat.amountPaidTillNow + invPaid);
    yStat.currentBalance = toMoneyNumber(yStat.currentBalance + balance);
    yStat.refundableDeposit = toMoneyNumber(yStat.refundableDeposit + refundable);
    if (isOverdue) {
      yStat.isOverdue = true;
      yStat.overdueAmount = toMoneyNumber(yStat.overdueAmount + overdueAmount);
    }
    yStat.paymentStatus =
      yStat.amountPaidTillNow >= yStat.totalAmount
        ? "paid"
        : yStat.amountPaidTillNow > 0
        ? "partial"
        : "unpaid";
  }

  const yearWiseFeeStatus = Array.from(yearMap.values()).sort((a, b) => a.year - b.year);

  // 4. Overall Summary
  const amountToBePaid = toMoneyNumber(Math.max(0, totalFee - totalDiscount + totalAddCharge));
  const currentBalance = toMoneyNumber(Math.max(0, totalFee - totalPaid));
  const totalOverdue = toMoneyNumber(yearWiseFeeStatus.reduce((sum, y) => sum + y.overdueAmount, 0));
  const totalRefundable = toMoneyNumber(yearWiseFeeStatus.reduce((sum, y) => sum + y.refundableDeposit, 0));

  return {
    student: {
      studentId: student.studentId,
      studentName: [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" "),
      scholarNumber: student.scholarNumber,
      enrollNumber: student.enrollNumber,
      admissionNumber: student.admissionNumber,
      batch: student.batch?.batch || null,
      course: student.course?.courseName || null,
    },
    summary: {
      totalFeeAmount: toMoneyNumber(totalFee),
      totalDiscount: toMoneyNumber(totalDiscount),
      amountToBePaid,
      amountPaidTillNow: toMoneyNumber(totalPaid),
      currentBalance,
      isOverdue: totalOverdue > 0,
      overdueAmount: totalOverdue,
      refundableDeposit: totalRefundable,
    },
    feeTreatments,
    feeAmountWiseBreakdown,
    yearWiseFeeStatus,
  };
}

