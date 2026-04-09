import * as examSetupTypeTermServices from '../services/examSetupTypeTermServices.js';
import { SuccessResponse, ErrorResponse } from '../utility/response.js';

export const bulkCreateExamSetupTypeTerm = async (req, res) => {
    try {
        const { examSetupTypeTerms } = req.body;
        if (!Array.isArray(examSetupTypeTerms) || examSetupTypeTerms.length === 0) {
            return ErrorResponse(res, 400, "examSetupTypeTerms must be a non-empty array");
        }

        const data = examSetupTypeTerms.map(item => ({
            ...item,
            universityId: req.user.universityId,
            instituteId: req.user.defaultInstituteId,
            acedmicYearId: req.user.defaultAcademicYearId,
            createdBy: req.user.userId,
            updatedBy: req.user.userId
        }));

        const result = await examSetupTypeTermServices.bulkCreateExamSetupTypeTerm(data);
        return SuccessResponse(res, 201, "Exam setup type terms created successfully", result);
    } catch (error) {
        console.error("Error in bulkCreateExamSetupTypeTerm:", error);
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
};

export const deleteExamSetupTypeTerm = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return ErrorResponse(res, 400, "id is required");
        }
        const result = await examSetupTypeTermServices.deleteExamSetupTypeTerm(id);
        if (result) {
            return SuccessResponse(res, 200, "Exam setup type term deleted successfully");
        } else {
            return ErrorResponse(res, 404, "Exam setup type term not found");
        }
    } catch (error) {
        console.error("Error in deleteExamSetupTypeTerm:", error);
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
};

