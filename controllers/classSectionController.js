import * as classSectionServices from '../services/classSectionServices.js';
import { SuccessResponse, ErrorResponse } from "../utility/response.js";
 

export const deleteClassSectionTerm = async (req, res) => {
  try {
    const { classSectionId } = req.query;
    const result = await classSectionServices.deleteClassSectionTerm(classSectionId);
    return SuccessResponse(res, 200, "Class section deleted successfully", result);
  } catch (error) {
    const statusCode = /not found/i.test(error.message) ? 404 : 400;
    return ErrorResponse(res, statusCode, error.message || 'Something went wrong');
  }
};
