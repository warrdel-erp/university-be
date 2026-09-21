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

export const getBatches = async (req, res) => {
  try {
    const result = await curriculumService.getBatches(req.params.id);
    return SuccessResponse(res, 200, 'Curriculum batches retrieved', result);
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
      isActive: true,
      publishStatus: req.body.publishStatus || 'draft',
    });
    return SuccessResponse(res, 201, 'Curriculum created successfully', result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || 'Internal Server Error');
  }
};

export const update = async (req, res) => {
  try {
    const result = await curriculumService.update(req.params.id, req.body);
    return SuccessResponse(res, 200, 'Curriculum updated successfully', result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || 'Internal Server Error');
  }
};

export const publish = async (req, res) => {
  try {
    const result = await curriculumService.publish(
      req.params.id,
      req.body.publishStatus,
    );
    return SuccessResponse(res, 200, 'Curriculum publish status updated', result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || 'Internal Server Error');
  }
};

export const remove = async (req, res) => {
  try {
    const result = await curriculumService.remove(req.params.id);
    return SuccessResponse(res, 200, 'Curriculum deleted successfully', result);
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

export const unmapSubject = async (req, res) => {
  try {
    const result = await curriculumService.unmapSubject(
      req.params.curriculumSubjectTermMappingId,
    );
    return SuccessResponse(res, 200, 'Subject unmapped successfully', result);
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

export const unmapBatch = async (req, res) => {
  try {
    const result = await curriculumService.unmapBatch(
      req.params.curriculumBatchMappingId,
    );
    return SuccessResponse(res, 200, 'Batch unmapped successfully', result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || 'Internal Server Error');
  }
};

export const updateSubjectTermMapping = async (req, res) => {
  try {
    const { curriculumSubjectTermMappingId } = req.params;
    const result = await curriculumService.updateSubjectTermMapping(
      Number(curriculumSubjectTermMappingId),
      req.body,
    );
    return SuccessResponse(res, 200, 'Subject mapping updated successfully', result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || 'Internal Server Error');
  }
};
