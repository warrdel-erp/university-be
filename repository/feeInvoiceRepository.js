import * as model from '../models/index.js'
import { Op } from 'sequelize';

export async function addFeeInvoice(feeInvoiceData,transaction) {   
     
    try {
        const result = await model.feeInvoiceModel.create(feeInvoiceData,{transaction});
        return result;
    } catch (error) {
        console.error("Error in add Fee Invoice :", error);
        throw error;
    }
};

export async function getFeeInvoiceDetails(universityId,acedmicYearId,instituteId,role) {
    try {
        const whereClase ={
            ...(acedmicYearId && { acedmicYearId }),
            ...(role === 'Head' && { instituteId })
        };
        const feeInvoice = await model.feeInvoiceModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy","class_student_mapper_id","fee_group_id"] },
            include:[
                {
                    model: model.userModel,
                    as: "userFeeInvoice",
                    attributes: ["universityId", "userId"],
                    where: { universityId }
                },
                {
                    model: model.feeGroupModel,
                    as: "feeInvoiceGroup",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy","fee_group_id"] },
                    where:whereClase
                },
                {
                    model:model.classStudentMapperModel,
                    as:"feeStudentMapper",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy","student_id","class_sections_id"] },
                    where:{
                            ...(acedmicYearId && { acedmicYearId }),
                    },
                    include:[
                        {  
                            model:model.studentModel,
                            as:'studentMapped',
                            attributes:["firstName","middleName","lastName","scholarNumber","enrollNumber"]
                        },
                        {  
                            model:model.classSectionModel,
                            as:'studentSectionDetail',
                            attributes:["section"]
                        }
                    ]
                },
                {
                    model:model.feeInvoiceDetailModel,
                    as:'feeInvoiceDetails',
                    attributes :["feeInvoiceDetailsId","feeInvoiceId","feeTypeId","amount","waiver","subTotal","paidAmount"],
                    include:[
                        {
                            model:model.feeTypeModel,
                            as:'feeInvoiceType',
                            attributes:["feeTypeId","feeGroupId","name","description"]
                        }
                    ]
                }
            ]
        });

        return feeInvoice;
    } catch (error) {
        console.error('Error fetching FeeInvoice details:', error);
        throw error;
    }
};

export async function getSingleFeeInvoiceDetails(feeInvoiceId,universityId) {
    try {
        const feeInvoice = await model.feeInvoiceModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy","fee_type_id"] },
            where: { feeInvoiceId },
            include:[
                {
                    model: model.userModel,
                    as: "userFeeInvoice",
                    attributes: ["universityId", "userId"],
                    where: { universityId }
                },
                {
                    model: model.feeGroupModel,
                    as: "feeInvoiceGroup",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy","fee_group_id"] },
                },
                {
                    model:model.classStudentMapperModel,
                    as:"feeStudentMapper",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy","student_id","class_sections_id"] },
                    include:[
                        {  
                            model:model.studentModel,
                            as:'studentMapped',
                            attributes:["firstName","middleName","lastName","scholarNumber","enrollNumber"]
                        },
                        {  
                            model:model.classSectionModel,
                            as:'studentSectionDetail',
                            attributes:["section"]
                        }
                    ]
                },
                {
                    model:model.feeInvoiceDetailModel,
                    as:'feeInvoiceDetails',
                    attributes :["feeInvoiceDetailsId","feeInvoiceId","feeTypeId","amount","waiver","subTotal","paidAmount"],
                    include:[
                        {
                            model:model.feeTypeModel,
                            as:'feeInvoiceType',
                            attributes:["feeTypeId","feeGroupId","name","description"]
                        }
                    ]
                }
            ]
        });

        return feeInvoice;
    } catch (error) {
        console.error('Error fetching FeeInvoice details:', error);
        throw error;
    }
};

export async function getStudentIdByClassStudentMapper(classStudentMapperId) {
    try {
        const student = await model.classStudentMapperModel.findOne({
            attributes: ["studentId"],
            where: { classStudentMapperId }
        });

        return student;
    } catch (error) {
        console.error('Error fetching Student Id By ClassStudentMapper details:', error);
        throw error;
    }
}


export async function updateFeeInvoice(feeInvoiceId, feeInvoiceData,transaction) {
    try {
        const result = await model.feeInvoiceModel.update(feeInvoiceData, {
            where: { feeInvoiceId }
        });
        transaction
        return result; 
    } catch (error) {
        console.error(`Error updating FeeInvoice creation ${feeInvoiceId}:`, error);
        throw error; 
    }
};

export async function deleteFeeInvoice(feeInvoiceId) {
    const deleted = await model.feeInvoiceModel.destroy({ where: { feeInvoiceId: feeInvoiceId } });
    return deleted > 0;
};

export async function latestInoviceNumber(instituteCode) {    
    try {
        const attribute = ["invoice_number"];
        const result = await model.feeInvoiceModel.findOne({
            attributes: attribute,
            where: {
                invoice_number: {
                    [Op.regexp]: `^${instituteCode}(-|$)`
                }
            },
            order: [['invoice_number', 'DESC']],
        });
        return result;
    } catch (error) {
        console.error(`Error in latest Inovice Number for institue Code ${instituteCode}:`, error);
        throw error;
    }
};