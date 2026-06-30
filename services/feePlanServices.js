import * as feePlan from "../repository/feePlanRepository.js";
import sequelize from "../database/sequelizeConfig.js";

export async function addFeePlan(data, createdBy, updatedBy) {
  const transaction = await sequelize.transaction();

  try {
    const newFeePlan = await feePlan.addFeePlan(
      {
        name: data.name,
        PlanType: data.PlanType,
        courseId: data.courseId,
        academicYearId: data.academicYearId,
        sessionId: data.sessionId,
        createdBy,
        updatedBy,
      },
      transaction
    );

    for (const invoice of data.invoice) {
      const productTotal = (invoice.product || []).reduce((sum, p) => sum + Number(p.fee || 0), 0);
      const additionalTotal = (invoice.additionalFee || []).reduce(
        (sum, f) => sum + Number(f.fee || 0),
        0
      );
      const total = productTotal + additionalTotal;

      const newInvoice = await feePlan.addFeeNewInvoice(
        {
          feePlanId: newFeePlan.dataValues.feePlanId,
          name: invoice.name,
          startDate: invoice.startDate,
          EndDate: invoice.EndDate,
          total,
          createdBy,
          updatedBy,
        },
        transaction
      );
      const feeNewInvoiceId = newInvoice.dataValues.feeNewInvoiceId;

      if (invoice.product?.length > 0) {
        for (const product of invoice.product) {
          await feePlan.addFeePlanSemester(
            {
              feeNewInvoiceId,
              name: product.name,
              fee: product.fee,
              createdBy,
              updatedBy,
            },
            transaction
          );
        }
      }

      if (invoice.additionalFee?.length > 0) {
        for (const fee of invoice.additionalFee) {
          await feePlan.addFeePlanType(
            {
              feeNewInvoiceId,
              feeTypeId: fee.feeTypeId,
              name: fee.name,
              fee: fee.fee,
              createdBy,
              updatedBy,
            },
            transaction
          );
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
}

export async function getFeePlanDetails(filters = {}) {
  return feePlan.getFeePlanDetails(filters);
}

export async function getSingleFeePlanDetails(feePlanId) {
  return feePlan.getSingleFeePlanDetails(feePlanId);
}

export async function updateFeePlan(feePlanId, data, updatedBy) {
  data.updatedBy = updatedBy;
  return feePlan.updateFeePlan(feePlanId, data);
}

export async function deleteFeePlan(feePlanId) {
  return feePlan.deleteFeePlan(feePlanId);
}
