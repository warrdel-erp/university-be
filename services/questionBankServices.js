import * as questionBankRepository from "../repository/questionBankRepository.js";

export async function addQuestion(questionData, createdBy, updatedBy) {
    questionData.createdBy = createdBy;
    questionData.updatedBy = updatedBy;
    return await questionBankRepository.addQuestion(questionData);
}

export async function getQuestions(filters, pagination) {
    return await questionBankRepository.getQuestions(filters, pagination);
}

export async function countQuestions(filters) {
    return await questionBankRepository.countQuestions(filters);
}

export async function bulkApproveQuestions(ids, updatedBy) {
    return await questionBankRepository.bulkUpdateStatus(ids, 'Approved', updatedBy);
}

export async function bulkRejectQuestions(ids, updatedBy) {
    return await questionBankRepository.bulkUpdateStatus(ids, 'Rejected', updatedBy);
}

export async function getSingleQuestion(id) {
    return await questionBankRepository.getSingleQuestion(id);
}

export async function updateQuestion(id, questionData, updatedBy) {
    questionData.updatedBy = updatedBy;
    return await questionBankRepository.updateQuestion(id, questionData);
}

export async function deleteQuestion(id) {
    return await questionBankRepository.deleteQuestion(id);
}
