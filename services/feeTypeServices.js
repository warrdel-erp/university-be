import * as feeTypeCreationService  from "../repository/feeTypeRepository.js";

export async function addFeeType(FeeTypeData, createdBy, updatedBy) {

        FeeTypeData.createdBy = createdBy;
        FeeTypeData.updatedBy = updatedBy;
        const FeeType = await feeTypeCreationService.addFeeType(FeeTypeData);
        return FeeType;
};

export async function getFeeTypeDetails(universityId) {
    return await feeTypeCreationService.getFeeTypeDetails(universityId);
}

export async function getSingleFeeTypeDetails(feeTypeId,universityId) {
    return await feeTypeCreationService.getSingleFeeTypeDetails(feeTypeId,universityId);
}

export async function updateFeeType(feeTypeId, FeeTypeData, updatedBy) {    
        FeeTypeData.updatedBy = updatedBy;
       return await feeTypeCreationService.updateFeeType(feeTypeId, FeeTypeData);
}

export async function deleteFeeType(feeTypeId) {
    return await feeTypeCreationService.deleteFeeType(feeTypeId);
}