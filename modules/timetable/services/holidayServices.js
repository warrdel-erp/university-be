import * as holidayCreationService from "../repository/holidayRepository.js";
import { withAuditEvent } from "../../../utility/audit/withAuditEvent.js";
import { AUDIT_EVENTS } from "../../../const/auditEvents.js";

export async function addHoliday(holidayData, createdBy, updatedBy) {
    holidayData.createdBy = createdBy;
    holidayData.updatedBy = updatedBy;
    return await withAuditEvent(AUDIT_EVENTS.HOLIDAY_CREATE, async ({ transaction }) => {
        return await holidayCreationService.addHoliday(holidayData, { transaction });
    });
};

export async function getAllHolidays(filter) {
    return await holidayCreationService.getAllHolidays(filter);
}

export async function getHolidayDetails(page, limit, filter) {
    return await holidayCreationService.getHolidayDetails(page, limit, filter);
}

export async function getSingleHolidayDetails(holidayId) {
    return await holidayCreationService.getSingleHolidayDetails(holidayId);
}

export async function deleteHoliday(holidayId) {
    return await withAuditEvent(AUDIT_EVENTS.HOLIDAY_DELETE, async ({ transaction }) => {
        return await holidayCreationService.deleteHoliday(holidayId, { transaction });
    });
}

export async function updateHoliday(holidayId, holidayData, updatedBy) {    
    holidayData.updatedBy = updatedBy;
    return await withAuditEvent(AUDIT_EVENTS.HOLIDAY_UPDATE, async ({ transaction }) => {
        return await holidayCreationService.updateHoliday(holidayId, holidayData, { transaction });
    });
}
