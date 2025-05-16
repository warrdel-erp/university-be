import * as feeGroupCreationService  from "../repository/feeGroupRepository.js";

export async function addFeeGroup(FeeGroupData, createdBy, updatedBy) {

        FeeGroupData.createdBy = createdBy;
        FeeGroupData.updatedBy = updatedBy;
        const FeeGroup = await feeGroupCreationService.addFeeGroup(FeeGroupData);
        return FeeGroup;
};

export async function getFeeGroupDetails(universityId,acedmicYearId) {
    return await feeGroupCreationService.getFeeGroupDetails(universityId,acedmicYearId);
}

export async function getSingleFeeGroupDetails(feeGroupId,universityId) {
    return await feeGroupCreationService.getSingleFeeGroupDetails(feeGroupId,universityId);
}

export async function updateFeeGroup(feeGroupId, FeeGroupData, updatedBy) {    
        FeeGroupData.updatedBy = updatedBy;
       return await feeGroupCreationService.updateFeeGroup(feeGroupId, FeeGroupData);
}

export async function deleteFeeGroup(feeGroupId) {
    return await feeGroupCreationService.deleteFeeGroup(feeGroupId);
}