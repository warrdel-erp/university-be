import * as examRoomCapacityServices from "../services/examScheduleRoomCapacityServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";
import { ZodError } from "zod";

export async function addExamRoomCapacity(req, res) {
  try {
    const result = await examRoomCapacityServices.addExamRoomCapacity(req.body, req.user.userId);
    return SuccessResponse(res, 201, "Exam room assignment added successfully", result);
  } catch (error) {
    if (error instanceof ZodError) {
      return ErrorResponse(res, 400, "Validation Error", error.errors);
    }
    return ErrorResponse(res, 500, error.message);
  }
}

export async function updateExamRoomCapacity(req, res) {
  try {
    const { examScheduleRoomCapacityId } = req.body;
    const result = await examRoomCapacityServices.updateExamRoomCapacity(
      examScheduleRoomCapacityId,
      req.body,
      req.user.userId,
    );
    return SuccessResponse(res, 200, "Exam room assignment updated successfully", result);
  } catch (error) {
    if (error instanceof ZodError) {
      return ErrorResponse(res, 400, "Validation Error", error.errors);
    }
    return ErrorResponse(res, 400, error.message);
  }
}

export async function getAvailableRoomsForExamSchedule(req, res) {
  try {
    const data = await examRoomCapacityServices.getAvailableRoomsForExamSchedule(
      req.query.examScheduleId,
      req.user.universityId,
    );
    return SuccessResponse(res, 200, "Available rooms fetched successfully", data);
  } catch (error) {
    const status = error.message === "Exam schedule not found" ? 404 : 400;
    return ErrorResponse(res, status, error.message);
  }
}

export async function getExamScheduleRooms(req, res) {
  try {
    const data = await examRoomCapacityServices.getExamScheduleRooms(
      req.query.examScheduleId,
    );
    return SuccessResponse(res, 200, "Assigned rooms fetched successfully", data);
  } catch (error) {
    const status = error.message === "Exam schedule not found" ? 404 : 400;
    return ErrorResponse(res, status, error.message);
  }
}

export async function deleteExamRoomCapacity(req, res) {
  try {
    const { examScheduleRoomCapacityId } = req.params;
    const result = await examRoomCapacityServices.deleteExamRoomCapacity(examScheduleRoomCapacityId);
    return SuccessResponse(res, 200, "Exam room assignment deleted successfully", result);
  } catch (error) {
    return ErrorResponse(res, 400, error.message);
  }
}

