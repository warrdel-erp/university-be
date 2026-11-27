import * as evaluationRepository from "../repository/evalutionRepository.js";
import { withAuditEvent } from "../utility/audit/withAuditEvent.js";
import { AUDIT_EVENTS } from "../const/auditEvents.js";

export async function addEvaluation(evaluations, createdBy, updatedBy) {
  const evaluationData = evaluations.map(item => ({
    ...item,
    createdBy,
    updatedBy,
  }));

  return await withAuditEvent(AUDIT_EVENTS.EVALUATION_CREATE, async ({ transaction }) => {
    return await evaluationRepository.addEvaluation(evaluationData, { transaction });
  });
}

export async function getEvaluationDetails(examSetupTypeId) {
  return await evaluationRepository.getEvaluationDetails(examSetupTypeId);
}

export async function getSingleEvaluationDetails(evaluationId) {
  return await evaluationRepository.getSingleEvaluationDetails(evaluationId);
}

export async function deleteEvaluation(evaluationId) {
  return await withAuditEvent(AUDIT_EVENTS.EVALUATION_DELETE, async ({ transaction }) => {
    return await evaluationRepository.deleteEvaluation(evaluationId, { transaction });
  });
}

export async function updateEvaluation(evaluationId, evaluationData, updatedBy) {
  return await withAuditEvent(AUDIT_EVENTS.EVALUATION_UPDATE, async ({ transaction }) => {
    evaluationData.updatedBy = updatedBy;
    return await evaluationRepository.updateEvaluation(evaluationId, evaluationData, { transaction });
  });
}