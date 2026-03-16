import * as questionPaperRepository from "../repository/questionPaperRepository.js";

export async function addQuestionPaper(questionPaperData, createdBy, updatedBy) {
    questionPaperData.createdBy = createdBy;
    questionPaperData.updatedBy = updatedBy;
    const result = await questionPaperRepository.addQuestionPaper(questionPaperData);
    return result;
}

export async function getQuestionPapers() {
    return await questionPaperRepository.getQuestionPapers();
}

export async function getSingleQuestionPaper(id) {
    return await questionPaperRepository.getSingleQuestionPaper(id);
}

export async function updateQuestionPaper(id, questionPaperData, updatedBy) {
    questionPaperData.updatedBy = updatedBy;
    return await questionPaperRepository.updateQuestionPaper(id, questionPaperData);
}

export async function deleteQuestionPaper(id) {
    return await questionPaperRepository.deleteQuestionPaper(id);
}

