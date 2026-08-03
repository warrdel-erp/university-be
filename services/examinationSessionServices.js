import * as examinationSessionRepository from "../repository/examinationSessionRepository.js";

export async function createExaminationSession(sessionData, options) {
  return await examinationSessionRepository.createExaminationSession(sessionData, options);
}

export async function getExaminationSessions(filters) {
  return await examinationSessionRepository.getExaminationSessions(filters);
}

export async function getExaminationSessionById(id, options) {
  return await examinationSessionRepository.getExaminationSessionById(id, options);
}

export async function updateExaminationSession(id, updateData, options) {
  return await examinationSessionRepository.updateExaminationSession(id, updateData, options);
}

export async function deleteExaminationSession(id, options) {
  return await examinationSessionRepository.deleteExaminationSession(id, options);
}

export async function createExaminationSessionTerm(termData, options) {
  return await examinationSessionRepository.createExaminationSessionTerm(termData, options);
}

export async function deleteExaminationSessionTerm(examinationSessionTermId, options) {
  return await examinationSessionRepository.deleteExaminationSessionTerm(examinationSessionTermId, options);
}
