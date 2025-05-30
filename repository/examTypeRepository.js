import * as model from '../models/index.js'
import { Op } from 'sequelize';

export async function addExamType(examDetail) {
    try {
        const result = await model.examTypeModel.create(examDetail);
        return result;
    } catch (error) {
        console.error("Error in add ExamType :", error);
        throw error;
    }
};

export async function getExamType(universityId,acedmicYearId,role,instituteId) {
    try {
        const DormitoryList = await model.examTypeModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            where: {
                        ...(acedmicYearId && { acedmicYearId }),
                        ...(universityId && {universityId}),
                        ...(role === 'Head' && { instituteId })
                    },
            include: [{
                model: model.userModel,
                as: 'examTypeUser',
                attributes: ["universityId", "userId"],
                where: {
                    universityId: universityId
                }
            }]
        });

        return DormitoryList;
    } catch (error) {
        console.error('Error fetching Exam Type details:', error);
        throw error;
    }
};

export async function getSingleExamType(examTypeId, universityId) {
    try {
        const DormitoryList = await model.examTypeModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: { examTypeId },
            include: [{
                model: model.userModel,
                as: 'examTypeUser',
                attributes: ["universityId", "userId"],
                where: {
                    universityId: universityId
                }
            }]
        });

        return DormitoryList;
    } catch (error) {
        console.error('Error fetching DormitoryList details:', error);
        throw error;
    }
};

export async function deleteExamType(examTypeId) {
    const deleted = await model.examTypeModel.destroy({ where: { examTypeId: examTypeId } });
    return deleted > 0;
};

export async function updateExamType(examTypeId, DormitoryListData) {
    try {
        const result = await model.examTypeModel.update(DormitoryListData, {
            where: { examTypeId }
        });
        return result;
    } catch (error) {
        console.error(`Error updating DormitoryList creation ${examTypeId}:`, error);
        throw error;
    }
};