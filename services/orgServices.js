import * as orgRepository from '../repository/orgRepository.js';

const EMPLOYMENT_CATEGORIES = new Set([
    'Academic',
    'Administrative',
    'Support',
    'Executive',
    'Leadership',
]);

const HOLDER_TYPES = new Set(['PRIMARY', 'ACTING']);
const HEAD_STATUSES = new Set(['ACTIVE', 'INACTIVE']);

export async function addOrgPosition(body, createdBy, updatedBy) {
    const structure = await orgRepository.departmentStructureExists(body.departmentStructureId);
    if (!structure) {
        throw new Error('departmentStructure not found');
    }

    if (!EMPLOYMENT_CATEGORIES.has(body.employmentCategory)) {
        throw new Error('Invalid employmentCategory');
    }

    if (body.reportsToOrgPositionId != null) {
        const reportsTo = await orgRepository.positionExists(body.reportsToOrgPositionId);
        if (!reportsTo) {
            throw new Error('reportsToOrgPositionId not found');
        }
    }

    const isVacant = body.isVacant === undefined ? true : Boolean(body.isVacant);

    return orgRepository.addOrgPosition({
        departmentStructureId: Number(body.departmentStructureId),
        positionName: body.positionName,
        positionCode: body.positionCode ?? null,
        employmentCategory: body.employmentCategory,
        reportsToOrgPositionId:
            body.reportsToOrgPositionId != null
                ? Number(body.reportsToOrgPositionId)
                : null,
        reportingType: body.reportingType ?? null,
        isVacant,
        sortOrder: body.sortOrder != null ? Number(body.sortOrder) : 0,
        createdBy,
        updatedBy,
    });
}

export async function getOrgPositions(filters) {
    return orgRepository.getOrgPositions(filters);
}

export async function getOrgPositionById(orgPositionId) {
    return orgRepository.getOrgPositionById(orgPositionId);
}

export async function updateOrgPosition(orgPositionId, body, updatedBy) {
    const {
        orgPositionId: _id,
        isVacant: _isVacant,
        universityId: _universityId,
        instituteId: _instituteId,
        ...rest
    } = body;

    if (rest.employmentCategory != null && !EMPLOYMENT_CATEGORIES.has(rest.employmentCategory)) {
        throw new Error('Invalid employmentCategory');
    }

    if (rest.departmentStructureId != null) {
        const structure = await orgRepository.departmentStructureExists(rest.departmentStructureId);
        if (!structure) {
            throw new Error('departmentStructure not found');
        }
        rest.departmentStructureId = Number(rest.departmentStructureId);
    }

    if (rest.reportsToOrgPositionId !== undefined) {
        if (rest.reportsToOrgPositionId == null) {
            rest.reportsToOrgPositionId = null;
        } else {
            const reportsTo = await orgRepository.positionExists(rest.reportsToOrgPositionId);
            if (!reportsTo) {
                throw new Error('reportsToOrgPositionId not found');
            }
            rest.reportsToOrgPositionId = Number(rest.reportsToOrgPositionId);
        }
    }

    if (rest.sortOrder != null) {
        rest.sortOrder = Number(rest.sortOrder);
    }

    rest.updatedBy = updatedBy;
    return orgRepository.updateOrgPosition(orgPositionId, rest);
}

export async function deleteOrgPosition(orgPositionId) {
    return orgRepository.deleteOrgPosition(orgPositionId);
}

export async function markPositionVacant(orgPositionId, updatedBy) {
    const position = await orgRepository.positionExists(orgPositionId);
    if (!position) {
        throw new Error('orgPosition not found');
    }
    return orgRepository.markPositionVacant(orgPositionId, updatedBy);
}

export async function addHead(body, createdBy, updatedBy) {
    const position = await orgRepository.positionExists(body.orgPositionId);
    if (!position) {
        throw new Error('orgPosition not found');
    }

    const user = await orgRepository.userExists(body.userId);
    if (!user) {
        throw new Error('user not found');
    }

    if (!HOLDER_TYPES.has(body.holderType)) {
        throw new Error('Invalid holderType');
    }

    const status = body.status ?? 'ACTIVE';
    if (!HEAD_STATUSES.has(status)) {
        throw new Error('Invalid status');
    }

    if (status === 'ACTIVE') {
        const duplicate = await orgRepository.findActiveHead(
            body.orgPositionId,
            body.userId,
        );
        if (duplicate) {
            throw new Error('User already has an ACTIVE head assignment on this position');
        }
    }

    return orgRepository.addHead({
        orgPositionId: Number(body.orgPositionId),
        userId: Number(body.userId),
        holderType: body.holderType,
        status,
        joiningDate: body.joiningDate ?? null,
        endDate: body.endDate ?? null,
        createdBy,
        updatedBy,
    });
}

export async function getHeadsByPositionId(orgPositionId) {
    return orgRepository.getHeadsByPositionId(orgPositionId);
}

export async function updateHead(orgPositionHeadId, body, updatedBy) {
    const {
        orgPositionHeadId: _id,
        orgPositionId: _positionId,
        userId: _userId,
        universityId: _universityId,
        instituteId: _instituteId,
        ...rest
    } = body;

    if (rest.holderType != null && !HOLDER_TYPES.has(rest.holderType)) {
        throw new Error('Invalid holderType');
    }
    if (rest.status != null && !HEAD_STATUSES.has(rest.status)) {
        throw new Error('Invalid status');
    }

    return orgRepository.updateHead(
        orgPositionHeadId,
        rest,
        updatedBy,
    );
}

export async function deleteHead(orgPositionHeadId, updatedBy) {
    return orgRepository.deleteHead(orgPositionHeadId, updatedBy);
}
