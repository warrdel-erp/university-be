import * as model from "../models/index.js";

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
        const { type, difficulty, bloom, marks, createdBy } = filters;
        const { limit, offset } = pagination;

        const whereClause = {
            ...(universityId && { universityId }),
            ...(type && { type }),
            ...(difficulty && { difficulty }),
            ...(bloom && { bloom }),
            ...(createdBy && { createdBy }),
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
