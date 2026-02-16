import * as subjectService from '../services/subjectService.js';

export const getSubjectTiny = async (req, res) => {
    const universityId = req.user.universityId;
    try {
        const { acedmicYearId, campusId, instituteId } = req.query;
        if (!universityId) {
            return res.status(400).send('University Id is required');
        }
        const result = await subjectService.getSubjectTiny(universityId, acedmicYearId, campusId, instituteId);
        return res.status(200).send({ data: result, success: true });
    } catch (error) {
        console.error("Error in getting subject tiny data:", error);
        return res.status(500).send({ error: error, success: false });
    }
};

export const getAllSubjects = async (req, res) => {
    const universityId = req.user.universityId;
    try {
        const { acedmicYearId, campusId, instituteId } = req.query;

        if (!universityId) {
            return res.status(400).send('University Id is required');
        }
        const result = await subjectService.getAllSubjects(universityId, acedmicYearId, campusId, instituteId);
        return res.status(200).send({ data: result, success: true });
    } catch (error) {
        console.error("Error in getAllSubjects controller:", error);
        return res.status(500).send({ error: error, success: false });
    }
};
