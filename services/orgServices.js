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
    if (!EMPLOYMENT_CATEGORIES.has(body.employmentCategory)) {
        throw new Error('Invalid employmentCategory');
    }

    let departmentId = null;
    if (body.departmentId != null) {
        const department = await orgRepository.departmentExists(body.departmentId);
        if (!department) {
            throw new Error('departmentId not found');
        }
        departmentId = Number(body.departmentId);
    }

    const isVacant = body.isVacant === undefined ? true : Boolean(body.isVacant);

    return orgRepository.addOrgPosition({
        departmentId,
        positionName: body.positionName,
        positionCode: body.positionCode ?? null,
        employmentCategory: body.employmentCategory,
        reportingType: body.reportingType ?? null,
        isVacant,
        sortOrder: body.sortOrder != null ? Number(body.sortOrder) : 0,
        level: Number(body.level),
        createdBy,
        updatedBy,
    });
}

export async function getOrgPositions(filters) {
    return orgRepository.getOrgPositions(filters);
}

export async function getOrgCardsStats() {
    return orgRepository.getOrgCardsStats();
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

    if (rest.departmentStructureId !== undefined) {
        if (rest.departmentStructureId == null) {
            rest.departmentStructureId = null;
        } else {
            const structure = await orgRepository.departmentStructureExists(rest.departmentStructureId);
            if (!structure) {
                throw new Error('departmentStructure not found');
            }
            rest.departmentStructureId = Number(rest.departmentStructureId);
        }
    }

    if (rest.departmentId !== undefined) {
        if (rest.departmentId == null) {
            rest.departmentId = null;
        } else {
            const department = await orgRepository.departmentExists(rest.departmentId);
            if (!department) {
                throw new Error('departmentId not found');
            }
            rest.departmentId = Number(rest.departmentId);
        }
    }

    if (rest.sortOrder != null) {
        rest.sortOrder = Number(rest.sortOrder);
    }

    if (rest.level != null) {
        rest.level = Number(rest.level);
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

export async function getOrgTreeData() {
    return orgRepository.getOrgTreeData();
}

export async function getOrgChart() {
    return orgRepository.getOrgChartData();
}

export async function getPositionsByDepartment(departmentId) {
    return orgRepository.getPositionsByDepartment(departmentId);
}
