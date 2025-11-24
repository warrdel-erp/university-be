import { literal, Op } from 'sequelize';
import * as model from '../models/index.js'

export async function addNotice(data, transaction) {
  try {
    const result = await model.noticeModel.create(data, { transaction });
    return result;
  } catch (error) {
    console.error("Error in add notice :", error);
    throw error;
  }
};

export async function getAllStudentNotice(universityId,acedmicYearId,instituteId,role) {
    try {
        const whereClause = {
            ...(universityId && { university_id: universityId }),
            ...(acedmicYearId && { acedmicYearId: acedmicYearId }),
            [Op.and]: [
                literal(`JSON_CONTAINS(message_to, '"Student"')`)
            ]
        };

        const notice = await model.noticeModel.findAll({
            attributes: {
                exclude: ["createdAt", "updatedAt", "deletedAt"]
            },
            where: whereClause
        });

        return notice;
    } catch (error) {
        console.error('Error fetching student notices:', error);
        throw error;
    }
};

export async function getAllEmployeeNotice(universityId, academicYearId, instituteId, role, createdBy) {
    try {
        // First query
        const whereClauseCreated = {
            ...(universityId && { university_id: universityId }),
            ...(academicYearId && { acedmicYearId: academicYearId }),
            ...(createdBy && { created_by: createdBy })
        };

        const noticeCreated = await model.noticeModel.findAll({
            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
            where: whereClauseCreated
        });

        // Second query
        const whereClauseAll = {
            ...(universityId && { university_id: universityId }),
            ...(academicYearId && { acedmicYearId: academicYearId }),
            [Op.and]: [
                literal(`JSON_CONTAINS(message_to, '["${role}"]')`)
            ]
        };

        const noticeAll = await model.noticeModel.findAll({
            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
            where: whereClauseAll
        });

        return { noticeCreated, noticeAll };
    } catch (error) {
        console.error('Error fetching employee notices:', error);
        throw error;
    }
};

export async function updateNotice(noticeId, data) {
    try {
        const result = await model.noticeModel.update(data, {
            where: { noticeId }
        });
        return result; 
    } catch (error) {
        console.error(`Error updating Notice creation ${noticeId}:`, error);
        throw error; 
    }
};

export async function deleteNotice(noticeId) {
    const deleted = await model.noticeModel.destroy({ where: { noticeId: noticeId } });
    return deleted > 0;
};