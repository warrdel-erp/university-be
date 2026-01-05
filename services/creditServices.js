import * as creditRepository  from "../repository/creditRepository.js";

export async function addCredit(creditData, createdBy, updatedBy,universityId,instituteId) {

        creditData.createdBy = createdBy;
        creditData.updatedBy = updatedBy;
        creditData.universityId =universityId;
        creditData.instituteId = instituteId 
        const Credit = await creditRepository.addCredit(creditData);
        return Credit;
};

export async function getCreditDetails(universityId,acedmicYearId,role,instituteId) {
    return await creditRepository.getCreditDetails(universityId,acedmicYearId,role,instituteId);
}

export async function getSingleCreditDetails(creditId,universityId) {
    return await creditRepository.getSingleCreditDetails(creditId,universityId);
}

export async function deleteCredit(creditId) {
    return await creditRepository.deleteCredit(creditId);
}

export async function updateCredit(creditId, creditData, updatedBy) {    

    creditData.updatedBy = updatedBy;
    await creditRepository.updateCredit(creditId, creditData);
}