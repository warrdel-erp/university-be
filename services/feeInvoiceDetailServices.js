import * as FeeInvoiceDetailsCreationService  from "../repository/feeInvoiceDetailsRepository.js";

export async function addFeeInvoiceDetails(feeInvoiceDetailsData, createdBy, updatedBy) {

        feeInvoiceDetailsData.createdBy = createdBy;
        feeInvoiceDetailsData.updatedBy = updatedBy;
        const feeInvoiceDetails = await FeeInvoiceDetailsCreationService.addFeeInvoiceDetails(feeInvoiceDetailsData);
        return feeInvoiceDetails;
};

export async function getFeeInvoiceDetailsDetails(universityId) {
    return await FeeInvoiceDetailsCreationService.getFeeInvoiceDetailsDetails(universityId);
}

export async function getSingleFeeInvoiceDetails(feeInvoiceDetailsId,universityId) {
    return await FeeInvoiceDetailsCreationService.getSingleFeeInvoiceDetails(feeInvoiceDetailsId,universityId);
}

export async function updateFeeInvoiceDetails(feeInvoiceDetailsId, feeInvoiceDetailsData, updatedBy) {    
        feeInvoiceDetailsData.updatedBy = updatedBy;
       return await FeeInvoiceDetailsCreationService.updateFeeInvoiceDetails(feeInvoiceDetailsId, feeInvoiceDetailsData);
}

export async function deleteFeeInvoiceDetails(feeInvoiceDetailsId) {
    return await FeeInvoiceDetailsCreationService.deleteFeeInvoiceDetails(feeInvoiceDetailsId);
}