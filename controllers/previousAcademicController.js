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

export const getTermStudents = async (req, res) => {
  try {
    const data = await previousAcademicService.getTermStudents(
      req.params.curriculumBatchTermMappingId,
      req.query.sessionId,
    );
    return SuccessResponse(res, 200, 'Term students retrieved successfully', data);
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || 'Internal Server Error',
    );
  }
};

export const downloadTermMarksTemplate = async (req, res) => {
  try {
    const data = await previousAcademicService.getTermStudents(
      req.params.curriculumBatchTermMappingId,
      req.query.sessionId,
    );
    return SuccessResponse(res, 200, 'Term marks template retrieved successfully', data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || 'Internal Server Error');
  }
};

export const uploadTermMarks = async (req, res) => {
  try {
    const uploaded = req.files || {};
    const file = uploaded.marks || uploaded.file || uploaded.students || Object.values(uploaded)[0];
    const data = await previousAcademicService.uploadTermMarks(
      req.params.curriculumBatchTermMappingId,
      file,
      req.query.sessionId,
    );
    return SuccessResponse(res, 200, 'Term marks uploaded successfully', data);
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || 'Internal Server Error',
      error.details || null,
    );
  }
};
