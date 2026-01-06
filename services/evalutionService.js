import * as evaluationRepository  from "../repository/evalutionRepository.js";

export async function addEvaluation(evaluations,createdBy,updatedBy,universityId,instituteId) {
  const evaluationData = evaluations.map(item => ({
    ...item,
    createdBy,
    updatedBy,
    universityId,
    instituteId
  }));

  const result = await evaluationRepository.addEvaluation(evaluationData);
  return result;
}


export async function getEvaluationDetails(universityId,examSetupTypeId,role,instituteId) {
    return await evaluationRepository.getEvaluationDetails(universityId,examSetupTypeId,role,instituteId);
}

export async function getSingleEvaluationDetails(evaluationId,universityId) {
    return await evaluationRepository.getSingleEvaluationDetails(evaluationId,universityId);
}

export async function deleteEvaluation(evaluationId) {
    return await evaluationRepository.deleteEvaluation(evaluationId);
}

export async function updateEvaluation(evaluationId, evaluationData, updatedBy) {    

    evaluationData.updatedBy = updatedBy;
    await evaluationRepository.updateEvaluation(evaluationId, evaluationData);
}