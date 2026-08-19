import * as model from "../models/index.js";
import { questionStatus } from "../constant.js";
import sequelize from "../database/sequelizeConfig.js";
import { Op } from "sequelize";
import { buildScope, scoped } from "../utility/scoped.js";

function questionFiltersWhere(filters, subjectIds) {
    const { type, difficulty, bloom, marks, createdBy, status } = filters;
    return {
        subjectId: { [Op.in]: subjectIds },
        ...(type && { type }),
        ...(difficulty && { difficulty }),
        ...(bloom && { bloom }),
        ...(createdBy && { createdBy }),
        ...(status && { status }),
        ...(marks && { marks: parseInt(marks, 10) }),
    };
}

export async function addQuestion(questionData) {
    try {
        const result = await scoped(model.questionBankModel).create(questionData);
        return result;
    } catch (error) {
        console.error("Error adding question to bank:", error);
        throw error;
    }
}

export async function getQuestions(filters = {}, pagination = {}) {
    try {
        const { subjectId } = filters;
        const { limit, offset } = pagination;

        const subjectIds = (await scoped(model.subjectModel).findAll({
            where: subjectId ? { subjectId } : {},
            attributes: ["subjectId"],
            raw: true,
        })).map((row) => row.subjectId);

        if (!subjectIds.length) return { total: 0, questions: [] };

        const { count, rows } = await scoped(model.questionBankModel).findAndCountAll({
            where: questionFiltersWhere(filters, subjectIds),
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
                    where: buildScope(model.subjectModel),
                    required: false,
                },
            ],
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
            order: [['createdAt', 'DESC']],
            distinct: true,
        });

        return { total: count, questions: rows };
    } catch (error) {
        console.error("Error fetching questions from bank:", error.message);
        throw error;
    }
}

export async function countQuestions(filters = {}) {
    try {
        const { subjectId } = filters;

        const subjectIds = (await scoped(model.subjectModel).findAll({
            where: subjectId ? { subjectId } : {},
            attributes: ["subjectId"],
            raw: true,
        })).map((row) => row.subjectId);

        if (!subjectIds.length) return { total: 0, approved: 0 };

        const where = questionFiltersWhere(filters, subjectIds);

        return {
            total: await scoped(model.questionBankModel).count({ where }),
            approved: await scoped(model.questionBankModel).count({
                where: { ...where, status: questionStatus[1] },
            }),
        };
    } catch (error) {
        console.error("Error counting questions in bank:", error.message);
        throw error;
    }
}

export async function bulkUpdateStatus(ids, status, updatedBy) {
    try {
        const validCount = await scoped(model.questionBankModel).count({
            where: {
                id: ids,
            },
        });

        if (validCount !== ids.length) {
            throw new Error("One or more question IDs are invalid or do not belong to your university.");
        }

        const result = await scoped(model.questionBankModel).update(
            { status, updatedBy },
            { where: { id: ids } },
        );
        return result;
    } catch (error) {
        console.error("Error bulk updating status:", error.message);
        throw error;
    }
}

export async function getSingleQuestion(id, ownerId = null) {
    try {
        const whereClause = { id };
        if (ownerId !== null) {
            whereClause.createdBy = ownerId;
        }
        const result = await scoped(model.questionBankModel).findOne({
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
            ],
        });
        return result;
    } catch (error) {
        console.error("Error fetching question from bank:", error);
        throw error;
    }
}

export async function updateQuestion(id, questionData, ownerId = null) {
    try {
        const whereClause = { id };
        if (ownerId !== null) {
            whereClause.createdBy = ownerId;
        }
        const existing = await scoped(model.questionBankModel).findOne({
            where: whereClause,
            attributes: ['id'],
        });
        if (!existing) {
            return [0];
        }
        const result = await scoped(model.questionBankModel).update(questionData, {
            where: whereClause,
        });
        return result;
    } catch (error) {
        console.error("Error updating question in bank:", error);
        throw error;
    }
}

export async function deleteQuestion(id, ownerId = null) {
    try {
        const whereClause = { id };
        if (ownerId !== null) {
            whereClause.createdBy = ownerId;
        }
        const existing = await scoped(model.questionBankModel).findOne({
            where: whereClause,
            attributes: ['id'],
        });
        if (!existing) {
            return false;
        }
        const deleted = await scoped(model.questionBankModel).destroy({ where: whereClause });
        return deleted > 0;
    } catch (error) {
        console.error("Error deleting question from bank:", error);
        throw error;
    }
}

export async function getRandomQuestions(subjectId, type, marks, limit) {
    try {
        const whereClause = {
            subjectId,
            type,
            marks: parseInt(marks, 10),
            status: questionStatus[1],
        };

        const rows = await scoped(model.questionBankModel).findAll({
            where: whereClause,
            order: sequelize.random(),
            limit: limit ? parseInt(limit, 10) : undefined,
        });

        return rows;
    } catch (error) {
        console.error("Error fetching random questions from bank:", error.message);
        throw error;
    }
}
