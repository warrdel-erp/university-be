import * as feeGroupCreationService from "../repository/feeGroupRepository.js";

export async function addFeeGroup(feeGroupData, createdBy, updatedBy) {
  feeGroupData.createdBy = createdBy;
  feeGroupData.updatedBy = updatedBy;
  return feeGroupCreationService.addFeeGroup(feeGroupData);
}

export async function getFeeGroupDetails(filters = {}) {
  return feeGroupCreationService.getFeeGroupDetails(filters);
}

export async function getSingleFeeGroupDetails(feeGroupId) {
  return feeGroupCreationService.getSingleFeeGroupDetails(feeGroupId);
}

export async function updateFeeGroup(feeGroupId, feeGroupData, updatedBy) {
  feeGroupData.updatedBy = updatedBy;
  return feeGroupCreationService.updateFeeGroup(feeGroupId, feeGroupData);
}

export async function deleteFeeGroup(feeGroupId) {
  return feeGroupCreationService.deleteFeeGroup(feeGroupId);
}
