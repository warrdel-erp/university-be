import * as examinationSessionSlotServices from "../services/examinationSessionSlotServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export const createExaminationSessionSlot = async (req, res) => {
  try {
    const result = await examinationSessionSlotServices.createExaminationSessionSlot({
      payload: req.body,
      user: req.user,
    });
    return SuccessResponse(res, 201, "Examination session slot created successfully", result);
  } catch (error) {
    console.error("Error creating examination session slot:", error);
    const statusCode = error.statusCode || 500;
    return ErrorResponse(res, statusCode, error.message || "Failed to create examination session slot");
  }
};

export const getExaminationSessionSlots = async (req, res) => {
  try {
    const { examinationSessionId, date, selections, filterStatus } = req.query;

    const result = await examinationSessionSlotServices.getExaminationSessionSlots({
      examinationSessionId,
      date,
      selections,
      filterStatus,
    });
    return SuccessResponse(res, 200, "Examination session slots fetched successfully", result);
  } catch (error) {
    console.error("Error fetching examination session slots:", error);
    const statusCode = error.statusCode || 500;
    return ErrorResponse(res, statusCode, error.message || "Failed to fetch examination session slots");
  }
};

export const getExaminationSessionSlotById = async (req, res) => {
  try {
    const { examinationSessionSlotId } = req.query;
    const result = await examinationSessionSlotServices.getExaminationSessionSlotById(examinationSessionSlotId);
    if (!result) {
      return ErrorResponse(res, 404, "Examination session slot not found");
    }
    return SuccessResponse(res, 200, "Examination session slot fetched successfully", result);
  } catch (error) {
    console.error("Error fetching examination session slot:", error);
    const statusCode = error.statusCode || 500;
    return ErrorResponse(res, statusCode, error.message || "Failed to fetch examination session slot");
  }
};

export const updateExaminationSessionSlot = async (req, res) => {
  try {
    const result = await examinationSessionSlotServices.updateExaminationSessionSlots({
      payloadArray: req.body,
      user: req.user,
    });
    return SuccessResponse(res, 200, "Examination session slots updated successfully", result);
  } catch (error) {
    console.error("Error updating examination session slot:", error);
    const statusCode = error.statusCode || 500;
    return ErrorResponse(res, statusCode, error.message || "Failed to update examination session slot");
  }
};

export const deleteExaminationSessionSlot = async (req, res) => {
  try {
    const { examinationSessionSlotId } = req.query;
    await examinationSessionSlotServices.deleteExaminationSessionSlot(examinationSessionSlotId);
    return SuccessResponse(res, 200, "Examination session slot deleted successfully");
  } catch (error) {
    console.error("Error deleting examination session slot:", error);
    const statusCode = error.statusCode || 500;
    return ErrorResponse(res, statusCode, error.message || "Failed to delete examination session slot");
  }
};
