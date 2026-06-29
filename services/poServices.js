import * as poCreationService from "../repository/poRepository.js";

export async function addPo(poData, createdBy, updatedBy) {
  poData.createdBy = createdBy;
  poData.updatedBy = updatedBy;
  return poCreationService.addPo(poData);
}

export async function getPoDetails() {
  return poCreationService.getPoDetails();
}

export async function getSinglePoDetails(poId) {
  return poCreationService.getSinglePoDetails(poId);
}

export async function updatePo(poId, poData, updatedBy) {
  poData.updatedBy = updatedBy;
  return poCreationService.updatePo(poId, poData);
}

export async function deletePo(poId) {
  return poCreationService.deletePo(poId);
}
