import * as examRoomCapacityServices from "../services/examRoomCapacityServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";
import { ZodError } from "zod";

export async function addExamRoomCapacity(req, res) {
    try {
        const result = await examRoomCapacityServices.addExamRoomCapacity(req.body, req.user.userId);
        return SuccessResponse(res, 201, "Exam room capacity added successfully", result);
    } catch (error) {
        if (error instanceof ZodError) {
            return ErrorResponse(res, 400, "Validation Error", error.errors);
        }
        return ErrorResponse(res, 500, error.message);
    }
}

export async function getExamRoomCapacities(req, res) {
    try {
        const { classRoomSectionId } = req.query;
        const result = await examRoomCapacityServices.getExamRoomCapacities(classRoomSectionId);
        return SuccessResponse(res, 200, "Exam room capacities fetched successfully", result);
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function updateExamRoomCapacity(req, res) {
    try {
        const { examRoomCapacityId } = req.body;
        const result = await examRoomCapacityServices.updateExamRoomCapacity(examRoomCapacityId, req.body, req.user.userId);
        return SuccessResponse(res, 200, "Exam room capacity updated successfully", result);
    } catch (error) {
        if (error instanceof ZodError) {
            return ErrorResponse(res, 400, "Validation Error", error.errors);
        }
        return ErrorResponse(res, 400, error.message);
    }
}

export async function deleteExamRoomCapacity(req, res) {
    try {
        const { examRoomCapacityId } = req.params;
        const result = await examRoomCapacityServices.deleteExamRoomCapacity(examRoomCapacityId);
        return SuccessResponse(res, 200, "Exam room capacity deleted successfully", result);
    } catch (error) {
        return ErrorResponse(res, 400, error.message);
    }
}

export async function activateExamRoomCapacity(req, res) {
    try {
        const { examRoomCapacityId } = req.params;
        const result = await examRoomCapacityServices.activateExamRoomCapacity(examRoomCapacityId, req.user.userId);
        return SuccessResponse(res, 200, "Exam room capacity activated successfully", result);
    } catch (error) {
        return ErrorResponse(res, 400, error.message);
    }
}
