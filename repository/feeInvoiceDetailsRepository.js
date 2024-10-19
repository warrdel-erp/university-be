import * as model from '../models/index.js'
import { Op } from 'sequelize';

export async function addFeeInvoiceDetails(feeInvoiceDetailsData,transaction) { 
       
    try {
        const result = await model.feeInvoiceDetailModel.create(feeInvoiceDetailsData ,{transaction});
        return result;
    } catch (error) {
        console.error("Error in add Fee Invoice Details :", error);
        throw error;
    }
};

export async function getFeeInvoiceDetailsDetails(universityId) {
    try {
        const feeInvoiceDetails = await model.feeInvoiceDetailModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy","fee_type_id"] },
            include:[
                {
                    model: model.userModel,
                    as: "userFeeInvoiceDetails",
                    attributes: ["universityId", "userId"],
                    where: { universityId }
                },
                {
                    model:model.feeInvoiceModel,
                    as:"feeInvoice",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy","fee_type_id","class_student_mapper_id"] },
                }
            ]
        });

        return feeInvoiceDetails;
    } catch (error) {
        console.error('Error fetching FeeInvoiceDetails :', error);
        throw error;
    }
};

export async function getSingleFeeInvoiceDetails(feeInvoiceDetailsId,universityId) {
    try {
        const feeInvoiceDetails = await model.feeInvoiceDetailModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy","fee_type_id"] },
            where: { feeInvoiceDetailsId },
            include:[
                {
                    model: model.userModel,
                    as: "userFeeInvoiceDetails",
                    attributes: ["universityId", "userId"],
                    where: { universityId }
                },
                {
                    model:model.feeInvoiceModel,
                    as:"feeInvoice",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy","fee_type_id","class_student_mapper_id"] },
                }
            ]
        });

        return feeInvoiceDetails;
    } catch (error) {
        console.error('Error fetching Fee Invoice Details details:', error);
        throw error;
    }
};

export async function updateFeeInvoiceDetails(feeInvoiceDetailsId, feeInvoiceDetailsData,transaction) {
    try {
        const result = await model.feeInvoiceDetailModel.update(feeInvoiceDetailsData, {
            where: { feeInvoiceDetailsId }
        });
        transaction
        return result; 
    } catch (error) {
        console.error(`Error updating FeeInvoiceDetails creation ${feeInvoiceDetailsId}:`, error);
        throw error; 
    }
};

export async function deleteFeeInvoiceDetails(feeInvoiceDetailsId) {
    const deleted = await model.feeInvoiceDetailModel.destroy({ where: { feeInvoiceDetailsId: feeInvoiceDetailsId } });
    return deleted > 0;
};