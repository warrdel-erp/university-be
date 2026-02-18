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
