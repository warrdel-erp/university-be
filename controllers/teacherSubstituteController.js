import * as teacherSubstituteService from "../services/teacherSubstituteServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function addTeacherSubstitute(req, res) {
    try {
        const createdBy = req.user.userId;
        const result = await teacherSubstituteService.addTeacherSubstitute(req.body, createdBy, createdBy);
        return SuccessResponse(res, 201, "Teacher substitute added successfully", result);
    } catch (error) {
        const status = error.message?.includes("not found") ? 404 : 400;
        return ErrorResponse(res, status, error.message);
    }
}

export async function getTeacherSubstitutes(req, res) {
    try {
        const { userId } = req.query;
        const result = await teacherSubstituteService.getTeacherSubstitutes(userId);
        return SuccessResponse(res, 200, "Teacher substitutes fetched successfully", result);
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function getTeacherSubstituteById(req, res) {
    try {
        const { teacherSubstituteId } = req.query;
        const result = await teacherSubstituteService.getTeacherSubstituteById(teacherSubstituteId);
        if (!result) {
            return ErrorResponse(res, 404, "Teacher substitute not found");
        }
        return SuccessResponse(res, 200, "Teacher substitute fetched successfully", result);
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function updateTeacherSubstitute(req, res) {
    try {
        const { teacherSubstituteId, ...updateData } = req.body;
        const result = await teacherSubstituteService.updateTeacherSubstitute(
            teacherSubstituteId,
            updateData,
            req.user.userId,
        );
        if (!result) {
            return ErrorResponse(res, 404, "Teacher substitute not found");
        }
        return SuccessResponse(res, 200, "Teacher substitute updated successfully", result);
    } catch (error) {
        const status = error.message?.includes("not found") ? 404 : 400;
        return ErrorResponse(res, status, error.message);
    }
}

export async function deleteTeacherSubstitute(req, res) {
    try {
        const { teacherSubstituteId } = req.query;
        const deleted = await teacherSubstituteService.deleteTeacherSubstitute(teacherSubstituteId);
        if (!deleted) {
            return ErrorResponse(res, 404, "Teacher substitute not found");
        }
        return SuccessResponse(res, 200, "Teacher substitute deleted successfully");
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}
