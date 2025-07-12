import * as feeInvoiceCreationService  from "../repository/feeInvoiceRepository.js";
import * as FeeInvoiceDetailsCreationService  from "../repository/feeInvoiceDetailsRepository.js";
import sequelize from '../database/sequelizeConfig.js'; 
import { getInstituteCode } from "../repository/collegeRepository.js";
import moment from 'moment';

export async function addFeeInvoice(feeInvoiceData, createdBy, updatedBy,instituteId) {
    const transaction = await sequelize.transaction();
    let feeInvoiceDetails = [];
    const classStudentMapperId = feeInvoiceData.classStudentMapperId;


    try {
        // const latestInvoiceDetailNumber = await getInvoiceDetailNumber(instituteId)
        // let nextNumber = parseInt(latestInvoiceDetailNumber.split('-')[1]);
        const getStudent = await feeInvoiceCreationService.getStudentIdByClassStudentMapper(classStudentMapperId);
        const studentId = getStudent.dataValues.studentId;

        const feeInvoicePayload = {
            ...feeInvoiceData,
            studentId,
            createdBy,
            updatedBy
        };

        const feeInvoice = await feeInvoiceCreationService.addFeeInvoice(feeInvoicePayload, transaction);
        const feeInvoiceId = feeInvoice.dataValues.feeInvoiceId;

        for (const slab of feeInvoiceData.slab) {
            // nextNumber += 1;
            // const invoiceDetailNumber = `INV-${nextNumber.toString().padStart(4, '0')}`;
            const latestInvoiceDetailNumber = await getInvoiceDetailNumber(instituteId)

            const feeInvoiceDetailsData = {
                ...slab,
                createdBy,
                updatedBy,
                feeInvoiceId,
                invoiceDetailNumber:latestInvoiceDetailNumber
            };
            feeInvoiceDetails = await FeeInvoiceDetailsCreationService.addFeeInvoiceDetails(feeInvoiceDetailsData, transaction);
        }

        await transaction.commit();
        return { feeInvoice, feeInvoiceDetails };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

export async function getFeeInvoiceDetails(universityId,acedmicYearId,instituteId,role) {
    return await feeInvoiceCreationService.getFeeInvoiceDetails(universityId,acedmicYearId,instituteId,role);
};

export async function getSingleFeeInvoiceDetails(feeInvoiceId,universityId) {
    return await feeInvoiceCreationService.getSingleFeeInvoiceDetails(feeInvoiceId,universityId);
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