import * as model from '../models/index.js'
import { Op } from 'sequelize';

export async function addFeeType(FeeTypeData) {    
    try {
        const result = await model.feeTypeModel.create(FeeTypeData);
        return result;
    } catch (error) {
        console.error("Error in add FeeType :", error);
        throw error;
    }
};

export async function getFeeTypeDetails(universityId,acedmicYearId,instituteId,role) {
    try {
        const whereClase ={
            ...(acedmicYearId && { acedmicYearId }),
            ...(role === 'Head' && { instituteId })
        };
        const FeeType = await model.feeTypeModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
            include:[
                {
                    model: model.userModel,
                    as: "userFeeType",
                    attributes: ["universityId", "userId"],
                    where: { universityId }
                },
                {
                    model: model.feeGroupModel,
                    as: "feeGroup",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                    where : whereClase
                },
            ]
        });

        return FeeType;
    } catch (error) {
        console.error('Error fetching FeeType details:', error);
        throw error;
    }
};

export async function getSingleFeeTypeDetails(feeTypeId,universityId) {
    try {
        const FeeType = await model.feeTypeModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: { feeTypeId },
            include:[
                {
                    model: model.userModel,
                    as: "userFeeType",
                    attributes: ["universityId", "userId"],
                    where: { universityId }
                },
                {
                    model: model.feeGroupModel,
                    as: "feeGroup",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                },
            ]
        });

        return FeeType;
    } catch (error) {
        console.error('Error fetching FeeType details:', error);
        throw error;
    }
};

export async function updateFeeType(feeTypeId, FeeTypeData) {
    try {
        const result = await model.feeTypeModel.update(FeeTypeData, {
            where: { feeTypeId }
        });
        return result; 
    } catch (error) {
        console.error(`Error updating FeeType creation ${feeTypeId}:`, error);
        throw error; 
    }
};

export async function deleteFeeType(feeTypeId) {
    const deleted = await model.feeTypeModel.destroy({ where: { feeTypeId: feeTypeId } });
    return deleted > 0;
};