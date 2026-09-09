import * as curriculumService from '../services/curriculumService.js';
import { SuccessResponse, ErrorResponse } from '../utility/response.js';

export const getAll = async (req, res) => {
  try {
    const result = await curriculumService.getAll(req.query);
    return SuccessResponse(res, 200, 'Curriculums retrieved successfully', result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || 'Internal Server Error');
  }
};

export const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await curriculumService.getById(id);
    if (!result) return ErrorResponse(res, 404, 'Curriculum not found');
    return SuccessResponse(res, 200, 'Curriculum details retrieved', result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || 'Internal Server Error');
  }
};

export const create = async (req, res) => {
  try {
    const instituteId = req.instituteId;
    const universityId = req.universityId;

    const result = await curriculumService.create({ 
        ...req.body, 
        instituteId,
        universityId,
        isActive: true
    });
    return SuccessResponse(res, 201, 'Curriculum created successfully', result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || 'Internal Server Error');
  }
};

export const getAvailableSubjects = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await curriculumService.getAvailableSubjects(id);
    return SuccessResponse(res, 200, 'Available subjects retrieved', result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || 'Internal Server Error');
  }
};

export const mapSubjects = async (req, res) => {
    try {
        const { curriculumId } = req.params;
        const result = await curriculumService.mapSubjects(curriculumId, req.body.subjects);
        return SuccessResponse(res, 201, 'Subjects mapped successfully', result);
    } catch (error) {
        return ErrorResponse(res, error.statusCode || 500, error.message || 'Internal Server Error');
    }
};

export const mapBatch = async (req, res) => {
    try {
        const { curriculumId } = req.params;
        const batch = req.body.batch ?? req.body.batchId;
        const userId = req.user?.userId || req.user?.dataValues?.userId;
        const result = await curriculumService.mapBatch(curriculumId, batch, userId);
        return SuccessResponse(res, 201, 'Batch mapped successfully', result);
    } catch (error) {
        return ErrorResponse(res, error.statusCode || 500, error.message || 'Internal Server Error');
    }
};
