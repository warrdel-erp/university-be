import * as subjectService from '../services/subjectService.js';

export const getAllSubjects = async (req, res) => {
    const universityId = req.user.universityId;
    const instituteId = req.user.defaultInstituteId;
    const acedmicYearId = req.user.acedmicYearId;

    try {
        if (!universityId) {
            return res.status(400).send('University Id is required');
        }

        const filter = { ...req.query, universityId, instituteId, acedmicYearId };

        const result = await subjectService.getAllSubjects(filter);
        return res.status(200).send({ data: result, success: true });
    } catch (error) {
        console.error("Error in getAllSubjects controller:", error);
        return res.status(500).send({ error: error, success: false });
    }
};

export const setSubjectTerms = async (req, res) => {
    try {
        const termsArray = req.body;
        const result = await subjectService.setSubjectTerms(termsArray);
        return res.status(200).send({ data: result, success: true, message: "Subject terms updated successfully" });
    } catch (error) {
        console.error("Error in setSubjectTerms controller:", error);
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).send({ error: error.message, success: false });
    }
};
