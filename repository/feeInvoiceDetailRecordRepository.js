import * as model from '../models/index.js'
import { Op } from 'sequelize';

export async function addFeeInvoiceDetailRecord(feeInvoiceData) {

    try {
        const result = await model.feeInvoiceDetailRecordModel.bulkCreate(feeInvoiceData);
        return result;
    } catch (error) {
        console.error("Error in add Fee Invoice Record :", error);
        throw error;
    }
};

export async function getAllFeeInvoiceDetailRecord(universityId, acedmicYearId, instituteId, role) {
    try {
        // const whereClase ={
        //     ...(acedmicYearId && { acedmicYearId }),
        //     ...(role === 'Head' && { instituteId })
        // };
        // const whereClases ={
        //     // ...(acedmicYearId && { acedmicYearId }),
        //     ...(role === 'Head' && { instituteId })
        // };
        const feeInvoice = await model.feeInvoiceDetailRecordModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            include: [
                {
                    model: model.feeInvoiceModel,
                    as: "feeInvoice",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                    include: [
                        {
                            model: model.feePlanModel,
                            as: "feeInvoicePlan",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy", "fee_group_id"] },
                            // where: whereClases
                        },
                        {
                            model: model.classStudentMapperModel,
                            as: "feeStudentMapper",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy", "student_id", "class_sections_id"] },
                            // where: {
                            //     ...(acedmicYearId && { acedmicYearId }),
                            // },
                            include: [
                                {
                                    model: model.studentModel,
                                    as: 'studentMapped',
                                    attributes: ["firstName", "middleName", "lastName", "scholarNumber", "enrollNumber"]
                                },
                                {
                                    model: model.classSectionModel,
                                    as: 'studentSectionDetail',
                                    attributes: ["section", "classSectionsId", "class"]
                                }
                            ]
                        },
                    ]
                },
                {
                    model: model.feeInvoiceDetailModel,
                    as: "feeInvoiceDetail",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                    include: [
                        {
                            model: model.feePlanTypeModel,
                            as: 'feeInvoiceTypePlan',
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                        },
                        {
                            model: model.feePlanSemesterModel,
                            as: 'feeInvoiceTypeSemester',
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                        }
                    ]
                },

            ]
        });

        return feeInvoice;
    } catch (error) {
        console.error('Error fetching Fee Invoice details Record:', error);
        throw error;
    }
};

export async function getSingleFeeInvoiceDetails(feeInvoiceId, universityId) {
    try {
        const feeInvoice = await model.feeInvoiceModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy", "fee_type_id"] },
            where: { feeInvoiceId },
            include: [
                {
                    model: model.userModel,
                    as: "userFeeInvoice",
                    attributes: ["universityId", "userId"],
                    where: { universityId }
                },
                {
                    model: model.feePlanModel,
                    as: "feeInvoicePlan",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy", "fee_group_id"] },
                },
                {
                    model: model.classStudentMapperModel,
                    as: "feeStudentMapper",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy", "student_id", "class_sections_id"] },
                    include: [
                        {
                            model: model.studentModel,
                            as: 'studentMapped',
                            attributes: ["firstName", "middleName", "lastName", "scholarNumber", "enrollNumber"]
                        },
                        {
                            model: model.classSectionModel,
                            as: 'studentSectionDetail',
                            attributes: ["section", "classSectionsId", "class"]
                        }
                    ]
                },
                {
                    model: model.feeInvoiceDetailModel,
                    as: 'feeInvoiceDetails',
                    attributes: ["feeInvoiceDetailsId", "feeInvoiceId", "feeTypeId", "amount", "waiver", "subTotal", "paidAmount"],
                    include: [
                        {
                            model: model.feePlanTypeModel,
                            as: 'feeInvoiceTypePlan',
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                        },
                        {
                            model: model.feePlanSemesterModel,
                            as: 'feeInvoiceTypeSemester',
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
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



export async function updateFeeInvoice(feeInvoiceId, feeInvoiceData, transaction) {
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