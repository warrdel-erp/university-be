import * as termsService from '../services/termsService.js';

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

        const { instituteId, acedmicYearId } = req.query;
        const data = await termsService.getTermsWithSubjectService(instituteId, acedmicYearId);
        return res.status(200).json(data);

    } catch (error) {
        next(error);
    }
};

export async function getTermsWithExamTypes(req, res) {
    const { courseId } = req.query;

    const acedmicYearId = req.user.defaultAcademicYearId;

    try {
        const data = await termsService.getTermsWithExamTypes(courseId, acedmicYearId);
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}