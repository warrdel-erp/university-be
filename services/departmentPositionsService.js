import * as departmentPositionsRepository from '../repository/departmentPositionsRepository.js';

export async function addOrgPosition(body, createdBy, updatedBy) {
    let departmentId = null;
    if (body.departmentId != null) {
        const department = await departmentPositionsRepository.departmentExists(body.departmentId);
        if (!department) {
            throw new Error('departmentId not found');
        }
        departmentId = body.departmentId;
    }

    const isLevelHead = body.isLevelHead === true;
    if (isLevelHead && departmentId == null) {
        throw new Error('departmentId is required when isLevelHead is true');
    }

    return departmentPositionsRepository.addOrgPosition({
        departmentId,
        positionName: body.positionName,
        positionCode: body.positionCode ?? null,
        employmentCategory: body.employmentCategory,
        reportingType: body.reportingType ?? null,
        isVacant: body.isVacant === undefined ? true : body.isVacant,
        isLevelHead,
        publishStatus: body.publishStatus ?? 'DRAFT',
        sortOrder: body.sortOrder ?? 0,
        level: body.level,
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

    const existing = await departmentPositionsRepository.getOrgPositionById(departmentPositionId);
    if (!existing) {
        return false;
    }

    if (rest.departmentId !== undefined) {
        if (rest.departmentId != null) {
            const department = await departmentPositionsRepository.departmentExists(rest.departmentId);
            if (!department) {
                throw new Error('departmentId not found');
            }
        }
    }

    const nextDepartmentId = rest.departmentId !== undefined
        ? rest.departmentId
        : existing.departmentId;
    const nextIsLevelHead = rest.isLevelHead !== undefined
        ? rest.isLevelHead === true
        : existing.isLevelHead === true;

    if (nextIsLevelHead && nextDepartmentId == null) {
        throw new Error('departmentId is required when isLevelHead is true');
    }

    rest.updatedBy = updatedBy;
    return departmentPositionsRepository.updateOrgPosition(departmentPositionId, rest);
}

export async function deleteOrgPosition(departmentPositionId, updatedBy) {
    return departmentPositionsRepository.deleteOrgPosition(departmentPositionId, updatedBy);
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

    const duplicate = await departmentPositionsRepository.findActiveHead(
        body.departmentPositionId,
        body.userId,
    );
    if (duplicate) {
        throw new Error('User already has an ACTIVE head assignment on this position');
    }

    return departmentPositionsRepository.addHead({
        departmentPositionId: body.departmentPositionId,
        userId: body.userId,
        status: 'ACTIVE',
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
        status: _status,
        ...rest
    } = body;

    return departmentPositionsRepository.updateHead(
        userDepartmentPositionId,
        rest,
        updatedBy,
    );
}

export async function deleteHead(userDepartmentPositionId, updatedBy, endDate) {
    return departmentPositionsRepository.deleteHead(
        userDepartmentPositionId,
        updatedBy,
        endDate,
    );
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
