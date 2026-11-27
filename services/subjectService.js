import * as subjectRepository from '../repository/subjectRepository.js';
import { withAuditEvent } from '../utility/audit/withAuditEvent.js';
import { AUDIT_EVENTS } from '../const/auditEvents.js';

export async function getAllSubjects(filter) {
  try {
    return await subjectRepository.getAllSubjects(filter);
  } catch (error) {
    console.error('Error in getAllSubjects service:', error);
    throw error;
  }
}

export async function setSubjectTerms(termsArray) {
  try {
    return await withAuditEvent(AUDIT_EVENTS.SUBJECT_TERM_ASSIGN, async ({ transaction }) => {
      return await subjectRepository.setSubjectTerms(termsArray, { transaction });
    });
  } catch (error) {
    console.error('Error in setSubjectTerms service:', error);
    throw error;
  }
}

export async function deleteSubject(subjectId) {
  try {
    return await withAuditEvent(AUDIT_EVENTS.SUBJECT_DELETE, async ({ transaction }) => {
      return await subjectRepository.deleteSubject(subjectId, { transaction });
    });
  } catch (error) {
    console.error('Error in deleteSubject service:', error);
    throw error;
  }
}
