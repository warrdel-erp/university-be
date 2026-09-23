import { SuccessResponse, ErrorResponse } from '../utility/response.js';
import * as batchService from '../services/batchService.js';
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

export const getAllBatches = async (req, res) => {
  try {
    const data = await batchService.getAllBatches(req.query);
    return SuccessResponse(res, 200, 'Batches retrieved successfully', data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || 'Internal Server Error');
  }
};

export const getBatch = async (req, res) => {
  try {
    const data = await batchService.getBatch(req.params.id);
    return SuccessResponse(res, 200, 'Batch retrieved successfully', data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || 'Internal Server Error');
  }
};

export const getBatchFullDetails = async (req, res) => {
  try {
    const batchId = req.params.id ?? req.query.batchId;
    const data = await batchService.getBatchFullDetails(batchId);
    return SuccessResponse(res, 200, 'Batch details retrieved successfully', data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || 'Internal Server Error');
  }
};

export const createBatch = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.dataValues?.userId;
    const data = await batchService.createBatch(req.body, userId);
    return SuccessResponse(res, 201, 'Batch created successfully', data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || 'Internal Server Error');
  }
};

export const publishBatch = async (req, res) => {
  try {
    const data = await batchService.publishBatch(req.params.id);
    return SuccessResponse(res, 200, 'Batch published successfully', data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || 'Internal Server Error');
  }
};

export const updateBatch = async (req, res) => {
  try {
    const data = await batchService.updateBatch(req.params.id, req.body);
    return SuccessResponse(res, 200, 'Batch updated successfully', data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || 'Internal Server Error');
  }
};

export const deleteBatch = async (req, res) => {
  try {
    const data = await batchService.deleteBatch(req.params.id);
    return SuccessResponse(res, 200, 'Batch deleted successfully', data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || 'Internal Server Error');
  }
};
