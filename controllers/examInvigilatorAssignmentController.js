import * as examInvigilatorAssignmentServices from "../services/examInvigilatorAssignmentServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function createAssignment(req, res) {
    try {
        const payload = {
            ...req.body,
            assignedBy: req.user.userId,
            createdBy: req.user.userId,
            updatedBy: req.user.userId,
        };
        const result = await examInvigilatorAssignmentServices.createAssignment(payload);
        return SuccessResponse(res, 201, "Invigilator assignment created successfully", result);
    } catch (error) {
        const statusCode = error.statusCode || 500;
        return ErrorResponse(res, statusCode, error.message);
    }
}

export async function updateAssignment(req, res) {
    try {
        const { examInvigilatorAssignmentId } = req.query;
        const payload = {
            ...req.body,
            updatedBy: req.user.userId,
        };
        const result = await examInvigilatorAssignmentServices.updateAssignment(examInvigilatorAssignmentId, payload);
        return SuccessResponse(res, 200, "Invigilator assignment updated successfully", result);
    } catch (error) {
        const statusCode = error.statusCode || 500;
        return ErrorResponse(res, statusCode, error.message);
    }
}

export async function getAssignmentById(req, res) {
    try {
        const { examInvigilatorAssignmentId } = req.query;
        const result = await examInvigilatorAssignmentServices.getAssignmentById(examInvigilatorAssignmentId);
        return SuccessResponse(res, 200, "Invigilator assignment fetched successfully", result);
    } catch (error) {
        const statusCode = error.statusCode || 500;
        return ErrorResponse(res, statusCode, error.message);
    }
}

export async function getAssignments(req, res) {
    try {
        const {
            examInvigilatorAssignmentId,
            examinationSessionSlotId,
            examDate,
            classRoomSectionId,
            userId,
            role,
            examScheduleId,
        } = req.query;

        if (examInvigilatorAssignmentId) {
            const result = await examInvigilatorAssignmentServices.getAssignmentById(examInvigilatorAssignmentId);
            return SuccessResponse(res, 200, "Invigilator assignment fetched successfully", result);
        }

        if (examScheduleId && classRoomSectionId) {
            const result = await examInvigilatorAssignmentServices.getRoomAssignmentDetail(Number(examScheduleId), Number(classRoomSectionId));
            return SuccessResponse(res, 200, "Invigilator assignments fetched successfully", result);
        }

        const result = await examInvigilatorAssignmentServices.getAssignments(
            { examinationSessionSlotId, examDate, classRoomSectionId, userId, role, examScheduleId }
        );

        return SuccessResponse(res, 200, "Invigilator assignments fetched successfully", result);
    } catch (error) {
        const statusCode = error.statusCode || 500;
        return ErrorResponse(res, statusCode, error.message);
    }
}

export async function deleteAssignment(req, res) {
    try {
        const { examInvigilatorAssignmentId } = req.query;
        const result = await examInvigilatorAssignmentServices.deleteAssignment(examInvigilatorAssignmentId);
        return SuccessResponse(res, 200, result.message);
    } catch (error) {
        const statusCode = error.statusCode || 500;
        return ErrorResponse(res, statusCode, error.message);
    }
}

export async function getInvigilatorSummary(req, res) {
    try {
        const {
            examinationSessionId,
            sessionId,
            courseId,
            term,
            examDate,
            examinationSessionSlotId
        } = req.query;

        const result = await examInvigilatorAssignmentServices.getInvigilatorSummary({
            examinationSessionId,
            sessionId,
            courseId,
            term,
            examDate,
            examinationSessionSlotId
        });
        return SuccessResponse(res, 200, "Invigilator summary fetched successfully", result);
    } catch (error) {
        const statusCode = error.statusCode || 500;
        return ErrorResponse(res, statusCode, error.message);
    }
}

export async function getAssignmentsByUserId(req, res) {
    try {
        const { userId, examinationSessionId } = req.query;
        const result = await examInvigilatorAssignmentServices.getAssignmentsByUserId(userId, examinationSessionId);
        return SuccessResponse(res, 200, "Invigilator assignments fetched successfully", result);
    } catch (error) {
        const statusCode = error.statusCode || 500;
        return ErrorResponse(res, statusCode, error.message);
    }
}

export async function getAssignmentsByRoom(req, res) {
    try {
        const { classRoomSectionId, examinationSessionId, examDate, examinationSessionSlotId } = req.query;
        if (!classRoomSectionId) {
            return ErrorResponse(res, 400, "Missing required parameter: classRoomSectionId");
        }
        const result = await examInvigilatorAssignmentServices.getAssignmentsByRoom(
            Number(classRoomSectionId),
            { examinationSessionId, examDate, examinationSessionSlotId }
        );
        return SuccessResponse(res, 200, "Room assignment details fetched successfully", result);
    } catch (error) {
        const statusCode = error.statusCode || 500;
        return ErrorResponse(res, statusCode, error.message);
    }
}

export async function getFacultyAvailability(req, res) {
    try {
        const { examScheduleId, classRoomSectionId, examinationSessionSlotId, examDate } = req.query;
        const result = await examInvigilatorAssignmentServices.getFacultyAvailability({
            examScheduleId,
            classRoomSectionId,
            examinationSessionSlotId,
            examDate
        });
        return SuccessResponse(res, 200, "Faculty availability fetched successfully", result);
    } catch (error) {
        const statusCode = error.statusCode || 500;
        return ErrorResponse(res, statusCode, error.message);
    }
}

export async function getMyAssignments(req, res) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return ErrorResponse(res, 404, "User ID not found");
        }
        const { examinationSessionId } = req.query;
        const result = await examInvigilatorAssignmentServices.getAssignmentsByUserId(userId, examinationSessionId);
        return SuccessResponse(res, 200, "Invigilator assignments fetched successfully", result);
    } catch (error) {
        const statusCode = error.statusCode || 500;
        return ErrorResponse(res, statusCode, error.message);
    }
}

export async function getListOfRoomsRoomWise(req, res) {
    try {
        const { examinationSessionId, examDate, page = 1, limit = 10 } = req.query;
        const result = await examInvigilatorAssignmentServices.getListOfRoomsRoomWise(
            { examinationSessionId, examDate },
            { page: Number(page), limit: Number(limit) },
        );
        return SuccessResponse(res, 200, "Rooms list fetched successfully", result.rooms, {
            total: result.total,
            limit: result.limit,
            page: result.page,
        });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        return ErrorResponse(res, statusCode, error.message);
    }
}
