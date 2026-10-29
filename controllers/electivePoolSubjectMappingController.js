import * as mappingService from "../services/electivePoolSubjectMappingServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function getAvailableSubjects(req, res) {
  try {
    const result = await mappingService.getAvailableSubjects(req.query);
    return SuccessResponse(
      res,
      200,
      "Available courses fetched successfully",
      result.rows,
      result.paginationData
    );
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function mapSubjectsToPool(req, res) {
  try {
    const result = await mappingService.mapSubjectsToPool(req.body);
    return SuccessResponse(res, 200, "Courses added to elective pool successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function unmapSubjectFromPool(req, res) {
  try {
    const body = {
      electivePoolId: req.body.electivePoolId || req.query.electivePoolId || req.params.poolId,
      subjectId: req.body.subjectId || req.query.subjectId || req.params.subjectId,
    };
    const result = await mappingService.unmapSubjectFromPool(body);
    return SuccessResponse(res, 200, "Course removed from elective pool successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getMappedSubjectsForPool(req, res) {
  try {
    const poolId = req.params.poolId || req.query.poolId || req.query.electivePoolId;
    if (!poolId) {
      return ErrorResponse(res, 400, "poolId is required");
    }
    const result = await mappingService.getMappedSubjectsForPool(poolId);
    return SuccessResponse(res, 200, "Mapped courses fetched successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

