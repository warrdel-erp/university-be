import * as model from "../models/index.js";

export async function addQuestionPaper(questionPaperData) {
    try {
        const result = await model.questionPaperModel.create(questionPaperData);
        return result;
    } catch (error) {
        console.error("Error adding question paper:", error);
        throw error;
    }
}

export async function getQuestionPapers() {
    try {
        const result = await model.questionPaperModel.findAll({
            attributes: {
                exclude: ["deletedAt"]
            },
            include: [
                {
                    model: model.userModel,
                    as: "creator",
                    attributes: ["userId", "userName"],
                }
            ],
        });
        return result;
    } catch (error) {
        console.error("Error fetching question papers:", error);
        throw error;
    }
}

export async function getSingleQuestionPaper(id) {
    try {
        const result = await model.questionPaperModel.findOne({
            attributes: { exclude: ["deletedAt"] },
            where: { id },
            include: [
                {
                    model: model.userModel,
                    as: "creator",
                    attributes: ["userId", "userName"],
                }
            ]
        });
        return result;
    } catch (error) {
        console.error("Error fetching question paper:", error);
        throw error;
    }
}

export async function updateQuestionPaper(id, questionPaperData) {
    try {
        const result = await model.questionPaperModel.update(questionPaperData, {
            where: { id },
        });
        return result;
    } catch (error) {
        console.error("Error updating question paper:", error);
        throw error;
    }
}

export async function deleteQuestionPaper(id) {
    try {
        const deleted = await model.questionPaperModel.destroy({ where: { id } });
        return deleted > 0;
    } catch (error) {
        console.error("Error deleting question paper:", error);
        throw error;
    }
}

