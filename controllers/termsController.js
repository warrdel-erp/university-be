import * as termsService from '../services/termsService.js';
import { getTenantStore } from '../utility/requestContext.js';

export async function getTermsData(req, res) {
  const { courseId, sessionId } = req.query;

  try {
    const data = await termsService.getTermsData(courseId, sessionId);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export const getTermsWithSubject = async (req, res, next) => {
  try {
    const instituteId = Number(req.query.instituteId);
    const acedmicYearId = Number(req.query.acedmicYearId ?? getTenantStore().academicYearId);

    const authorizedInstituteId = Number(getTenantStore().instituteId);
    if (instituteId !== authorizedInstituteId) {
      return res.status(403).json({ message: 'instituteId does not match authorized institute' });
    }
    const data = await termsService.getTermsWithSubjectService(instituteId, acedmicYearId);
    return res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

export async function getTermsWithExamTypes(req, res) {
  const { courseId, sessionId } = req.query;

  try {
    const data = await termsService.getTermsWithExamTypes(courseId, sessionId);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
