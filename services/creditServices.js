import * as creditRepository from '../repository/creditRepository.js';

export async function addCredit(credits, createdBy, updatedBy) {
  const creditData = credits.map((item) => ({
    ...item,
    createdBy,
    updatedBy,
  }));

  return await creditRepository.addCredit(creditData);
}

export async function getCreditDetails(courseId, sessionId) {
  return await creditRepository.getCreditDetails(courseId, sessionId);
}

export async function getSingleCreditDetails(creditId) {
  return await creditRepository.getSingleCreditDetails(creditId);
}

export async function deleteCredit(creditId) {
  return await creditRepository.deleteCredit(creditId);
}

export async function updateCredit(creditId, creditData, updatedBy) {
  creditData.updatedBy = updatedBy;
  await creditRepository.updateCredit(creditId, creditData);
}
