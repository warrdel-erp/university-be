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
      selections: req.query.selections,
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
      Number(examinationSessionSlotId),
    );
    return SuccessResponse(res, 200, "Bundle room details fetched successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message);
  }
};

export const createBundle = async (req, res) => {
  try {
    const result = await service.createBundle(req.body, req.user);
    return SuccessResponse(res, 201, "Bundle created successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message);
  }
};

export const createBundleAuto = async (req, res) => {
  try {
    const result = await service.createBundleAuto(req.body, req.user);
    return SuccessResponse(
      res,
      201,
      "Bundle created with default items successfully",
      result,
    );
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message);
  }
};

export const updateBundleItems = async (req, res) => {
  try {
    const result = await service.updateBundleItems(
      req.params.examRoomMaterialBundleId,
      req.body,
      req.user,
    );
    return SuccessResponse(res, 200, "Bundle items updated successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message);
  }
};

export const getBundleSummary = async (req, res) => {
  try {
    const result = await service.getBundleSummary(
      Number(req.query.examinationSessionId),
    );
    return SuccessResponse(res, 200, "Bundle summary fetched successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message);
  }
};

export const updateBundleStatus = async (req, res) => {
  try {
    const result = await service.updateBundleStatus(
      req.params.examRoomMaterialBundleId,
      req.body.status,
      req.user,
    );
    return SuccessResponse(res, 200, "Bundle status updated successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message);
  }
};

export const getReadyBundleList = async (req, res) => {
  try {
    const filters = {
      examinationSessionId: req.query.examinationSessionId,
      examDate: req.query.examDate,
      examinationSessionSlotId: req.query.examinationSessionSlotId,
      search: req.query.search,
      selections: req.query.selections,
    };
    const limit = parseInt(req.query.limit, 10) || 10;
    const page = parseInt(req.query.page, 10) || 1;

    const result = await service.getReadyBundleList(filters, { limit, page });
    return SuccessResponse(
      res,
      200,
      "Ready bundles fetched successfully",
      result.rows,
      {
        total: result.count,
        page,
        limit,
      },
    );
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
      examinationSessionSlotId: req.query.examinationSessionSlotId
        ? Number(req.query.examinationSessionSlotId)
        : undefined,
      search: req.query.search,
      selections: req.query.selections,
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
      },
    );
  } catch (error) {
    console.error(error);
    return ErrorResponse(res, 500, error.message);
  }
};
