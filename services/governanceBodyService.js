import * as governanceBodyRepository from '../repository/governanceBodyRepository.js';

function parseDateOnly(value) {
    if (value == null || value === '') {
        return null;
    }
    return value;
}

function validateEffectiveDates(effectiveFrom, effectiveTo) {
    if (effectiveFrom && effectiveTo && effectiveTo < effectiveFrom) {
        throw new Error('effectiveTo cannot be before effectiveFrom');
    }
}

async function validateParentBody(parentBodyId, governanceBodyId = null) {
    if (parentBodyId == null || parentBodyId === '') {
        return null;
    }

    const numericParentId = Number(parentBodyId);
    if (!Number.isInteger(numericParentId) || numericParentId <= 0) {
        throw new Error('parentBodyId must be a positive integer');
    }

    if (governanceBodyId != null && numericParentId === Number(governanceBodyId)) {
        throw new Error('A governance body cannot be its own parent');
    }

    const parent = await governanceBodyRepository.getGovernanceBodyById(numericParentId);
    if (!parent) {
        throw new Error('parentBodyId not found for this institute');
    }

    return numericParentId;
}

export async function createGovernanceBody(data, createdBy, updatedBy) {
    validateEffectiveDates(data.effectiveFrom, data.effectiveTo);
    const parentBodyId = await validateParentBody(data.parentBodyId);

    return governanceBodyRepository.createGovernanceBody({
        name: data.name,
        code: data.code,
        category: data.category,
        description: data.description ?? null,
        parentBodyId,
        constitutedOn: parseDateOnly(data.constitutedOn),
        effectiveFrom: parseDateOnly(data.effectiveFrom),
        effectiveTo: parseDateOnly(data.effectiveTo),
        status: data.status ?? 'Active',
        createdBy,
        updatedBy,
    });
}

export async function getAllGovernanceBodies() {
    return governanceBodyRepository.getAllGovernanceBodies();
}

export async function getGovernanceBodyById(governanceBodyId) {
    return governanceBodyRepository.getGovernanceBodyById(governanceBodyId);
}

export async function updateGovernanceBody(governanceBodyId, data, updatedBy) {
    const existing = await governanceBodyRepository.getGovernanceBodyById(governanceBodyId);
    if (!existing) {
        return null;
    }

    const updateData = { updatedBy };

    if (data.name != null) updateData.name = data.name;
    if (data.code != null) updateData.code = data.code;
    if (data.category != null) updateData.category = data.category;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status != null) updateData.status = data.status;
    if (data.constitutedOn !== undefined) updateData.constitutedOn = parseDateOnly(data.constitutedOn);
    if (data.effectiveFrom !== undefined) updateData.effectiveFrom = parseDateOnly(data.effectiveFrom);
    if (data.effectiveTo !== undefined) updateData.effectiveTo = parseDateOnly(data.effectiveTo);

    if (data.parentBodyId !== undefined) {
        updateData.parentBodyId = await validateParentBody(data.parentBodyId, governanceBodyId);
    }

    const effectiveFrom = updateData.effectiveFrom ?? existing.effectiveFrom ?? existing.dataValues?.effectiveFrom;
    const effectiveTo = updateData.effectiveTo ?? existing.effectiveTo ?? existing.dataValues?.effectiveTo;
    validateEffectiveDates(effectiveFrom, effectiveTo);

    return governanceBodyRepository.updateGovernanceBody(governanceBodyId, updateData);
}

export async function deleteGovernanceBody(governanceBodyId) {
    const existing = await governanceBodyRepository.getGovernanceBodyById(governanceBodyId);
    if (!existing) {
        return null;
    }

    const childCount = await governanceBodyRepository.countChildGovernanceBodies(governanceBodyId);
    if (childCount > 0) {
        throw new Error('Cannot delete governance body: child bodies exist');
    }

    const deleted = await governanceBodyRepository.deleteGovernanceBody(governanceBodyId);
    return deleted ? { governanceBodyId: Number(governanceBodyId) } : null;
}
