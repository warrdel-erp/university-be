import * as departmentCreationRepository from "../repository/departmentRepository.js";
import { withAuditEvent } from "../../../utility/audit/withAuditEvent.js";
import { AUDIT_EVENTS } from "../../../const/auditEvents.js";

export async function addDepartment(departmentData, createdBy, updatedBy) {
    return await withAuditEvent(AUDIT_EVENTS.DEPARTMENT_CREATE, async ({ transaction }) => {
        const { departmentId, parentDepartmentId, ...rest } = departmentData;
        rest.createdBy = createdBy;
        rest.updatedBy = updatedBy;

        if (departmentId != null) {
            return await departmentCreationRepository.addParentDepartment(departmentId, rest, { transaction });
        }

        return await departmentCreationRepository.addDepartment(rest, parentDepartmentId, { transaction });
    });
}

export async function getDepartmentDetails() {
    return await departmentCreationRepository.getDepartmentDetails();
}

export async function getSingleDepartmentDetails(departmentId) {
    return await departmentCreationRepository.getSingleDepartmentDetails(departmentId);
}

export async function deleteDepartment(departmentId) {
    return await withAuditEvent(AUDIT_EVENTS.DEPARTMENT_DELETE, async ({ transaction }) => {
        return await departmentCreationRepository.deleteDepartment(departmentId, { transaction });
    });
}

export async function updateDepartment(departmentId, departmentData, updatedBy) {
    return await withAuditEvent(AUDIT_EVENTS.DEPARTMENT_UPDATE, async ({ transaction }) => {
        const {
            instituteId: _instituteId,
            universityId: _universityId,
            departmentId: _departmentId,
            isDefault: _isDefault,
            ...updateData
        } = departmentData;
        updateData.updatedBy = updatedBy;
        return await departmentCreationRepository.updateDepartment(departmentId, updateData, { transaction });
    });
}

export async function getDepartmentByIdEmployee(departmentId) {
    const department = await departmentCreationRepository.getSingleDepartmentDetails(departmentId);
    if (!department) {
        return null;
    }

    return await departmentCreationRepository.employeeDetail(departmentId);
}

export { createDefaultDepartmentsForInstitute } from "../repository/departmentRepository.js";
