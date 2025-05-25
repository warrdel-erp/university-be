import * as headCreationService from "../repository/headRepository.js";
import * as registerRepository from "../repository/userRepository.js";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../database/sequelizeConfig.js';

export async function addHead(headData, createdBy, updatedBy, universityId) {
    const transaction = await sequelize.transaction();

    try {
        const { headName, mobileNumber, registerEmail, alternateEmail } = headData;

        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(alternateEmail, salt);

        Object.assign(headData, {
            createdBy,
            updatedBy,
            universityId
        });

        const userPayload = {
            userName: headName,
            universityId,
            password: hashedPassword,
            phone: mobileNumber,
            email: registerEmail.toLowerCase(),
            uniqueId: uuidv4(),
            role: 'Head'
        };

        const user = await registerRepository.headRegister(userPayload,  transaction );
        const head = await headCreationService.addHead(headData, transaction );

        await transaction.commit();
        return {head,user};

    } catch (error) {
        await transaction.rollback();
        console.error('Error in addHead:', error);
        throw new Error('Failed to add head. Please try again.');
    }
};

export async function getHeadDetails(universityId) {
    return await headCreationService.getHeadDetails(universityId);
}

export async function getSingleHeadDetails(headId,universityId) {
    return await headCreationService.getSingleHeadDetails(headId,universityId);
}

export async function deleteHead(headId) {
    return await headCreationService.deleteHead(headId);
}

export async function updateHead(headId, headData, updatedBy) {    

    headData.updatedBy = updatedBy;
    await headCreationService.updateHead(headId, headData);
}