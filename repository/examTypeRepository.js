import * as model from '../models/index.js';
import { scoped } from '../utility/scoped.js';

export async function addExamType(examDetail) {
    try {
        const result = await scoped(model.examTypeModel).create(examDetail);
        return result;
    } catch (error) {
        console.error("Error in add ExamType :", error);
        throw error;
    }
};

export async function getExamType(acedmicYearId) {
    try {
        const DormitoryList = await scoped(model.examTypeModel).findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            where: {
                ...(acedmicYearId && { acedmicYearId }),
            },
            include: [{
                model: model.userModel.unscoped(),
                as: 'examTypeUser',
                attributes: ["universityId", "userId"],
            }],
        });

        return DormitoryList;
    } catch (error) {
        console.error('Error fetching Exam Type details:', error);
        throw error;
    }
};

export async function getSingleExamType(examTypeId) {
    try {
        const DormitoryList = await scoped(model.examTypeModel).findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: { examTypeId },
            include: [{
                model: model.userModel.unscoped(),
                as: 'examTypeUser',
                attributes: ["universityId", "userId"],
            }],
        });

        return DormitoryList;
    } catch (error) {
        console.error('Error fetching DormitoryList details:', error);
        throw error;
    }
};

export async function deleteExamType(examTypeId) {
    const existing = await scoped(model.examTypeModel).findOne({
        where: { examTypeId },
        attributes: ['examTypeId'],
    });
    if (!existing) {
        return false;
    }
    const deleted = await scoped(model.examTypeModel).destroy({ where: { examTypeId } });
    return deleted > 0;
};

export async function updateExamType(examTypeId, DormitoryListData) {
    try {
        const existing = await scoped(model.examTypeModel).findOne({
            where: { examTypeId },
            attributes: ['examTypeId'],
        });
        if (!existing) {
            return [0];
        }
        const result = await scoped(model.examTypeModel).update(DormitoryListData, {
            where: { examTypeId },
        });
        return result;
    } catch (error) {
        console.error(`Error updating DormitoryList creation ${examTypeId}:`, error);
        throw error;
    }
};
