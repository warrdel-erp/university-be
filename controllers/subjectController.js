import * as subjectService from '../services/subjectService.js';
import * as examStructureScheduleServices from '../services/examStructureScheduleMappingServices.js';
import { ErrorResponse, SuccessResponse } from '../utility/response.js';

export const getAllSubjects = async (req, res) => {
    const universityId = req.user.universityId;
    const instituteId = req.user.defaultInstituteId;
    const acedmicYearId = req.user.defaultAcademicYearId;

    try {
        if (!universityId) {
            return res.status(400).send('University Id is required');
        }

        const filter = { ...req.query, universityId, instituteId, acedmicYearId };

        const result = await subjectService.getAllSubjects(filter);
        SuccessResponse(res, 200, "Subjects fetched successfully", result);
    } catch (error) {
        console.error("Error in getAllSubjects controller:", error);
        ErrorResponse(res, 500, "Error fetching subjects", error);
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

export const getSubjectsWithExamSchedule = async (req, res) => {
    try {
        const { courseId, term, examSetupTypeTermId } = req.query;
        const acedmicYearId = req.user.defaultAcademicYearId;

        const result = await examStructureScheduleServices.getSubjectsWithExamSchedule(
            courseId, acedmicYearId, term, examSetupTypeTermId
        );

        return SuccessResponse(res, 200, "Subjects with exam schedule fetched successfully", result);
    } catch (error) {
        console.error("Error in getSubjectsWithExamSchedule controller:", error);
        return ErrorResponse(res, 500, error.message);
    }
};
