import * as termsService from '../services/termsService.js';
import { getTermsWithSubjectService } from '../services/termsService.js';

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
        console.log(req.query);
        const { instituteId, acedmicYearId } = req.query;
        console.warn("Query:", req.query);
        console.log("acedemicYearId:", req.query.acedmicYearId);
        const data = await termsService.getTermsWithSubjectService(instituteId, acedmicYearId);
        console.log("data", data);

        return res.status(200).json(data);

    } catch (error) {
        next(error);
    }
};