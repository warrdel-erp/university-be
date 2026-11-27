import * as codeMasterRepository from '../repository/codeMasterRepository.js';
import { withAuditEvent } from '../utility/audit/withAuditEvent.js';
import { AUDIT_EVENTS } from '../const/auditEvents.js';

export async function getAllEmployeeType() {
    return codeMasterRepository.getAllEmployeeType();
}

export async function addEmployeeCode(data, createdBy) {
    return await withAuditEvent(AUDIT_EVENTS.CODE_MASTER_CREATE, async ({ transaction }) => {
        await codeMasterRepository.getCodeMasterById(data.employeeCodeMasterId, { transaction });
        const {
            universityId: _universityId,
            instituteId: _instituteId,
            createdBy: _createdBy,
            ...payload
        } = data;
        return codeMasterRepository.addEmployeeCode({
            ...payload,
            createdBy,
        }, { transaction });
    });
}

export async function getEmployeeCodesTypes(employeeCodeMasterId, key, search) {
    return codeMasterRepository.getEmployeeCodesTypes(employeeCodeMasterId, key, search);
}

export async function updateCodeMasterType(employeeCodeMasterTypeId, info) {
    return await withAuditEvent(AUDIT_EVENTS.CODE_MASTER_UPDATE, async ({ transaction }) => {
        const {
            instituteId: _instituteId,
            universityId: _universityId,
            employeeCodeMasterTypeId: _typeId,
            employeeCodeMasterId: _masterId,
            createdBy: _createdBy,
            ...updateData
        } = info;
        return codeMasterRepository.updateCodeMasterType(employeeCodeMasterTypeId, updateData, { transaction });
    });
}

export async function deleteCodeMasterType(employeeCodeMasterTypeId) {
    return await withAuditEvent(AUDIT_EVENTS.CODE_MASTER_DELETE, async ({ transaction }) => {
        return codeMasterRepository.deleteCodeMasterType(employeeCodeMasterTypeId, { transaction });
    });
}
