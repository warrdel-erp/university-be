import * as feeTypeCreationService from "../repository/feeTypeRepository.js";

export async function addFeeType(feeTypeData, createdBy, updatedBy) {
  feeTypeData.createdBy = createdBy;
  feeTypeData.updatedBy = updatedBy;
  return feeTypeCreationService.addFeeType(feeTypeData);
}

export async function getFeeTypeDetails(filters = {}) {
  return feeTypeCreationService.getFeeTypeDetails(filters);
}

export async function getSingleFeeTypeDetails(feeTypeId) {
  return feeTypeCreationService.getSingleFeeTypeDetails(feeTypeId);
}

export async function updateFeeType(feeTypeId, feeTypeData, updatedBy) {
  feeTypeData.updatedBy = updatedBy;
  return feeTypeCreationService.updateFeeType(feeTypeId, feeTypeData);
}

export async function deleteFeeType(feeTypeId) {
  return feeTypeCreationService.deleteFeeType(feeTypeId);
}
