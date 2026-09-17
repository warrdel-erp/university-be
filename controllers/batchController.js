import { SuccessResponse, ErrorResponse } from '../utility/response.js';
import * as curriculumService from '../services/curriculumService.js';

export const getBatches = async (req, res) => {
  try {
    const data = await curriculumService.getProgrammeOverview();
    return SuccessResponse(res, 200, 'Batches retrieved successfully', data);
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || 'Internal Server Error',
    );
  }
};
