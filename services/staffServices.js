import * as StaffCreationService  from "../repository/staffRepository.js";

export async function addStaff(staffData, createdBy, updatedBy,universityId) {

        staffData.createdBy = createdBy;
        staffData.updatedBy = updatedBy;
        staffData.universityId = universityId;
        const Staff = await StaffCreationService.addStaff(staffData);
        return Staff;
};

export async function getStaffDetails(universityId) {
    return await StaffCreationService.getStaffDetails(universityId);
}

export async function getSingleStaffDetails(staffId,universityId) {
    return await StaffCreationService.getSingleStaffDetails(staffId,universityId);
}

export async function deleteStaff(staffId) {
    return await StaffCreationService.deleteStaff(staffId);
}

export async function updateStaff(staffId, staffData, updatedBy) {    

    staffData.updatedBy = updatedBy;
    await StaffCreationService.updateStaff(staffId, staffData);
}