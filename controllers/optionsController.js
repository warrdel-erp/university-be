import * as optionsServices from '../services/optionsServices.js';
import { SuccessResponse, ErrorResponse } from '../utility/response.js';

export const getAffiliatedUniversityOptions = async (req, res) => {
    try {
        const result = await optionsServices.getAffiliatedUniversityOptions();
        return SuccessResponse(res, 200, "Affiliated university options fetched successfully", result);
    } catch (error) {
        console.error("Error in getAffiliatedUniversityOptions:", error);
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
};

export const getCourseOptions = async (req, res) => {
    try {
        const result = await optionsServices.getCourseOptions();
        return SuccessResponse(res, 200, "Course options fetched successfully", result);
    } catch (error) {
        console.error("Error in getCourseOptions:", error);
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
};

export const getTermOptions = async (req, res) => {
    try {
        const { courseId } = req.query;
        if (!courseId) {
            return ErrorResponse(res, 400, "Course ID is required");
        }
        const result = await optionsServices.getTermOptions(courseId);
        return SuccessResponse(res, 200, "Term options fetched successfully", result);
    } catch (error) {
        console.error("Error in getTermOptions:", error);
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
};

export const getClassSectionOptions = async (req, res) => {
    try {
        const { courseId, term } = req.query;
        if (!courseId || !term) {
            return ErrorResponse(res, 400, "Course ID and term (number) are required");
        }
        const result = await optionsServices.getClassSectionOptions(courseId, term);
        return SuccessResponse(res, 200, "Class section options fetched successfully", result);
    } catch (error) {
        console.error("Error in getClassSectionOptions:", error);
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
};

export const getSpecializationOptions = async (req, res) => {
    try {
        const { courseId } = req.query;
        const result = await optionsServices.getSpecializationOptions(courseId);
        return SuccessResponse(res, 200, "Specialization options fetched successfully", result);
    } catch (error) {
        console.error("Error in getSpecializationOptions:", error);
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
};

export async function getSubjectOptions(req, res) {
    try {
        const { courseId, term } = req.query;
        const result = await optionsServices.getSubjectOptions(courseId, term);
        return SuccessResponse(res, 200, "Subject options fetched successfully", result);
    } catch (error) {
        console.error("Error in getSubjectOptions:", error);
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
};

export const getTeacherOptions = async (req, res) => {
    try {
        const { campusId } = req.query;
        const result = await optionsServices.getTeacherOptions(campusId);
        return SuccessResponse(res, 200, "Teacher options fetched successfully", result);
    } catch (error) {
        console.error("Error in getTeacherOptions:", error);
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
};

export const getFeePlanOptions = async (req, res) => {
    try {
        const result = await optionsServices.getFeePlanOptions(req.query);
        return SuccessResponse(res, 200, "Fee plan options fetched successfully", result);
    } catch (error) {
        console.error("Error in getFeePlanOptions:", error);
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
};

export const getTopicOptions = async (req, res) => {
    try {
        const result = await optionsServices.getTopicOptions(req.query);
        return SuccessResponse(res, 200, "Topic options fetched successfully", result);
    } catch (error) {
        console.error("Error in getTopicOptions:", error);
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
};
