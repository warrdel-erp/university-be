import * as questionBankRepository from "../repository/questionBankRepository.js";
import { withAuditEvent } from "../utility/audit/withAuditEvent.js";
import { AUDIT_EVENTS } from "../const/auditEvents.js";

export async function addQuestion(questionData, createdBy, updatedBy) {
    questionData.createdBy = createdBy;
    questionData.updatedBy = updatedBy;
    return withAuditEvent(AUDIT_EVENTS.QUESTION_BANK_CREATE, async ({ transaction }) => {
        return await questionBankRepository.addQuestion(questionData, { transaction });
    });
}

export async function getQuestions(filters, pagination) {
    return await questionBankRepository.getQuestions(filters, pagination);
}

export async function countQuestions(filters) {
    return await questionBankRepository.countQuestions(filters);
}

export async function bulkApproveQuestions(ids, updatedBy) {
    return withAuditEvent(AUDIT_EVENTS.QUESTION_BANK_BULK_APPROVE, async ({ transaction }) => {
        return await questionBankRepository.bulkUpdateStatus(ids, 'Approved', updatedBy, { transaction });
    });
}

export async function bulkRejectQuestions(ids, updatedBy) {
    return withAuditEvent(AUDIT_EVENTS.QUESTION_BANK_BULK_REJECT, async ({ transaction }) => {
        return await questionBankRepository.bulkUpdateStatus(ids, 'Rejected', updatedBy, { transaction });
    });
}

export async function getSingleQuestion(id, ownerId = null) {
    return await questionBankRepository.getSingleQuestion(id, ownerId);
}

export async function updateQuestion(id, questionData, updatedBy, ownerId = null) {
    questionData.updatedBy = updatedBy;
    return withAuditEvent(AUDIT_EVENTS.QUESTION_BANK_UPDATE, async ({ transaction }) => {
        return await questionBankRepository.updateQuestion(id, questionData, ownerId, { transaction });
    });
}

export async function deleteQuestion(id, ownerId = null) {
    return withAuditEvent(AUDIT_EVENTS.QUESTION_BANK_DELETE, async ({ transaction }) => {
        return await questionBankRepository.deleteQuestion(id, ownerId, { transaction });
    });
}
