import * as questionBankRepository from "../repository/questionBankRepository.js";

export async function addQuestion(questionData, createdBy, updatedBy, universityId) {
    questionData.createdBy = createdBy;
    questionData.updatedBy = updatedBy;
    questionData.universityId = universityId;
    const result = await questionBankRepository.addQuestion(questionData);
    return result;
}

export async function getQuestions(universityId) {
    return await questionBankRepository.getQuestions(universityId);
}

export async function getSingleQuestion(id) {
    return await questionBankRepository.getSingleQuestion(id);
}

export async function updateQuestion(id, questionData, updatedBy, universityId) {
    questionData.updatedBy = updatedBy;
    if (universityId) {
        questionData.universityId = universityId;
    }
    return await questionBankRepository.updateQuestion(id, questionData);
}

export async function deleteQuestion(id) {
    return await questionBankRepository.deleteQuestion(id);
}
