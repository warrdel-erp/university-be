import * as acedmicYearCreationService  from "../repository/acedmicYearRepository.js";

export async function addacedmicYear(acedmicYearData, createdBy, updatedBy,universityId) {

        acedmicYearData.createdBy = createdBy;
        acedmicYearData.updatedBy = updatedBy;
        acedmicYearData.universityId = universityId;
        const acedmicYear = await acedmicYearCreationService.addacedmicYear(acedmicYearData);
        return acedmicYear;
};

export async function getacedmicYearDetails(universityId) {
    return await acedmicYearCreationService.getacedmicYearDetails(universityId);
}

export async function getSingleacedmicYearDetails(acedmicYearId,universityId) {
    return await acedmicYearCreationService.getSingleacedmicYearDetails(acedmicYearId,universityId);
}

export async function updateacedmicYear(acedmicYearId, acedmicYearData, updatedBy) {    
        acedmicYearData.updatedBy = updatedBy;
       return await acedmicYearCreationService.updateacedmicYear(acedmicYearId, acedmicYearData);
}

export async function deleteacedmicYear(acedmicYearId) {
    return await acedmicYearCreationService.deleteacedmicYear(acedmicYearId);
}