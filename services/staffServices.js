import * as StaffCreationService from "../repository/staffRepository.js";

export async function addStaff(staffData, createdBy, updatedBy) {
    staffData.createdBy = createdBy;
    staffData.updatedBy = updatedBy;
    return await StaffCreationService.addStaff(staffData);
}

export async function getStaffDetails() {
    return await StaffCreationService.getStaffDetails();
}

export async function getSingleStaffDetails(staffId) {
    return await StaffCreationService.getSingleStaffDetails(staffId);
}

export async function deleteStaff(staffId) {
    return await StaffCreationService.deleteStaff(staffId);
}

export async function updateStaff(staffId, staffData, updatedBy) {
    staffData.updatedBy = updatedBy;
    await StaffCreationService.updateStaff(staffId, staffData);
}
