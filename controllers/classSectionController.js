import * as classSectionServices from '../services/classSectionServices.js';
import { SuccessResponse, ErrorResponse } from '../utility/response.js';
export const getBatchAcademicProgression = async (req, res) => {
  try {
    const batchId = req.params.id ?? req.query.batchId;
    const result = await classSectionServices.getBatchAcademicProgression(batchId);
    return SuccessResponse(res, 200, 'Batch academic progression fetched successfully', result);
  } catch (error) {
    const statusCode = /not found/i.test(error.message)
      ? 404
      : error.statusCode || 400;
    return ErrorResponse(res, statusCode, error.message || 'Something went wrong');
  }
};

export const getClassSectionBatches = async (req, res) => {
  try {
    const result = await classSectionServices.getClassSectionBatches(req.query);
    return SuccessResponse(res, 200, 'Class section batches retrieved successfully', result);
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return ErrorResponse(res, statusCode, error.message || 'Something went wrong');
  }
};

export const renameClassSection = async (req, res) => {
  try {
    const result = await classSectionServices.updateClassSection(req.body);
    return SuccessResponse(res, 200, 'Class section updated successfully', result);
  } catch (error) {
    const statusCode = /not found/i.test(error.message) ? 404 : 400;
    return ErrorResponse(res, statusCode, error.message || 'Something went wrong');
  }
};

export const deleteClassSectionTerm = async (req, res) => {
  try {
    const { classSectionId } = req.query;
    const result = await classSectionServices.deleteClassSectionTerm(classSectionId);
    return SuccessResponse(res, 200, 'Class section deleted successfully', result);
  } catch (error) {
    const statusCode = /not found/i.test(error.message) ? 404 : 400;
    const message = error.message || 'Unable to delete class section.';
    return ErrorResponse(res, statusCode, message);
  }
};
