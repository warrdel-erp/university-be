import * as FeeInvoiceDetailsCreationService from "../repository/feeInvoiceDetailsRepository.js";

export async function addFeeInvoiceDetails(feeInvoiceDetailsData, createdBy, updatedBy) {
  feeInvoiceDetailsData.createdBy = createdBy;
  feeInvoiceDetailsData.updatedBy = updatedBy;
  return FeeInvoiceDetailsCreationService.addFeeInvoiceDetails(feeInvoiceDetailsData);
}

export async function getFeeInvoiceDetailsDetails() {
  return FeeInvoiceDetailsCreationService.getFeeInvoiceDetailsDetails();
}

export async function getSingleFeeInvoiceDetails(feeInvoiceDetailsId) {
  return FeeInvoiceDetailsCreationService.getSingleFeeInvoiceDetails(feeInvoiceDetailsId);
}

export async function updateFeeInvoiceDetails(feeInvoiceDetailsId, feeInvoiceDetailsData, updatedBy) {
  feeInvoiceDetailsData.updatedBy = updatedBy;
  return FeeInvoiceDetailsCreationService.updateFeeInvoiceDetails(
    feeInvoiceDetailsId,
    feeInvoiceDetailsData
  );
}

export async function deleteFeeInvoiceDetails(feeInvoiceDetailsId) {
  return FeeInvoiceDetailsCreationService.deleteFeeInvoiceDetails(feeInvoiceDetailsId);
}
