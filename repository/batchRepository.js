import { Op } from 'sequelize';
import * as model from '../models/index.js';
import { scoped } from '../utility/scoped.js';

const SESSION_BATCH_ATTRS = [
  'batchId',
  'sessionId',
  'batch',
  'status',
  'intakeCapacity',
  'createdAt',
  'createdBy',
];

const SESSION_ATTRS = ['sessionId', 'sessionName'];
const COURSE_ATTRS = [
  'courseId',
  'courseName',
  'courseCode',
  'courseDuration',
  'totalTerms',
  'termType',
];

function sessionInclude() {
  return {
    model: model.sessionModel,
    as: 'session',
    attributes: SESSION_ATTRS,
    required: true,
    include: [
      {
        model: model.courseModel,
        as: 'course',
        attributes: COURSE_ATTRS,
        required: true,
      },
    ],
  };
}

/**
 * List all sessions (grouped) with their published/draft batches.
 * @param {object} filters - { sessionId?, status?, courseId? }
 */
export async function findAll(filters = {}) {
  const sessionWhere = {};
  if (filters.sessionId) sessionWhere.sessionId = Number(filters.sessionId);
  if (filters.courseId) sessionWhere.courseId = Number(filters.courseId);

  const batchWhere = {};
  if (filters.status) batchWhere.status = filters.status;

  return model.sessionModel.findAll({
    where: sessionWhere,
    attributes: SESSION_ATTRS,
    include: [
      {
        model: model.courseModel,
        as: 'course',
        attributes: COURSE_ATTRS,
        required: true,
      },
      {
        model: model.batchModel,
        as: 'batches',
        attributes: SESSION_BATCH_ATTRS,
        where: Object.keys(batchWhere).length ? batchWhere : undefined,
        required: false, // Return sessions even if they have 0 batches
      },
    ],
    order: [
      ['createdAt', 'DESC'],
      [{ model: model.batchModel, as: 'batches' }, 'batch', 'ASC'],
    ],
  });
}

/**
 * Find a single batch by PK, including session + course info.
 */
export async function findById(id) {
  return model.batchModel.findByPk(Number(id), {
    attributes: SESSION_BATCH_ATTRS,
    include: [sessionInclude()],
  });
}

/**
 * Create a new batch (starts in draft status).
 */
export async function create(data, options = {}) {
  return model.batchModel.create(data, options);
}

/**
 * Publish a batch (status: draft → published).
 * Returns [affectedRows].
 */
export async function publish(id, options = {}) {
  return model.batchModel.update(
    { status: 'published' },
    { where: { batchId: Number(id), status: 'draft' }, ...options },
  );
}

/**
 * Update mutable fields of a batch (only allowed in draft state at service level).
 */
export async function update(id, data, options = {}) {
  await model.batchModel.update(data, {
    where: { batchId: Number(id) },
    ...options,
  });
  return findById(id);
}

/**
 * Delete a batch. Callers must have already checked it's safe (no mappings, no sections).
 */
export async function remove(id, options = {}) {
  return model.batchModel.destroy({
    where: { batchId: Number(id) },
    ...options,
  });
}

/**
 * Count curriculum mappings referencing this batch.
 */
export async function countCurriculumMappings(id, options = {}) {
  return model.curriculumBatchMappingModel.count({
    where: { batchId: Number(id) },
    ...options,
  });
}

/**
 * Count class sections that reference this batch.
 */
export async function countClassSections(id, options = {}) {
  return model.classSectionModel.count({
    where: { batchId: Number(id) },
    ...options,
  });
}
