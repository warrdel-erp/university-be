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

export const getBundleById = async (req, res) => {
  try {
    const result = await service.getBundleById(req.params.examRoomMaterialBundleId);
    return SuccessResponse(res, 200, "Bundle details fetched successfully", result);
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
    const result = await service.updateBundleItems(req.params.examRoomMaterialBundleId, req.body.items, user);
    return SuccessResponse(res, 200, "Bundle items updated successfully", result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return ErrorResponse(res, statusCode, error.message);
  }
};

export const markReady = async (req, res) => {
  try {
    const user = req.user;
    const result = await service.markReady(req.params.examRoomMaterialBundleId, user);
    return SuccessResponse(res, 200, "Bundle marked as ready successfully", result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return ErrorResponse(res, statusCode, error.message);
  }
};

export const reopenBundle = async (req, res) => {
  try {
    const user = req.user;
    const result = await service.reopenBundle(req.params.examRoomMaterialBundleId, user);
    return SuccessResponse(res, 200, "Bundle reopened successfully", result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return ErrorResponse(res, statusCode, error.message);
  }
};

export const updateBundleStatus = async (req, res) => {
  try {
    const user = req.user;
    const result = await service.updateBundleStatus(req.params.examRoomMaterialBundleId, req.body, user);
    return SuccessResponse(res, 200, "Bundle status updated successfully", result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return ErrorResponse(res, statusCode, error.message);
  }
};

export const bulkPrepare = async (req, res) => {
  try {
    const user = req.user;
    const { roomCapacityIds, defaultItems } = req.body;
    const result = await service.bulkPrepare(roomCapacityIds, defaultItems, user);
    return SuccessResponse(res, 201, "Bulk prepare executed successfully", result);
  } catch (error) {
    console.error(error);
    return ErrorResponse(res, 500, error.message);
  }
};

export const getBundleCoverData = async (req, res) => {
  try {
    const result = await service.getBundleCoverData(req.params.examRoomMaterialBundleId);
    return SuccessResponse(res, 200, "Bundle cover data fetched successfully", result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return ErrorResponse(res, statusCode, error.message);
  }
};
