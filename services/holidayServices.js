import * as holidayCreationService  from "../repository/holidayRepository.js";

export async function addHoliday(holidayData, createdBy, updatedBy) {

    holidayData.createdBy = createdBy;
    holidayData.updatedBy = updatedBy;
    const Holiday = await holidayCreationService.addHoliday(holidayData);
    return Holiday;
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
    return await holidayCreationService.deleteHoliday(holidayId);
}

export async function updateHoliday(holidayId, holidayData, updatedBy) {    

    holidayData.updatedBy = updatedBy;
    await holidayCreationService.updateHoliday(holidayId, holidayData);
}