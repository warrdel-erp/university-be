import * as model from "../models/index.js";
import { questionStatus } from "../constant.js";


export async function addQuestion(questionData) {
    try {
        const result = await model.questionBankModel.create(questionData);
        return result;
    } catch (error) {
        console.error("Error adding question to bank:", error);
        throw error;
    }
}

export async function getQuestions(universityId, filters = {}, pagination = {}) {
    try {
        const { type, difficulty, bloom, marks, createdBy, subjectId, status } = filters;
        const { limit, offset } = pagination;

        const whereClause = {
            ...(universityId && { universityId }),
            ...(subjectId && { subjectId }),
            ...(type && { type }),
            ...(difficulty && { difficulty }),
            ...(bloom && { bloom }),
            ...(createdBy && { createdBy }),
            ...(status && { status }),
            ...(marks && { marks: parseInt(marks, 10) }),
        };

        const { count, rows } = await model.questionBankModel.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: model.userModel,
                    as: "creator",
                    attributes: ["userId", "userName"],
                },
                {
                    model: model.universityModel,
                    as: "university",
                    attributes: ["university_id", "universityName"],
                },
                {
                    model: model.subjectModel,
                    as: "subject",
                    attributes: ["subjectId", "subjectName"],
                }
            ],
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
            order: [['createdAt', 'DESC']]
        });

        return { total: count, questions: rows };
    } catch (error) {
        console.error("Error fetching questions from bank:", error.message);
        throw error;
    }
}

export async function countQuestions(universityId, filters = {}) {
    try {
        const { type, difficulty, bloom, marks, createdBy, subjectId, status } = filters;

        const baseWhereClause = {
            ...(universityId && { universityId }),
            ...(subjectId && { subjectId }),
            ...(type && { type }),
            ...(difficulty && { difficulty }),
            ...(bloom && { bloom }),
            ...(createdBy && { createdBy }),
            ...(marks && { marks: parseInt(marks, 10) }),
        };

        const total = await model.questionBankModel.count({
            where: baseWhereClause
        });

        const approved = await model.questionBankModel.count({
            where: { ...baseWhereClause, status: questionStatus[1] } // 'Approved'
        });

        return { total, approved };
    } catch (error) {
        console.error("Error counting questions in bank:", error.message);
        throw error;
    }
}

export async function bulkUpdateStatus(ids, status, updatedBy, universityId) {
    try {
        const validCount = await model.questionBankModel.count({
            where: {
                id: ids,
                universityId
            }
        });

        if (validCount !== ids.length) {
            throw new Error("One or more question IDs are invalid or do not belong to your university.");
        }

        const result = await model.questionBankModel.update(
            { status, updatedBy },
            { where: { id: ids, universityId } }
        );
        return result;
    } catch (error) {
        console.error("Error bulk updating status:", error.message);
        throw error;
    }
}

export async function getSingleQuestion(id) {
    try {
        const result = await model.questionBankModel.findOne({
            where: { id },
            include: [
                {
                    model: model.userModel,
                    as: "creator",
                    attributes: ["userId", "userName"],
                },
                {
                    model: model.universityModel,
                    as: "university",
                    attributes: ["university_id", "universityName"],
                }
            ]
        });
        return result;
    } catch (error) {
        console.error("Error fetching question from bank:", error);
        throw error;
    }
}

export async function updateQuestion(id, questionData) {
    try {
        const result = await model.questionBankModel.update(questionData, {
            where: { id },
        });
        return result;
    } catch (error) {
        console.error("Error updating question in bank:", error);
        throw error;
    }
}

export async function deleteQuestion(id) {
    try {
        const deleted = await model.questionBankModel.destroy({ where: { id } });
        return deleted > 0;
    } catch (error) {
        console.error("Error deleting question from bank:", error);
        throw error;
    }
}
