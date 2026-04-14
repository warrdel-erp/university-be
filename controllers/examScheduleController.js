import * as examScheduleServices from '../services/examScheduleServices.js';
import { SuccessResponse, ErrorResponse } from '../utility/response.js';

export const getExamSchedules = async (req, res) => {
    try {
        const universityId = req.user.universityId;
        const acedmicYearId = req.user.defaultAcademicYearId
        const instituteId = req.user.defaultInstituteId;

        const { subjectId, semesterId, examSetupTypeTermId, courseId, term } = req.query;

        const filters = {
            ...(subjectId && { subjectId: parseInt(subjectId) }),
            ...(semesterId && { semesterId: parseInt(semesterId) }),
            ...(examSetupTypeTermId && { examSetupTypeTermId: parseInt(examSetupTypeTermId) }),
            ...(courseId && { courseId: parseInt(courseId) }),
            ...(term && { term: parseInt(term) })
        };

        const result = await examScheduleServices.getExamSchedules(universityId, acedmicYearId, instituteId, filters);
        return SuccessResponse(res, 200, "Exam schedules fetched successfully", result);
    } catch (error) {
        console.error("Error in getExamSchedules controller:", error);
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
};

export const getExamScheduleById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await examScheduleServices.getExamScheduleById(id);

        if (!result) {
            return ErrorResponse(res, 404, "Exam schedule not found");
        }

        return SuccessResponse(res, 200, "Exam schedule fetched successfully", result);
    } catch (error) {
        console.error("Error in getExamScheduleById controller:", error);
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
};
