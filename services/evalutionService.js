import * as evaluationRepository  from "../repository/evalutionRepository.js";

export async function addEvaluation(evaluations, createdBy, updatedBy) {
  const evaluationData = evaluations.map(item => ({
    ...item,
    createdBy,
    updatedBy,
  }));

  return await evaluationRepository.addEvaluation(evaluationData);
}

export async function getEvaluationDetails(examSetupTypeId) {
    return await evaluationRepository.getEvaluationDetails(examSetupTypeId);
}

export async function getSingleEvaluationDetails(evaluationId) {
    return await evaluationRepository.getSingleEvaluationDetails(evaluationId);
}

export async function deleteEvaluation(evaluationId) {
    return await evaluationRepository.deleteEvaluation(evaluationId);
}

export async function updateEvaluation(evaluationId, evaluationData, updatedBy) {    

    evaluationData.updatedBy = updatedBy;
    await evaluationRepository.updateEvaluation(evaluationId, evaluationData);
}