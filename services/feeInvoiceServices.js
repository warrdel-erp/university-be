import * as feeInvoiceCreationService  from "../repository/feeInvoiceRepository.js";
import * as FeeInvoiceDetailsCreationService  from "../repository/feeInvoiceDetailsRepository.js";
import sequelize from '../database/sequelizeConfig.js'; 

export async function addFeeInvoice(feeInvoiceData, createdBy, updatedBy) {
    const transaction = await sequelize.transaction();
    let feeInvoiceDetails = []
    
    try {
        const feeInvoicePayload = { ...feeInvoiceData, createdBy, updatedBy };
        const feeInvoice = await feeInvoiceCreationService.addFeeInvoice(feeInvoicePayload, transaction );
        
        const feeInvoiceId = feeInvoice.dataValues.feeInvoiceId;

        for (const slab of feeInvoiceData.slab) {
            const feeInvoiceDetailsData = { ...slab, createdBy, updatedBy, feeInvoiceId };
            feeInvoiceDetails = await FeeInvoiceDetailsCreationService.addFeeInvoiceDetails(feeInvoiceDetailsData, transaction);
        }

        await transaction.commit();
        return { feeInvoice,feeInvoiceDetails };
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