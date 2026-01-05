import * as creditRepository  from "../repository/creditRepository.js";

export async function addCredit(credits,createdBy,updatedBy,universityId,instituteId) {
  const creditData = credits.map(item => ({
    ...item,
    createdBy,
    updatedBy,
    universityId,
    instituteId
  }));

  const result = await creditRepository.addCredit(creditData);
  return result;
}


export async function getCreditDetails(universityId,courseId,sessionId,role,instituteId) {
    return await creditRepository.getCreditDetails(universityId,courseId,sessionId,role,instituteId);
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