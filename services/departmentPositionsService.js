import * as departmentPositionsRepository from '../repository/departmentPositionsRepository.js';

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
        const department = await departmentPositionsRepository.departmentExists(body.departmentId);
        if (!department) {
            throw new Error('departmentId not found');
        }
        departmentId = Number(body.departmentId);
    }

    const isVacant = body.isVacant === undefined ? true : Boolean(body.isVacant);

    return departmentPositionsRepository.addOrgPosition({
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
    return departmentPositionsRepository.getOrgPositions(filters);
}

export async function getOrgCardsStats(changePeriod) {
    return departmentPositionsRepository.getOrgCardsStats(changePeriod);
}

export async function getOrgPositionById(departmentPositionId) {
    return departmentPositionsRepository.getOrgPositionById(departmentPositionId);
}

export async function updateOrgPosition(departmentPositionId, body, updatedBy) {
    const {
        departmentPositionId: _id,
        isVacant: _isVacant,
        universityId: _universityId,
        instituteId: _instituteId,
        ...rest
    } = body;

    if (rest.employmentCategory != null && !EMPLOYMENT_CATEGORIES.has(rest.employmentCategory)) {
        throw new Error('Invalid employmentCategory');
    }

    if (rest.departmentId !== undefined) {
        if (rest.departmentId == null) {
            rest.departmentId = null;
        } else {
            const department = await departmentPositionsRepository.departmentExists(rest.departmentId);
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
    return departmentPositionsRepository.updateOrgPosition(departmentPositionId, rest);
}

export async function deleteOrgPosition(departmentPositionId) {
    return departmentPositionsRepository.deleteOrgPosition(departmentPositionId);
}

export async function markPositionVacant(departmentPositionId, updatedBy) {
    const position = await departmentPositionsRepository.positionExists(departmentPositionId);
    if (!position) {
        throw new Error('departmentPosition not found');
    }
    return departmentPositionsRepository.markPositionVacant(departmentPositionId, updatedBy);
}

export async function addHead(body, createdBy, updatedBy) {
    const position = await departmentPositionsRepository.positionExists(body.departmentPositionId);
    if (!position) {
        throw new Error('departmentPosition not found');
    }

    const user = await departmentPositionsRepository.userExists(body.userId);
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
        const duplicate = await departmentPositionsRepository.findActiveHead(
            body.departmentPositionId,
            body.userId,
        );
        if (duplicate) {
            throw new Error('User already has an ACTIVE head assignment on this position');
        }
    }

    return departmentPositionsRepository.addHead({
        departmentPositionId: Number(body.departmentPositionId),
        userId: Number(body.userId),
        holderType: body.holderType,
        status,
        joiningDate: body.joiningDate ?? null,
        endDate: body.endDate ?? null,
        createdBy,
        updatedBy,
    });
}

export async function getHeadsByPositionId(departmentPositionId) {
    return departmentPositionsRepository.getHeadsByPositionId(departmentPositionId);
}

export async function updateHead(userDepartmentPositionId, body, updatedBy) {
    const {
        userDepartmentPositionId: _id,
        departmentPositionId: _positionId,
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

    return departmentPositionsRepository.updateHead(
        userDepartmentPositionId,
        rest,
        updatedBy,
    );
}

export async function deleteHead(userDepartmentPositionId, updatedBy) {
    return departmentPositionsRepository.deleteHead(userDepartmentPositionId, updatedBy);
}

export async function getOrgTreeData() {
    return departmentPositionsRepository.getOrgTreeData();
}

export async function getOrgChart() {
    return departmentPositionsRepository.getOrgChartData();
}

export async function getPositionsByDepartment(departmentId) {
    return departmentPositionsRepository.getPositionsByDepartment(departmentId);
}
