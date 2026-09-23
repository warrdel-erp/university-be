import { Op } from 'sequelize';
import * as model from '../models/index.js';
import { buildScope, scoped } from '../utility/scoped.js';

const SESSION_BATCH_ATTRS = [
  'batchId',
  'sessionId',
  'batch',
  'status',
  'intakeCapacity',
  'createdAt',
  'createdBy',
];

const SESSION_ATTRS = ['sessionId', 'sessionName', 'academicYearId', 'courseId'];
const COURSE_ATTRS = [
  'courseId',
  'courseName',
  'courseCode',
  'courseDuration',
  'totalTerms',
  'termType',
  'universityId',
  'instituteId',
  'isActive',
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
        required: false,
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
 * Batch with session, course, curriculum mapping (+ term/subject ids for counts),
 * regulation mappings, and class section year rows.
 */
export async function findFullDetailsById(batchId) {
  return model.batchModel.findByPk(Number(batchId), {
    attributes: SESSION_BATCH_ATTRS,
    include: [
      {
        model: model.sessionModel,
        as: 'session',
        attributes: SESSION_ATTRS,
        required: true,
        where: buildScope(model.sessionModel),
        include: [
          {
            model: model.courseModel,
            as: 'course',
            attributes: COURSE_ATTRS,
            required: true,
            where: buildScope(model.courseModel),
          },
          {
            model: model.academicRegulationCourseMappingModel,
            as: 'regulationCourseMappings',
            attributes: [
              'academicRegulationCourseMappingId',
              'academicRegulationId',
              'courseId',
              'sessionId',
            ],
            required: false,
            where: buildScope(model.academicRegulationCourseMappingModel),
            include: [
              {
                model: model.academicRegulationModel,
                as: 'academicRegulation',
                attributes: [
                  'academicRegulationId',
                  'regulationCode',
                  'regulationName',
                  'status',
                  'isActive',
                ],
                required: true,
              },
            ],
          },
        ],
      },
      {
        model: model.curriculumBatchMappingModel,
        as: 'curriculumMappings',
        attributes: [
          'curriculumBatchMappingId',
          'curriculumId',
          'batchId',
          'createdAt',
          'createdBy',
        ],
        required: false,
        include: [
          {
            model: model.curriculumModel,
            as: 'curriculum',
            attributes: [
              'curriculumId',
              'name',
              'courseId',
              'publishStatus',
              'isActive',
            ],
            required: true,
            where: buildScope(model.curriculumModel),
            include: [
              {
                model: model.curriculumSubjectTermMappingModel,
                as: 'subjectTermMappings',
                attributes: ['curriculumSubjectTermMappingId', 'subjectId', 'term'],
                required: false,
              },
            ],
          },
          {
            model: model.curriculumBatchTermMappingModel,
            as: 'termMappings',
            attributes: [
              'curriculumBatchTermMappingId',
              'term',
              'yearNumber',
              'year',
            ],
            required: false,
          },
        ],
      },
      {
        model: model.classSectionModel,
        as: 'classSections',
        attributes: ['classSectionsId', 'year', 'section', 'activeYear'],
        required: false,
        where: buildScope(model.classSectionModel),
      },
    ],
  });
}

/**
 * Distinct subject + plan counts for assessment plan subject mappings
 * linked to this batch's term mappings, or same course + session.
 */
export async function countAssessmentPlanSubjectMappingsByBatchContext({
  courseId,
  sessionId,
  curriculumBatchTermMappingIds,
}) {
  const orConditions = [];

  if (curriculumBatchTermMappingIds.length > 0) {
    orConditions.push({
      curriculumBatchTermMappingId: { [Op.in]: curriculumBatchTermMappingIds },
    });
  }

  orConditions.push({
    courseId: Number(courseId),
    sessionId: Number(sessionId),
  });

  const rows = await scoped(model.assessmentPlanSubjectMappingModel).findAll({
    where: { [Op.or]: orConditions },
    attributes: ['subjectId', 'assessmentPlanId'],
  });

  const subjectIds = new Set();
  const planIds = new Set();
  for (const row of rows) {
    const plain = row.get({ plain: true });
    subjectIds.add(Number(plain.subjectId));
    planIds.add(Number(plain.assessmentPlanId));
  }

  return {
    mappedSubjectCount: subjectIds.size,
    mappedPlanCount: planIds.size,
  };
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
