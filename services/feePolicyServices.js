import sequelize from "../database/sequelizeConfig.js";
import * as feePolicyRepo from "../repository/feePolicyRepository.js";
import * as feeTypeCatalogRepo from "../repository/feeTypeCatalogRepository.js";

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function normalizeBatches(batches, batchIds, feePolicyId, instituteId, universityId) {
  const batchList = [];
  if (Array.isArray(batches) && batches.length) {
    for (const b of batches) {
      if (typeof b === "number" || typeof b === "string") {
        batchList.push({
          feePolicyId: Number(feePolicyId),
          batchId: Number(b),
          year: null,
          instituteId,
          universityId,
        });
      } else if (b && typeof b === "object") {
        batchList.push({
          feePolicyId: Number(feePolicyId),
          batchId: Number(b.batchId),
          year: b.year != null ? Number(b.year) : null,
          instituteId,
          universityId,
        });
      }
    }
  } else if (Array.isArray(batchIds) && batchIds.length) {
    for (const id of batchIds) {
      batchList.push({
        feePolicyId: Number(feePolicyId),
        batchId: Number(id),
        year: null,
        instituteId,
        universityId,
      });
    }
  }

  const seen = new Set();
  const uniqueBatches = [];
  for (const item of batchList) {
    const key = `${item.batchId}_${item.year}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueBatches.push(item);
    }
  }
  return uniqueBatches;
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

    if (calculationType === "percentage" || calculationType === "percentage_of_outstanding") {
      if (percentageRate == null) {
        throw httpError("percentageRate is required for percentage calculation", 400);
      }
    }

    if (calculationType === "fixed_amount" || calculationType === "per_day") {
      if (fixedAmount == null) {
        throw httpError("fixedAmount is required for fixed_amount or per_day calculation", 400);
      }
    }

    if (appliesTo === "selected_components" && (!feeTypeCatalogIds || !feeTypeCatalogIds.length)) {
      throw httpError("feeTypeCatalogIds must be provided when appliesTo is selected_components", 400);
    }

    if (calculationType === "slab_based" && (!slabs || !slabs.length)) {
      throw httpError("slabs must be provided when calculationType is slab_based", 400);
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
      publishedBy: isPublished ? authUser.userId ?? null : null,
      createdBy: authUser.userId ?? null,
      updatedBy: authUser.userId ?? null,
    };

    const policy = await feePolicyRepo.createFeePolicy(policyPayload, { transaction });
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
      await feePolicyRepo.bulkCreateFeePolicyComponents(componentRows, { transaction });
    }

    // Batches
    const batchRows = normalizeBatches(batches, batchIds, feePolicyId, instituteId, universityId);
    if (batchRows.length) {
      await feePolicyRepo.bulkCreateFeePolicyBatches(batchRows, { transaction });
    }

    // Slabs
    if (calculationType === "slab_based" && slabs.length) {
      const slabRows = slabs.map((slab, index) => ({
        feePolicyId,
        relativePeriod: slab.relativePeriod ?? null,
        fromUnit: Number(slab.fromUnit) || 0,
        toUnit: slab.toUnit != null ? Number(slab.toUnit) : null,
        slabValue: Number(slab.slabValue) || 0,
        orderIndex: slab.orderIndex != null ? Number(slab.orderIndex) : index + 1,
        instituteId,
        universityId,
      }));
      await feePolicyRepo.bulkCreateFeePolicySlabs(slabRows, { transaction });
    }

    return feePolicyRepo.findFeePolicyById(feePolicyId, { transaction });
  });
}

export async function getFeePolicies(query = {}) {
  return feePolicyRepo.findFeePolicies(query);
}

export async function getSingleFeePolicy(feePolicyId) {
  const policy = await feePolicyRepo.findFeePolicyById(feePolicyId);
  if (!policy) {
    throw httpError(`Fee policy with ID ${feePolicyId} not found`, 404);
  }
  return policy;
}

export async function updateFeePolicy(feePolicyId, body, authUser = {}) {
  return sequelize.transaction(async (transaction) => {
    const existing = await feePolicyRepo.findFeePolicyById(feePolicyId, { transaction });
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
    if (calculationType !== undefined) updateFields.calculationType = calculationType;
    if (percentageRate !== undefined) updateFields.percentageRate = percentageRate != null ? Number(percentageRate) : null;
    if (fixedAmount !== undefined) updateFields.fixedAmount = fixedAmount != null ? Number(fixedAmount) : null;
    if (gracePeriodDays !== undefined) updateFields.gracePeriodDays = Number(gracePeriodDays) || 0;
    if (maxCapAmount !== undefined) updateFields.maxCapAmount = maxCapAmount != null ? Number(maxCapAmount) : null;
    if (referenceDateEvent !== undefined) updateFields.referenceDateEvent = referenceDateEvent;
    if (isActive !== undefined) updateFields.isActive = Boolean(isActive);

    await feePolicyRepo.updateFeePolicy(feePolicyId, updateFields, { transaction });

    const instituteId = existing.instituteId;
    const universityId = existing.universityId;

    // Update Components if passed
    if (feeTypeCatalogIds !== undefined) {
      await feePolicyRepo.deleteFeePolicyComponents(feePolicyId, { transaction });
      const currentAppliesTo = appliesTo ?? existing.appliesTo;
      if (currentAppliesTo === "selected_components" && feeTypeCatalogIds && feeTypeCatalogIds.length) {
        const uniqueCatalogIds = [...new Set(feeTypeCatalogIds.map(Number))];
        const componentRows = uniqueCatalogIds.map((feeTypeCatalogId) => ({
          feePolicyId: Number(feePolicyId),
          feeTypeCatalogId,
          instituteId,
          universityId,
        }));
        await feePolicyRepo.bulkCreateFeePolicyComponents(componentRows, { transaction });
      }
    }

    // Update Batches if passed
    if (batches !== undefined || batchIds !== undefined) {
      await feePolicyRepo.deleteFeePolicyBatches(feePolicyId, { transaction });
      const batchRows = normalizeBatches(batches, batchIds, feePolicyId, instituteId, universityId);
      if (batchRows.length) {
        await feePolicyRepo.bulkCreateFeePolicyBatches(batchRows, { transaction });
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
          orderIndex: slab.orderIndex != null ? Number(slab.orderIndex) : index + 1,
          instituteId,
          universityId,
        }));
        await feePolicyRepo.bulkCreateFeePolicySlabs(slabRows, { transaction });
      }
    }

    return feePolicyRepo.findFeePolicyById(feePolicyId, { transaction });
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

  return feePolicyRepo.findFeePolicyById(feePolicyId);
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

  return feePolicyRepo.findFeePolicyById(feePolicyId);
}

export async function deleteFeePolicy(feePolicyId) {
  const policy = await feePolicyRepo.findFeePolicyById(feePolicyId);
  if (!policy) {
    throw httpError(`Fee policy with ID ${feePolicyId} not found`, 404);
  }

  await feePolicyRepo.deleteFeePolicy(feePolicyId);
  return true;
}
