import * as StaffCreationService from "../repository/staffRepository.js";
import { withAuditEvent } from "../../../utility/audit/withAuditEvent.js";
import { AUDIT_EVENTS } from "../../../const/auditEvents.js";

export async function addStaff(staffData, createdBy, updatedBy) {
    staffData.createdBy = createdBy;
    staffData.updatedBy = updatedBy;
    return withAuditEvent(AUDIT_EVENTS.STAFF_CREATE, async ({ transaction }) => {
        return await StaffCreationService.addStaff(staffData, transaction);
    });
}

export async function getStaffDetails() {
    return await StaffCreationService.getStaffDetails();
}

export async function getSingleStaffDetails(staffId) {
    return await StaffCreationService.getSingleStaffDetails(staffId);
}

export async function deleteStaff(staffId) {
    return withAuditEvent(AUDIT_EVENTS.STAFF_DELETE, async ({ transaction }) => {
        return await StaffCreationService.deleteStaff(staffId, transaction);
    });
}

export async function updateStaff(staffId, staffData, updatedBy) {
    staffData.updatedBy = updatedBy;
    return withAuditEvent(AUDIT_EVENTS.STAFF_UPDATE, async ({ transaction }) => {
        return await StaffCreationService.updateStaff(staffId, staffData, transaction);
    });
}
