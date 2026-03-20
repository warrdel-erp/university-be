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

export async function getQuestions(universityId) {
    try {
        const whereClause = {};
        if (universityId) {
            whereClause.universityId = universityId;
        }

        const result = await model.questionBankModel.findAll({
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
        });
        return result;
    } catch (error) {
        console.error("Error fetching questions from bank:", error);
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
