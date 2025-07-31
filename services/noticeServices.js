import * as notice  from "../repository/noticeRepository.js";
import sequelize from '../database/sequelizeConfig.js';

export async function addNotice(data, createdBy, updatedBy,role, universityId, instituteId) {
    try {
        const payload = {
            ...data,
            createdBy,
            updatedBy,role,universityId,instituteId
        } 
    return await notice.addNotice(payload);
    } catch (error) {
        console.error("Transaction failed in add Fee Plan:", error);
        throw error;
    }
};

export async function getAllStudentNotice(universityId,acedmicYearId,instituteId,role) {
    return await notice.getAllStudentNotice(universityId,acedmicYearId,instituteId,role);
}

export async function getSinglenoticeDetails(noticeId,universityId) {
    return await notice.getSinglenoticeDetails(noticeId,universityId);
}

export async function updateNotice(noticeId, data,updatedBy) {    
        data.updatedBy = updatedBy;
       return await notice.updateNotice(noticeId, data);
}

export async function deleteNotice(noticeId) {
    return await notice.deleteNotice(noticeId);
}