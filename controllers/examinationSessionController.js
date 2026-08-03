import * as examinationSessionServices from "../services/examinationSessionServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export const createExaminationSession = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      createdBy: req.user?.userId || req.user?.id || req.body.createdBy,
      updatedBy: req.user?.userId || req.user?.id || req.body.updatedBy,
    };
    const result = await examinationSessionServices.createExaminationSession(payload);
    return SuccessResponse(res, 201, "Examination session created successfully", result);
  } catch (error) {
    console.error("Error creating examination session:", error);
    return ErrorResponse(res, 500, "Failed to create examination session", error.message);
  }
};

export const getExaminationSessions = async (req, res) => {
  try {
    const filters = {
      ...req.query,
      page: req.query.page || 1,
      limit: req.query.limit || 10,
    };
    const result = await examinationSessionServices.getExaminationSessions(filters);
    return SuccessResponse(res, 200, "Examination sessions fetched successfully", result);
  } catch (error) {
    console.error("Error fetching examination sessions:", error);
    return ErrorResponse(res, 500, "Failed to fetch examination sessions", error.message);
  }
};

export const getExaminationSessionById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await examinationSessionServices.getExaminationSessionById(id);
    if (!result) {
      return ErrorResponse(res, 404, "Examination session not found");
    }
    return SuccessResponse(res, 200, "Examination session details fetched successfully", result);
  } catch (error) {
    console.error("Error fetching examination session by id:", error);
    return ErrorResponse(res, 500, "Failed to fetch examination session", error.message);
  }
};

export const updateExaminationSession = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = {
      ...req.body,
      updatedBy: req.user?.userId || req.user?.id || req.body.updatedBy,
    };
    const result = await examinationSessionServices.updateExaminationSession(id, payload);
    if (!result) {
      return ErrorResponse(res, 404, "Examination session not found");
    }
    return SuccessResponse(res, 200, "Examination session updated successfully", result);
  } catch (error) {
    console.error("Error updating examination session:", error);
    return ErrorResponse(res, 500, "Failed to update examination session", error.message);
  }
};

export const deleteExaminationSession = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await examinationSessionServices.deleteExaminationSession(id);
    if (!result) {
      return ErrorResponse(res, 404, "Examination session not found");
    }
    return SuccessResponse(res, 200, "Examination session deleted successfully", result);
  } catch (error) {
    console.error("Error deleting examination session:", error);
    return ErrorResponse(res, 500, "Failed to delete examination session", error.message);
  }
};

export const createExaminationSessionTerm = async (req, res) => {
  try {
    const result = await examinationSessionServices.createExaminationSessionTerm(req.body);
    return SuccessResponse(res, 201, "Examination session term mapping created successfully", result);
  } catch (error) {
    console.error("Error creating examination session term:", error);
    return ErrorResponse(res, 500, "Failed to create examination session term", error.message);
  }
};

export const deleteExaminationSessionTerm = async (req, res) => {
  try {
    const { examinationSessionTermId } = req.params;
    const result = await examinationSessionServices.deleteExaminationSessionTerm(examinationSessionTermId);
    if (!result) {
      return ErrorResponse(res, 404, "Examination session term mapping not found");
    }
    return SuccessResponse(res, 200, "Examination session term mapping deleted successfully", result);
  } catch (error) {
    console.error("Error deleting examination session term:", error);
    return ErrorResponse(res, 500, "Failed to delete examination session term", error.message);
  }
};
