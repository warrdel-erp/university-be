import * as departmentPositionsRepository from "../repository/departmentPositionsRepository.js";
import { withAuditEvent } from "../../../utility/audit/withAuditEvent.js";
import { AUDIT_EVENTS } from "../../../const/auditEvents.js";

export async function addOrgPosition(body, createdBy, updatedBy) {
    return await withAuditEvent(AUDIT_EVENTS.DEPARTMENT_POSITION_CREATE, async ({ transaction }) => {
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
            isLevelHead,
            sortOrder: body.sortOrder ?? 0,
            level: body.level,
            createdBy,
            updatedBy,
        }, { transaction });
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
    return await withAuditEvent(AUDIT_EVENTS.DEPARTMENT_POSITION_UPDATE, async ({ transaction }) => {
        const {
            departmentPositionId: _id,
            universityId: _universityId,
            instituteId: _instituteId,
            isDefault: _isDefault,
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
        return departmentPositionsRepository.updateOrgPosition(departmentPositionId, rest, { transaction });
    });
}

export async function deleteOrgPosition(departmentPositionId, updatedBy) {
    return await withAuditEvent(AUDIT_EVENTS.DEPARTMENT_POSITION_DELETE, async ({ transaction }) => {
        return departmentPositionsRepository.deleteOrgPosition(departmentPositionId, updatedBy, { transaction });
    });
}

export async function addHead(body, createdBy, updatedBy) {
    return await withAuditEvent(AUDIT_EVENTS.USER_DEPARTMENT_POSITION_CREATE, async ({ transaction }) => {
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
            transaction,
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
        }, { transaction });
    });
}

export async function getHeadsByPositionId(departmentPositionId) {
    return departmentPositionsRepository.getHeadsByPositionId(departmentPositionId);
}

export async function updateHead(userDepartmentPositionId, body, updatedBy) {
    return await withAuditEvent(AUDIT_EVENTS.USER_DEPARTMENT_POSITION_UPDATE, async ({ transaction }) => {
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
            { transaction },
        );
    });
}

export async function deleteHead(userDepartmentPositionId, updatedBy, endDate) {
    return await withAuditEvent(AUDIT_EVENTS.USER_DEPARTMENT_POSITION_DELETE, async ({ transaction }) => {
        return departmentPositionsRepository.deleteHead(
            userDepartmentPositionId,
            updatedBy,
            endDate,
            { transaction },
        );
    });
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
