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
    const statusCode = error.statusCode || 400;
    return ErrorResponse(res, statusCode, error.message || "Failed to create examination session");
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
    const statusCode = error.statusCode || 500;
    return ErrorResponse(res, statusCode, error.message || "Failed to fetch examination sessions");
  }
};

export const getExaminationSessionById = async (req, res) => {
  try {
    const id = req.query.examinationSessionId || req.query.id || req.params.id;
    const result = await examinationSessionServices.getExaminationSessionById(id);
    if (!result) {
      return ErrorResponse(res, 404, "Examination session not found");
    }
    return SuccessResponse(res, 200, "Examination session details fetched successfully", result);
  } catch (error) {
    console.error("Error fetching examination session by id:", error);
    const statusCode = error.statusCode || 500;
    return ErrorResponse(res, statusCode, error.message || "Failed to fetch examination session");
  }
};

export const updateExaminationSession = async (req, res) => {
  try {
    const id = req.query.examinationSessionId || req.query.id || req.params.id;
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
    const statusCode = error.statusCode || 400;
    return ErrorResponse(res, statusCode, error.message || "Failed to update examination session");
  }
};

export const deleteExaminationSession = async (req, res) => {
  try {
    const id = req.query.examinationSessionId || req.query.id || req.params.id;
    const result = await examinationSessionServices.deleteExaminationSession(id);
    if (!result) {
      return ErrorResponse(res, 404, "Examination session not found");
    }
    return SuccessResponse(res, 200, "Examination session deleted successfully", result);
  } catch (error) {
    console.error("Error deleting examination session:", error);
    const statusCode = error.statusCode || 500;
    return ErrorResponse(res, statusCode, error.message || "Failed to delete examination session");
  }
};

export const createExaminationSessionTerm = async (req, res) => {
  try {
    const result = await examinationSessionServices.createExaminationSessionTerm(req.body);
    return SuccessResponse(res, 201, "Examination session term mapping created successfully", result);
  } catch (error) {
    console.error("Error creating examination session term:", error);
    const statusCode = error.statusCode || 400;
    return ErrorResponse(res, statusCode, error.message || "Failed to create examination session term");
  }
};

export const deleteExaminationSessionTerm = async (req, res) => {
  try {
    const examinationSessionTermId = req.query.examinationSessionTermId || req.params.examinationSessionTermId;
    const result = await examinationSessionServices.deleteExaminationSessionTerm(examinationSessionTermId);
    if (!result) {
      return ErrorResponse(res, 404, "Examination session term mapping not found");
    }
    return SuccessResponse(res, 200, "Examination session term mapping deleted successfully", result);
  } catch (error) {
    console.error("Error deleting examination session term:", error);
    const statusCode = error.statusCode || 500;
    return ErrorResponse(res, statusCode, error.message || "Failed to delete examination session term");
  }
};

export const getClassSectionTermsBySetupType = async (req, res) => {
  try {
    const { examSetupTypeId, examinationSessionId } = req.query;
    const result = await examinationSessionServices.getClassSectionTermsBySetupType(
      examSetupTypeId,
      { examinationSessionId }
    );
    return SuccessResponse(res, 200, "Mapped class section terms fetched successfully", result);
  } catch (error) {
    console.error("Error fetching mapped class section terms:", error);
    const statusCode = error.statusCode || 500;
    return ErrorResponse(res, statusCode, error.message || "Failed to fetch mapped class section terms");
  }
};

export const getExaminationStructure = async (req, res) => {
  try {
    const result = await examinationSessionServices.getExaminationStructure(req.query);
    return SuccessResponse(res, 200, "Examination structure fetched successfully", result);
  } catch (error) {
    console.error("Error fetching examination structure:", error);
    const statusCode = error.statusCode || 500;
    return ErrorResponse(res, statusCode, error.message || "Failed to fetch examination structure");
  }
};

export const getMappedSubjectsBySessionAndTerm = async (req, res) => {
  try {
    const result = await examinationSessionServices.getMappedSubjectsBySessionAndTerm(req.query);
    return SuccessResponse(res, 200, "Mapped subjects fetched successfully", result);
  } catch (error) {
    console.error("Error fetching mapped subjects:", error);
    const statusCode = error.statusCode || 500;
    return ErrorResponse(res, statusCode, error.message || "Failed to fetch mapped subjects");
  }
};
