import * as subjectService from '../services/subjectService.js';

export const getAllSubjects = async (req, res) => {
    const universityId = req.user.universityId;
    try {
        const { acedmicYearId, campusId, instituteId, courseId } = req.query;

        if (!universityId) {
            return res.status(400).send('University Id is required');
        }
        const result = await subjectService.getAllSubjects(universityId, acedmicYearId, campusId, instituteId, courseId);
        return res.status(200).send({ data: result, success: true });
    } catch (error) {
        console.error("Error in getAllSubjects controller:", error);
        return res.status(500).send({ error: error, success: false });
    }
};
