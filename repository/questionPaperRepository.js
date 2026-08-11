import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

async function assertScopedExamSchedule(examScheduleId, transaction) {
    return scoped(model.examScheduleModel).findOne({
        where: { examScheduleId },
        attributes: ['examScheduleId'],
        transaction,
    });
}

async function assertScopedQuestionPaper(id, transaction) {
    return model.questionPaperModel.findOne({
        where: { id },
        attributes: ['id', 'examScheduleId'],
        transaction,
        include: [{
            model: model.examScheduleModel,
            as: 'examSchedule',
            required: true,
            where: buildScope(model.examScheduleModel),
            attributes: ['examScheduleId'],
        }],
    });
}

export async function addQuestionPaper(questionPaperData, options = {}) {
    try {
        const schedule = await assertScopedExamSchedule(questionPaperData.examScheduleId, options.transaction);
        if (!schedule) {
            throw new Error('Exam schedule not found');
        }
        const result = await model.questionPaperModel.create(questionPaperData, options);
        return result;
    } catch (error) {
        console.error("Error adding question paper:", error);
        throw error;
    }
}

export async function getQuestionPapers(filters = {}, pagination = {}) {
    try {
        const { examScheduleId, createdBy } = filters;
        const { limit, offset } = pagination;

        const whereClause = {
            ...(examScheduleId && { examScheduleId }),
            ...(createdBy && { createdBy }),
        };

        const { count, rows } = await model.questionPaperModel.findAndCountAll({
            where: whereClause,
            attributes: {
                exclude: ["deletedAt"],
            },
            include: [
                {
                    model: model.userModel,
                    as: "creator",
                    attributes: ["userId", "userName"],
                },
                {
                    model: model.examScheduleModel,
                    as: "examSchedule",
                    required: true,
                    where: buildScope(model.examScheduleModel),
                },
            ],
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
            order: [['createdAt', 'DESC']],
        });
        return { total: count, questionPapers: rows };
    } catch (error) {
        console.error("Error fetching question papers:", error.message);
        throw error;
    }
}

export async function getSingleQuestionPaper(id) {
    try {
        const existing = await assertScopedQuestionPaper(id);

        if (!existing) {
            return null;
        }

        const result = await model.questionPaperModel.findOne({
            attributes: {
                exclude: ["deletedAt"],
            },
            where: { id },
            include: [
                {
                    model: model.userModel,
                    as: "creator",
                    attributes: ["userId", "userName"],
                },
            ],
        });

        if (!result) {
            return null;
        }

        const questionPaper = result.toJSON();

        if (
            questionPaper.questionPaper &&
            typeof questionPaper.questionPaper === "string"
        ) {
            try {
                questionPaper.questionPaper = JSON.parse(
                    questionPaper.questionPaper
                );
            } catch (error) {
                console.error(
                    "Invalid questionPaper JSON:",
                    error.message
                );

                questionPaper.questionPaper = [];
            }
        }

        return questionPaper;
    } catch (error) {
        console.error("Error fetching question paper:", error);
        throw error;
    }
}

export async function updateQuestionPaper(id, questionPaperData, transaction = null) {
    try {
        const existing = await assertScopedQuestionPaper(id, transaction);
        if (!existing) {
            return [0];
        }
        if (questionPaperData.examScheduleId) {
            const schedule = await assertScopedExamSchedule(questionPaperData.examScheduleId, transaction);
            if (!schedule) {
                throw new Error('Exam schedule not found');
            }
        }
        const result = await model.questionPaperModel.update(questionPaperData, {
            where: { id },
            transaction,
        });
        return result;
    } catch (error) {
        console.error("Error updating question paper:", error);
        throw error;
    }
}

export async function getApprovedQuestionPapersByScheduleId(examScheduleId, transaction = null) {
    try {
        return await model.questionPaperModel.findAll({
            where: {
                examScheduleId,
                status: "Approved"
            },
            include: [{
                model: model.examScheduleModel,
                as: "examSchedule",
                required: true,
                where: buildScope(model.examScheduleModel)
            }],
            transaction
        });
    } catch (error) {
        console.error("Error fetching approved papers:", error);
        throw error;
    }
}

export async function deleteQuestionPaper(id, options = {}) {
    try {
        const existing = await assertScopedQuestionPaper(id, options.transaction);
        if (!existing) {
            return false;
        }
        const deleted = await model.questionPaperModel.destroy({
            where: { id },
            transaction: options.transaction,
        });
        return deleted > 0;
    } catch (error) {
        console.error("Error deleting question paper:", error);
        throw error;
    }
}

export async function getExamScheduleById(id) {
    try {
        return await scoped(model.examScheduleModel).findByPk(id);
    } catch (error) {
        console.error("Error fetching exam schedule:", error);
        throw error;
    }
}
