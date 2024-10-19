import * as model from '../models/index.js'
import { Op } from 'sequelize';

export async function addFeeGroup(feeGroupData) {    
    try {
        const result = await model.feeGroupModel.create(feeGroupData);
        return result;
    } catch (error) {
        console.error("Error in add FeeGroup :", error);
        throw error;
    }
};

export async function getFeeGroupDetails(universityId) {
    try {
        const FeeGroup = await model.feeGroupModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
            include:[
                {
                    model: model.userModel,
                    as: "userFeeGroup",
                    attributes: ["universityId", "userId"],
                    where: { universityId }
                },
            ]
        });

        return FeeGroup;
    } catch (error) {
        console.error('Error fetching FeeGroup details:', error);
        throw error;
    }
}

export async function getSingleFeeGroupDetails(feeGroupId,universityId) {
    try {
        const FeeGroup = await model.feeGroupModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: { feeGroupId },
            include:[
                {
                    model: model.userModel,
                    as: "userFeeGroup",
                    attributes: ["universityId", "userId"],
                    where: { universityId }
                },
            ]
        });

        return FeeGroup;
    } catch (error) {
        console.error('Error fetching FeeGroup details:', error);
        throw error;
    }
}

export async function updateFeeGroup(feeGroupId, FeeGroupData) {
    try {
        const result = await model.feeGroupModel.update(FeeGroupData, {
            where: { feeGroupId }
        });
        return result; 
    } catch (error) {
        console.error(`Error updating FeeGroup creation ${feeGroupId}:`, error);
        throw error; 
    }
}

export async function deleteFeeGroup(feeGroupId) {
    const deleted = await model.feeGroupModel.destroy({ where: { feeGroupId: feeGroupId } });
    return deleted > 0;
}