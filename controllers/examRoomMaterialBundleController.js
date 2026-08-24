import * as service from "../services/examRoomMaterialBundleService.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export const getBundleList = async (req, res) => {
  try {
    const filters = {
      examinationSessionId: req.query.examinationSessionId,
      examDate: req.query.examDate,
      examinationSessionSlotId: req.query.examinationSessionSlotId,
      courseId: req.query.courseId,
      sessionId: req.query.sessionId,
      term: req.query.term,
      status: req.query.status,
      search: req.query.search,
    };
    
    const limit = parseInt(req.query.limit, 10) || 10;
    const page = parseInt(req.query.page, 10) || 1;
    
    const result = await service.getBundleList(filters, { limit, page });
    
    return SuccessResponse(res, 200, "Bundles fetched successfully", result.rows, {
      total: result.count,
      page,
      limit,
    });
  } catch (error) {
    console.error(error);
    return ErrorResponse(res, 500, error.message);
  }
};

export const getBundleByRoomDetails = async (req, res) => {
  try {
    const { classRoomSectionId, examDate, examinationSessionSlotId } = req.query;
    const result = await service.getBundleByRoomDetails(
      Number(classRoomSectionId),
      examDate,
      Number(examinationSessionSlotId)
    );
    return SuccessResponse(res, 200, "Bundle room details fetched successfully", result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return ErrorResponse(res, statusCode, error.message);
  }
};

export const createBundle = async (req, res) => {
  try {
    const user = req.user;
    const result = await service.createBundle(req.body, user);
    return SuccessResponse(res, 201, "Bundle created successfully", result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return ErrorResponse(res, statusCode, error.message);
  }
};

export const updateBundleItems = async (req, res) => {
  try {
    const user = req.user;
    const result = await service.updateBundleItems(req.params.examRoomMaterialBundleId, req.body, user);
    return SuccessResponse(res, 200, "Bundle items updated successfully", result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return ErrorResponse(res, statusCode, error.message);
  }
};

export const getBundleSummary = async (req, res) => {
  try {
    const examinationSessionId = Number(req.query.examinationSessionId);
    const result = await service.getBundleSummary(examinationSessionId);
    return SuccessResponse(res, 200, "Bundle summary fetched successfully", result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return ErrorResponse(res, statusCode, error.message);
  }
};

export const updateBundleStatus = async (req, res) => {
  try {
    const user = req.user;
    const { status } = req.body;
    const result = await service.updateBundleStatus(req.params.examRoomMaterialBundleId, status, user);
    return SuccessResponse(res, 200, "Bundle status updated successfully", result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return ErrorResponse(res, statusCode, error.message);
  }
};

export const getReadyBundleList = async (req, res) => {
  try {
    const filters = {
      examinationSessionId: req.query.examinationSessionId,
      examDate: req.query.examDate,
      examinationSessionSlotId: req.query.examinationSessionSlotId,
      search: req.query.search,
    };
    
    const limit = parseInt(req.query.limit, 10) || 10;
    const page = parseInt(req.query.page, 10) || 1;
    
    const result = await service.getReadyBundleList(filters, { limit, page });
    
    return SuccessResponse(res, 200, "Ready bundles fetched successfully", result.rows, {
      total: result.count,
      page,
      limit,
    });
  } catch (error) {
    console.error(error);
    return ErrorResponse(res, 500, error.message);
  }
};

export const getReceivedRooms = async (req, res) => {
  try {
    const filters = {
      examinationSessionId: Number(req.query.examinationSessionId),
      examDate: req.query.examDate,
      examinationSessionSlotId: req.query.examinationSessionSlotId ? Number(req.query.examinationSessionSlotId) : undefined,
      search: req.query.search,
    };
    const limit = parseInt(req.query.limit, 10) || 10;
    const page = parseInt(req.query.page, 10) || 1;

    const result = await service.getReceivedRooms(filters, { limit, page });
    return SuccessResponse(
      res,
      200,
      "Received rooms details fetched successfully",
      result.rows,
      {
        total: result.count,
        page,
        limit,
      }
    );
  } catch (error) {
    console.error(error);
    return ErrorResponse(res, 500, error.message);
  }
};
