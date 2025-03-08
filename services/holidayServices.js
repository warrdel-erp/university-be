import * as holidayCreationService  from "../repository/holidayRepository.js";

export async function addHoliday(holidayData, createdBy, updatedBy) {

    holidayData.createdBy = createdBy;
    holidayData.updatedBy = updatedBy;
    const Holiday = await holidayCreationService.addHoliday(holidayData);
    return Holiday;
};

export async function getHolidayDetails(universityId) {
    return await holidayCreationService.getHolidayDetails(universityId);
}

export async function getSingleHolidayDetails(holidayId,universityId) {
    return await holidayCreationService.getSingleHolidayDetails(holidayId,universityId);
}

export async function deleteHoliday(holidayId) {
    return await holidayCreationService.deleteHoliday(holidayId);
}

export async function updateHoliday(holidayId, holidayData, updatedBy) {    

    holidayData.updatedBy = updatedBy;
    await holidayCreationService.updateHoliday(holidayId, holidayData);
}