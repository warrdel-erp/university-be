import { SuccessResponse, ErrorResponse } from '../utility/response.js';
import * as previousAcademicService from '../services/previousAcademicService.js';

export const getPreviousAcademicBatches = async (req, res) => {
  try {
    const data = await previousAcademicService.getPreviousAcademicBatches(req.query);
    return SuccessResponse(res, 200, 'Previous academic batches retrieved successfully', data);
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || 'Internal Server Error',
    );
  }
};

export const getSingleBatchDetails = async (req, res) => {
  try {
    const data = await previousAcademicService.getSingleBatchDetails(
      req.params.curriculumBatchMappingId,
      req.query.sessionId,
    );
    return SuccessResponse(res, 200, 'Single batch details retrieved successfully', data);
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || 'Internal Server Error',
    );
  }
};
