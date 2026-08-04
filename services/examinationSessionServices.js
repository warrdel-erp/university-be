import sequelize from "../database/sequelizeConfig.js";
import * as examinationSessionRepository from "../repository/examinationSessionRepository.js";

export async function createExaminationSession(sessionData, options = {}) {
  return await sequelize.transaction(async (t) => {
    return await examinationSessionRepository.createExaminationSession(sessionData, { ...options, transaction: t });
  });
}

export async function getExaminationSessions(filters) {
  return await examinationSessionRepository.getExaminationSessions(filters);
}

export async function getExaminationSessionById(id, options) {
  return await examinationSessionRepository.getExaminationSessionById(id, options);
}

export async function updateExaminationSession(id, updateData, options = {}) {
  return await sequelize.transaction(async (t) => {
    return await examinationSessionRepository.updateExaminationSession(id, updateData, { ...options, transaction: t });
  });
}

export async function deleteExaminationSession(id, options = {}) {
  return await sequelize.transaction(async (t) => {
    return await examinationSessionRepository.deleteExaminationSession(id, { ...options, transaction: t });
  });
}

export async function createExaminationSessionTerm(termData, options = {}) {
  return await sequelize.transaction(async (t) => {
    return await examinationSessionRepository.createExaminationSessionTerm(termData, { ...options, transaction: t });
  });
}

export async function deleteExaminationSessionTerm(examinationSessionTermId, options = {}) {
  return await sequelize.transaction(async (t) => {
    return await examinationSessionRepository.deleteExaminationSessionTerm(examinationSessionTermId, { ...options, transaction: t });
  });
}

export async function getClassSectionTermsBySetupType(examSetupTypeId, options) {
  return await examinationSessionRepository.getClassSectionTermsBySetupType(
    examSetupTypeId,
    options
  );
}

export async function getExaminationStructure(queryParams, options) {
  return await examinationSessionRepository.getExaminationStructure(queryParams, options);
}

export async function getMappedSubjectsBySessionAndTerm(queryParams, options) {
  return await examinationSessionRepository.getMappedSubjectsBySessionAndTerm(queryParams, options);
}

export async function getExamSchedulesBySession(examinationSessionId, options) {
  return await examinationSessionRepository.getExamSchedulesBySession(examinationSessionId, options);
}
