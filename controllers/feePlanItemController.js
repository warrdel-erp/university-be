import { SuccessResponse, ErrorResponse } from '../utility/response.js';
import * as feePlanItemServices from '../services/feePlanItemServices.js';

export const getFeePlanBatches = async (req, res) => {
  try {
    const data = await feePlanItemServices.getFeePlanBatches(req.query);
    return SuccessResponse(res, 200, 'Fee plan batches retrieved successfully', data);
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || 'Internal Server Error',
    );
  }
};

export const getBatchFeePlanOverview = async (req, res) => {
  try {
    const data = await feePlanItemServices.getBatchFeePlanOverview(req.query.batchId);
    return SuccessResponse(res, 200, 'Batch fee plan overview retrieved successfully', data);
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || 'Internal Server Error',
    );
  }
};

export const getBatchFeePlanYear = async (req, res) => {
  try {
    const data = await feePlanItemServices.getBatchFeePlanYear(
      req.query.batchId,
      req.query.year,
    );
    return SuccessResponse(res, 200, 'Batch fee plan year retrieved successfully', data);
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || 'Internal Server Error',
    );
  }
};

export const getBatchBillingDetails = async (req, res) => {
  try {
    const data = await feePlanItemServices.getBatchBillingDetails(
      req.query.batchId,
      req.query.year,
    );
    return SuccessResponse(res, 200, 'Batch billing details retrieved successfully', data);
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || 'Internal Server Error',
    );
  }
};

export const createFeePlanItem = async (req, res) => {
  try {
    const data = await feePlanItemServices.createFeePlanItemWithSubItems(req.body);
    return SuccessResponse(res, 201, 'Fee plan item created successfully', data);
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || 'Internal Server Error',
    );
  }
};

export const updateFeePlanItem = async (req, res) => {
  try {
    const data = await feePlanItemServices.updateFeePlanItem(req.body);
    return SuccessResponse(res, 200, 'Fee plan item updated successfully', data);
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || 'Internal Server Error',
    );
  }
};

export const deleteFeePlanItem = async (req, res) => {
  try {
    const data = await feePlanItemServices.deleteFeePlanItem(req.query.feePlanItemId);
    return SuccessResponse(res, 200, 'Fee plan item deleted successfully', data);
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || 'Internal Server Error',
    );
  }
};

export const addFeePlanSubItem = async (req, res) => {
  try {
    const data = await feePlanItemServices.addFeePlanSubItem(req.body);
    return SuccessResponse(res, 201, 'Fee plan sub-item added successfully', data);
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || 'Internal Server Error',
    );
  }
};

export const deleteFeePlanSubItem = async (req, res) => {
  try {
    const data = await feePlanItemServices.deleteFeePlanSubItem(req.query.feePlanSubitemId);
    return SuccessResponse(res, 200, 'Fee plan sub-item deleted successfully', data);
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || 'Internal Server Error',
    );
  }
};

export const publishBatchFeePlanYear = async (req, res) => {
  try {
    const data = await feePlanItemServices.publishBatchFeePlanYear(req.body);
    return SuccessResponse(res, 200, 'Fee plan year published successfully', data);
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || 'Internal Server Error',
    );
  }
};

export const unpublishBatchFeePlanYear = async (req, res) => {
  try {
    const data = await feePlanItemServices.unpublishBatchFeePlanYear(req.body);
    return SuccessResponse(res, 200, 'Fee plan year unpublished successfully', data);
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || 'Internal Server Error',
    );
  }
};

export const getFeePlanPublishHistory = async (req, res) => {
  try {
    const data = await feePlanItemServices.getFeePlanPublishHistory(req.query);
    return SuccessResponse(res, 200, 'Fee plan publish history retrieved successfully', data);
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || 'Internal Server Error',
    );
  }
};

export const getFeePlanPublishHistoryById = async (req, res) => {
  try {
    const data = await feePlanItemServices.getFeePlanPublishHistoryById(
      req.query.feePlanPublishHistoryId,
    );
    return SuccessResponse(
      res,
      200,
      'Fee plan publish history detail retrieved successfully',
      data,
    );
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || 'Internal Server Error',
    );
  }
};
