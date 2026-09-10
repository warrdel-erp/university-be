import * as feeInvoiceRecordRepository from "../repository/feeInvoiceDetailRecordRepository.js";
import * as feeInvoiceRepository from "../repository/feeInvoiceRepository.js";

export async function addFeeInvoiceDetailRecord(feeInvoiceArray, createdBy, updatedBy) {
  const dataWithMeta = feeInvoiceArray.map((record) => ({
    ...record,
    createdBy,
    updatedBy,
    isApplyed: false,
  }));

  return feeInvoiceRecordRepository.addFeeInvoiceDetailRecord(dataWithMeta);
}

export async function getAllFeeInvoiceDetailRecord(filters = {}) {
  const invoices = await feeInvoiceRepository.getFeeInvoiceDetails(filters);

  return (invoices || []).map((feeInvoice) => ({
    feeInvoiceId: feeInvoice.feeInvoiceId,
    invoiceNumber: feeInvoice.invoiceNumber,
    student: {
      studentId: feeInvoice.studentId,
      name: `${feeInvoice?.feeInvoiceStudent?.firstName || ""} ${feeInvoice?.feeInvoiceStudent?.lastName || ""}`.trim(),
      scholarNumber: feeInvoice?.feeInvoiceStudent?.scholarNumber,
      section: feeInvoice?.feeInvoiceStudent?.studentClassSectionTerm?.classSection?.section,
    },
    invoiceDetails: (feeInvoice.feeInvoiceDetails || []).map((detail) => ({
      feeInvoiceDetailsId: detail.feeInvoiceDetailsId,
      amount: detail.amount,
      subTotal: detail.subTotal,
      waiver: detail.waiver,
      feePlanTypeId: detail.feePlanTypeId,
      feePlanSemesterId: detail.feePlanSemesterId,
      invoiceDetailNumber: detail.invoiceDetailNumber,
      paidAmount: detail.paidAmount || 0,
      paymentDate: null,
      paymentMethod: null,
      paymentStatus: null,
      referenceNumber: null,
      isApplied: false,
      feeInvoiceDetailsRecordId: null,
    })),
  }));
}

export async function getSingleFeeInvoiceDetails(feeInvoiceId) {
  return feeInvoiceRecordRepository.getSingleFeeInvoiceDetails(feeInvoiceId);
}
