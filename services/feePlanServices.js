import * as feePlan  from "../repository/feePlanRepository.js";
import sequelize from '../database/sequelizeConfig.js';

export async function addFeePlan(data, createdBy, updatedBy, universityId, instituteId) {
  const transaction = await sequelize.transaction();

    try {
        // 1. Insert into fee_plan
        const newFeePlan = await feePlan.addFeePlan({
            name: data.name,
            PlanType: data.PlanType,
            courseId : data.courseId,
            acedmicYearId:data.acedmicYearId,
            sessionId:data.sessionId,
            createdBy: createdBy,
            updatedBy: updatedBy,
            universityId: universityId,
            instituteId: instituteId
        }, transaction );

        // 2. For each invoice, calculate total and insert into fee_new_invoice
        for (const invoice of data.invoice) {
            // Calculate total fee
            const productTotal = (invoice.product || []).reduce((sum, p) => sum + Number(p.fee || 0), 0);
            const additionalTotal = (invoice.additionalFee || []).reduce((sum, f) => sum + Number(f.fee || 0), 0);
            const total = productTotal + additionalTotal;

            const newInvoice = await feePlan.addFeeNewInvoice({
                feePlanId: newFeePlan.dataValues.feePlanId,
                name: invoice.name,
                startDate: invoice.startDate,
                EndDate: invoice.EndDate,
                total: total,
                createdBy: createdBy,
                updatedBy: updatedBy
            }, transaction);
            const feeNewInvoiceId = newInvoice.dataValues.feeNewInvoiceId;

            // 3. Insert products into fee_plan_semester
            if (invoice.product?.length > 0) {
                for (const product of invoice.product) {
                    await feePlan.addFeePlanSemester({
                        feeNewInvoiceId: feeNewInvoiceId,
                        name: product.name,
                        fee: product.fee,
                        createdBy: createdBy,
                        updatedBy: updatedBy
                    }, transaction);
                }
            }

            // 4. Insert additionalFee into fee_plan_type
            if (invoice.additionalFee?.length > 0) {
                for (const fee of invoice.additionalFee) {
                    await feePlan.addFeePlanType({
                        feeNewInvoiceId: feeNewInvoiceId,
                        feeTypeId: fee.feeTypeId,
                        name: fee.name,
                        fee: fee.fee,
                        createdBy: createdBy,
                        updatedBy: updatedBy
                    }, transaction);
                }
            }
        }

        await transaction.commit();
        return { success: true };

    } catch (error) {
        await transaction.rollback();
        console.error("Transaction failed in add Fee Plan:", error);
        throw error;
    }
};

export async function getFeePlanDetails(universityId,instituteId,role) {
    return await feePlan.getFeePlanDetails(universityId,instituteId,role);
}

export async function getSingleFeePlanDetails(feePlanId,universityId) {
    return await feePlan.getSingleFeePlanDetails(feePlanId,universityId);
}

export async function updateFeePlan(poId, data, updatedBy) {    
        data.updatedBy = updatedBy;
       return await feePlan.updateFeePlan(poId, data);
}

export async function deleteFeePlan(poId) {
    return await feePlan.deleteFeePlan(poId);
}