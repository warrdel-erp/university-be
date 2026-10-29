import * as electivePoolService from "../services/electivePoolServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function addElectivePool(req, res) {
  try {
    const result = await electivePoolService.addElectivePool(req.body);
    return SuccessResponse(res, 201, "Elective pool created successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getAllElectivePools(req, res) {
  try {
    const result = await electivePoolService.getAllElectivePools(req.query);
    return SuccessResponse(
      res,
      200,
      "Elective pools fetched successfully",
      result.rows,
      result.paginationData
    );
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getElectivePoolById(req, res) {
  try {
    const id = req.params.id || req.query.id || req.query.electivePoolId;
    if (!id) {
      return ErrorResponse(res, 400, "id is required");
    }
    const result = await electivePoolService.getElectivePoolById(id);
    return SuccessResponse(res, 200, "Elective pool fetched successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function updateElectivePool(req, res) {
  try {
    const id = req.params.id || req.body.id || req.body.electivePoolId;
    if (!id) {
      return ErrorResponse(res, 400, "id is required");
    }
    const result = await electivePoolService.updateElectivePool(id, req.body);
    return SuccessResponse(res, 200, "Elective pool updated successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function toggleStatusElectivePool(req, res) {
  try {
    const id = req.params.id || req.body.id || req.body.electivePoolId;
    if (!id) {
      return ErrorResponse(res, 400, "id is required");
    }
    const result = await electivePoolService.toggleStatusElectivePool(id);
    return SuccessResponse(res, 200, "Elective pool status toggled successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function deleteElectivePool(req, res) {
  try {
    const id = req.params.id || req.query.id || req.query.electivePoolId;
    if (!id) {
      return ErrorResponse(res, 400, "id is required");
    }
    await electivePoolService.deleteElectivePool(id);
    return SuccessResponse(res, 200, "Elective pool deleted successfully");
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

