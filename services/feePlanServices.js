import * as feePlan  from "../repository/feePlanRepository.js";
import sequelize from '../database/sequelizeConfig.js';

export async function addFeePlan(data, createdBy, updatedBy, universityId, instituteId) {
    const transaction = await sequelize.transaction();

    try {
        const { name, semesterDetails, feePlan: feePlanItems } = data;

        const feePlans = await feePlan.addFeePlan(
            { name, createdBy, updatedBy, universityId, instituteId },
            transaction
        );
        console.log(`>>>>>>feePlans`,feePlans)

        if (Array.isArray(feePlanItems)) {
            for (const item of feePlanItems) {
                await feePlan.addFeePlanType(
                    {
                        ...item,
                        feePlanId: feePlans.dataValues.feePlanId,
                        createdBy,
                        updatedBy,
                        universityId,
                        instituteId
                    },
                    transaction
                );
            }
        }

        if (Array.isArray(semesterDetails)) {
            for (const semester of semesterDetails) {
                await feePlan.addFeePlanSemester(
                    {
                        ...semester,
                        feePlanId: feePlans.dataValues.feePlanId,
                        createdBy,
                        updatedBy,
                        universityId,
                        instituteId
                    },
                    transaction
                );
            }
        }

        await transaction.commit();
        return feePlans;
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