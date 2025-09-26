import * as feeInvoiceRecordRepository  from "../repository/feeInvoiceDetailRecordRepository.js";
import * as FeeInvoiceDetailsCreationService  from "../repository/feeInvoiceDetailsRepository.js";
import sequelize from '../database/sequelizeConfig.js'; 
import { getInstituteCode } from "../repository/collegeRepository.js";
import moment from 'moment';
import * as repository from "../repository/feeInvoiceDetailRecordRepository.js";

export async function addFeeInvoiceDetailRecord(feeInvoiceArray, createdBy, updatedBy, instituteId) {
  const dataWithMeta = feeInvoiceArray.map(record => ({
    ...record,
    createdBy,
    updatedBy,
    instituteId
  }));

  const createdRecords = await feeInvoiceRecordRepository.addFeeInvoiceDetailRecord(dataWithMeta);
  return createdRecords;
}


export async function getAllFeeInvoiceDetailRecord(universityId, acedmicYearId, instituteId, role) {

    const allDeposit = await feeInvoiceRecordRepository.getAllFeeInvoiceDetailRecord(universityId, acedmicYearId, instituteId, role);
    const invoiceMap = {};

    for (const item of allDeposit || []) {
        const feeInvoice = item?.feeInvoice;
        if (!feeInvoice) continue;

        const feeInvoiceId = feeInvoice?.feeInvoiceId;

        if (!invoiceMap[feeInvoiceId]) {
            invoiceMap[feeInvoiceId] = {
                feeInvoiceId: feeInvoiceId,
                invoiceNumber: feeInvoice.invoiceNumber,
                student: {
                    studentId: feeInvoice?.studentId,
                    name: `${feeInvoice?.feeStudentMapper?.studentMapped?.firstName || ""} ${feeInvoice?.feeStudentMapper?.studentMapped?.lastName || ""}`,
                    scholarNumber: feeInvoice?.feeStudentMapper?.studentMapped?.scholarNumber,
                    section: feeInvoice?.feeStudentMapper?.studentSectionDetail?.section,
                },
                invoiceDetails: [],
            };
        }

        const invoiceDetailsArray = feeInvoice.invoiceDetails || [];

        for (const detail of invoiceDetailsArray) {
            let matchingPayment = null;
            if (item?.feeInvoiceDetailsId === detail?.feeInvoiceDetailsId) {
                matchingPayment = {
                    paidAmount: item?.paidAmount || 0,
                    paymentDate: item?.paymentDate || null,
                    paymentMethod: item?.paymentMethod || null,
                    paymentStatus: item?.paymentStatus || null,
                    referenceNumber: item?.referenceNumber || null,
                    isApplied: item?.isApplyed || false,
                    feeInvoiceDetailsRecordId: item?.feeInvoiceDetailsRecordId || null,
                };
            }
            const exists = invoiceMap[feeInvoiceId].invoiceDetails.find(
                d => d.feeInvoiceDetailsId === detail?.feeInvoiceDetailsId
            );

            if (!exists) {
                invoiceMap[feeInvoiceId].invoiceDetails.push({
                    feeInvoiceDetailsId: detail?.feeInvoiceDetailsId,
                    amount: detail?.amount,
                    subTotal: detail?.subTotal,
                    waiver: detail?.waiver,
                    feePlanTypeId: detail?.feePlanTypeId,
                    feePlanSemesterId: detail?.feePlanSemesterId,
                    invoiceDetailNumber: detail?.invoiceDetailNumber,
                    ...(matchingPayment || {
                        paidAmount: 0,
                        paymentDate: null,
                        paymentMethod: null,
                        paymentStatus: null,
                        referenceNumber: null,
                        isApplied: false,
                        feeInvoiceDetailsRecordId: null,
                    })
                });
            } else {
                // If detail exists and we have matching payment info, update it
                if (matchingPayment) {
                    Object.assign(exists, matchingPayment);
                }
            }
        }
    }

    const cleanInvoices = Object.values(invoiceMap);
    return cleanInvoices;
};

export async function getSingleFeeInvoiceDetails(feeInvoiceId,universityId) {
    return await feeInvoiceRecordRepository.getSingleFeeInvoiceDetails(feeInvoiceId,universityId);
};

export async function updateFeeInvoice(feeInvoiceId, feeInvoiceData, updatedBy) {
    const transaction = await sequelize.transaction();

    try {
        // Update the main fee invoice
        const feeInvoicePayload = { ...feeInvoiceData, updatedBy };
        await feeInvoiceCreationService.updateFeeInvoice(feeInvoiceId, feeInvoicePayload, transaction);

        // Update each fee invoice detail
        for (const slab of feeInvoiceData.slab) {
            const feeInvoiceDetailsData = { 
                ...slab, 
                updatedBy, 
                feeInvoiceId 
            };
            await FeeInvoiceDetailsCreationService.updateFeeInvoiceDetails(slab.feeInvoiceDetailsId, feeInvoiceDetailsData, transaction);
        }

        await transaction.commit();
        return { success: true, message: 'Fee invoice updated successfully.' };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

export async function deleteFeeInvoice(feeInvoiceId) {
    return await feeInvoiceCreationService.deleteFeeInvoice(feeInvoiceId);
};

export async function getInvoiceNumber(instituteId) {
    const getInstitueCodeDetail = await getInstituteCode(instituteId);
    const institueCode = getInstitueCodeDetail.get('institute_code');
    const latestInvoiceNumber = await feeInvoiceCreationService.latestInoviceNumber(institueCode)
    const previousInvoiceNumber = latestInvoiceNumber ? latestInvoiceNumber.get('invoice_number') : null;
    let invoiceNumber;
    if (previousInvoiceNumber) {
        const invoiceNumberParts = previousInvoiceNumber.split('-');
        if (invoiceNumberParts.length === 3) {
            const year = invoiceNumberParts[1];
            const suffixNumber = parseInt(invoiceNumberParts[2], 10) + 1;
            const paddedSuffix = String(suffixNumber).padStart(2, '0');

            invoiceNumber = `${institueCode}-${year}-${paddedSuffix}`;
        } else {
            throw new Error('Invalid invoice number format');
        }
    } else {
        const yearLastTwoDigits = moment().format('YY');
        invoiceNumber = `${institueCode}-${yearLastTwoDigits}-01`;

    }
    return invoiceNumber;
};

export async function getInvoiceDetailNumber(instituteId) {
    const getInstitueCodeDetail = await getInstituteCode(instituteId);
    const institueCode = getInstitueCodeDetail.get('institute_code');
    const latestInvoiceNumber = await feeInvoiceCreationService.latestInvoiceDetailNumber(institueCode)
    const previousInvoiceNumber = latestInvoiceNumber ? latestInvoiceNumber.get('invoice_number') : null;
    let invoiceNumber;
    if (previousInvoiceNumber) {
        const invoiceNumberParts = previousInvoiceNumber.split('-');
        if (invoiceNumberParts.length === 3) {
            const year = invoiceNumberParts[1];
            const suffixNumber = parseInt(invoiceNumberParts[2], 10) + 1;
            const paddedSuffix = String(suffixNumber).padStart(2, '0');

            invoiceNumber = `${institueCode}-${paddedSuffix}`;
        } else {
            throw new Error('Invalid invoice detail number');
        }
    } else {
        const yearLastTwoDigits = moment().format('YY');
        invoiceNumber = `${institueCode}-10001`;

    }
    return invoiceNumber;
};