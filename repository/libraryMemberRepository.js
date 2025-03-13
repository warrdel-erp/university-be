import * as model from '../models/index.js'
import { Op } from 'sequelize';

export async function getPreviousMemberId() {
    try {
        const attribute = ["member_id"];
        const result = await model.libraryMemberModel.findOne({
            attributes: attribute,
            order: [['member_id', 'DESC']]
        });        
        return result;
    } catch (error) {
        console.error(`Error in getting memberId`, error);
        throw error;
    }
};

export async function addMember(memberData,transaction) {    
    try {
        const result = await model.libraryMemberModel.create(memberData,{transaction});
        return result;
    } catch (error) {
        console.error("Error in add member :", error);
        throw error;
    }
};


export async function getMemberDetails(universityId) {
    try {
        const members = await model.libraryMemberModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","instituteId","createdBy","updatedBy"] },
            include: [
                {
                    model: model.userModel,
                    as: "userLibraryMember",
                    attributes: ["universityId", "userId"],
                    where: { universityId }
                },
                {
                    model: model.studentModel,
                    as: "libraryMemberStudent",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy"] },
                },
                {
                    model: model.employeeModel,
                    as: "libraryMemberEmployee",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy"] },
                },
                {
                    model: model.libraryCreationModel,
                    as: "libraryMemberCreation",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy"] },
                },
            ]
        });

        return members;
    } catch (error) {
        console.error('Error fetching member details:', error);
        throw error;
    }
}


export async function getSingleMemberDetails(libraryCreationId,universityId) {
    try {
        const member = await model.libraryMemberModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "instituteId", "createdBy", "updatedBy"] },
            where: { libraryCreationId },
            include: [
                {
                    model: model.userModel,
                    as: "userLibraryMember",
                    attributes: ["universityId", "userId"],
                    // where: { universityId }
                },
                {
                    model: model.studentModel,
                    as: "libraryMemberStudent",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy"] },
                },
                {
                    model: model.employeeModel,
                    as: "libraryMemberEmployee",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy"] },
                },
                {
                    model: model.libraryCreationModel,
                    as: "libraryMemberCreation",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy"] },
                },
            ]
        });

        return member;
    } catch (error) {
        console.error(`Error fetching single member details: ${libraryCreationId}`, error);
        throw error;
    }
}

export async function deleteMember(libraryMemberId) {
    const deleted = await model.libraryMemberModel.destroy({ where: { libraryMemberId: libraryMemberId } });
    return deleted > 0;
}

export async function getPreviousMemberIdByLibraryMemberId(libraryMemberId) {
    try {
        const attribute = ["member_id"];
        const result = await model.libraryMemberModel.findOne({
            attributes: attribute,
            where: { libraryMemberId }
        });
        
        return result
    } catch (error) {
        console.error(`Error in getting memberId`, error);
        throw error;
    }
}

export async function updateMember(libraryMemberId, memberData, transaction) {
    try {
        const result = await model.libraryMemberModel.update(memberData, {
            where: { libraryMemberId },
            transaction
        });
        return result; 
    } catch (error) {
        console.error(`Error updating member creation ${libraryMemberId}:`, error);
        throw error; 
    }
}
