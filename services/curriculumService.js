import { Op } from 'sequelize';
import sequelize from '../database/sequelizeConfig.js';
import * as curriculumRepository from '../repository/curriculumRepository.js';
import * as models from '../models/index.js';
import { scoped, buildScope } from '../utility/scoped.js';
import { resolveBatchCurrentPosition, resolveTotalTerms } from '../utility/courseTerms.js';
import { resolveActiveAcademicYearContext } from '../utility/curriculumSubjectsByActiveYear.js';

function httpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

function assertDraft(curriculum, action) {
  if (curriculum.publishStatus === 'published') {
    httpError(`Cannot ${action} a published curriculum. Unpublish it first.`, 400);
  }
}

function resolveStructureStatus(configuredTerms, totalTerms) {
  if (configuredTerms <= 0) return 'Not Started';
  if (configuredTerms >= totalTerms) return 'Completed';
  return 'In Progress';
}

export async function getAll(filters) {
  const curriculums = await curriculumRepository.findAll(filters);

  for (const curriculum of curriculums) {
    const totalTerms = resolveTotalTerms(curriculum.course);
    const configuredTerms = Number(curriculum.getDataValue('configuredTerms')) || 0;
    curriculum.setDataValue('totalTerms', totalTerms);
    curriculum.setDataValue(
      'structure',
      `${configuredTerms} / ${totalTerms} terms`,
    );
    curriculum.setDataValue(
      'status',
      resolveStructureStatus(configuredTerms, totalTerms),
    );
  }

  return curriculums;
}

/**
 * Overview used by the Curriculum > Batch Configuration tab.
 * Groups by: session (with programme info) → published batches → curriculum mapping.
 *
 * Returns an array of session objects, each with:
 *   { sessionId, sessionName, course, batches: [{ batchId, batch, intakeCapacity,
 *     curriculumId?, curriculumName?, curriculumBatchMappingId?, isConfigured, students, ... }] }
 */
export async function getProgrammeOverview() {
  // Load all published batches with their sessions and any curriculum mappings alongside active AY
  const [batchRows, academicCtx] = await Promise.all([
    models.batchModel.findAll({
      where: { status: 'published' },
      attributes: [
        'batchId',
        'sessionId',
        'batch',
        'intakeCapacity',
      ],
    include: [
      {
        model: models.sessionModel,
        as: 'session',
        required: true,
        attributes: ['sessionId', 'sessionName'],
        where: buildScope(models.sessionModel),
        include: [
          {
            model: models.courseModel,
            as: 'course',
            required: true,
            where: buildScope(models.courseModel),
            attributes: [
              'courseId',
              'courseName',
              'courseCode',
              'courseDuration',
              'totalTerms',
              'termType',
              'capacity',
            ],
          },
        ],
      },
      {
        model: models.curriculumBatchMappingModel,
        as: 'curriculumMappings',
        required: false,
        attributes: ['curriculumBatchMappingId', 'curriculumId'],
        include: [
          {
            model: models.curriculumModel,
            as: 'curriculum',
            required: false,
            attributes: ['curriculumId', 'name', 'publishStatus', 'isActive'],
            where: { isActive: true },
          },
        ],
      },
    ],
    order: [
      [{ model: models.sessionModel, as: 'session' }, 'sessionId', 'ASC'],
      ['batch', 'ASC'],
    ],
  }),
  resolveActiveAcademicYearContext(),
]);

const activeCalendarYear = Number(academicCtx?.activeBatchYear);

  // Collect all curriculum IDs to bulk-fetch configuredTerms
  const curriculumIds = [];
  for (const row of batchRows) {
    for (const cm of row.curriculumMappings || []) {
      if (cm.curriculumId) curriculumIds.push(Number(cm.curriculumId));
    }
  }

  const configuredTermsMap = curriculumIds.length
    ? await curriculumRepository.findConfiguredTermsByCurriculumIds(curriculumIds)
    : new Map();

  // Collect batch IDs to bulk count students via batchId FK
  const batchIds = batchRows.map((r) => Number(r.batchId));
  const studentCountMap = new Map();
  if (batchIds.length) {
    const countRows = await scoped(models.studentModel).findAll({
      attributes: [
        'batchId',
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('student_id'))), 'studentCount'],
      ],
      where: { batchId: { [Op.in]: batchIds } },
      group: ['batchId'],
      raw: true,
    });
    for (const row of countRows) {
      studentCountMap.set(Number(row.batchId), Number(row.studentCount) || 0);
    }
  }

  // Group by session
  const sessionMap = new Map();
  for (const row of batchRows) {
    const plain = row.get({ plain: true });
    const session = plain.session;
    const course = session.course;
    const sid = Number(session.sessionId);
    const totalTerms = resolveTotalTerms(course);

    if (!sessionMap.has(sid)) {
      sessionMap.set(sid, {
        sessionId: sid,
        sessionName: session.sessionName,
        course,
        totalTerms,
        batches: [],
      });
    }

    const sbmId = Number(plain.batchId);
    const students = studentCountMap.get(sbmId) || 0;

    // A batch may have 0 or 1 curriculum mappings (one per programme enforced)
    const curriculumMapping = (plain.curriculumMappings || [])[0] || null;
    const curriculum = curriculumMapping?.curriculum || null;
    const configuredTerms = curriculum
      ? configuredTermsMap.get(Number(curriculum.curriculumId)) || 0
      : 0;
    const structureStatus = resolveStructureStatus(configuredTerms, totalTerms);

    const sessionInfo = sessionMap.get(sid);
    const courseCapacity = sessionInfo?.course?.capacity;

    const position = resolveBatchCurrentPosition({
      batchYear: plain.batch,
      course,
      activeCalendarYear,
    });

    sessionInfo.batches.push({
      batchId: sbmId,
      batch: Number(plain.batch),
      intakeCapacity: plain.intakeCapacity != null ? Number(plain.intakeCapacity) : null,
      capacity: courseCapacity != null && !isNaN(Number(courseCapacity)) ? Number(courseCapacity) : (courseCapacity ?? null),
      students,
      isConfigured: Boolean(curriculum),
      curriculumBatchMappingId: curriculumMapping
        ? Number(curriculumMapping.curriculumBatchMappingId)
        : null,
      curriculumId: curriculum ? Number(curriculum.curriculumId) : null,
      curriculumName: curriculum?.name || null,
      curriculumPublishStatus: curriculum?.publishStatus || null,
      configuredTerms,
      totalTerms,
      structure: `${configuredTerms} / ${totalTerms} terms`,
      status: structureStatus,
      currentYear: position.currentYear,
      currentYearLabel: position.currentYearLabel,
      currentTerms: position.currentTerms,
      currentTermsLabel: position.currentTermsLabel,
      currentPositionLabel: position.currentPositionLabel,
    });
  }

  const sessions = [];
  for (const session of sessionMap.values()) {
    sessions.push(session);
  }
  return sessions;
}


export async function getById(id) {
  const curriculum = await curriculumRepository.findById(id);
  if (!curriculum) return null;

  const mappings =
    await curriculumRepository.findSubjectTermMappingsByCurriculumId(id);

  const course = curriculum.course;
  const totalTerms = course?.totalTerms || 8;

  const terms = [];
  for (let i = 1; i <= totalTerms; i++) {
    const courses = [];
    for (const mapping of mappings) {
      if (mapping.term !== i) continue;
      courses.push({
        id: mapping.subject?.subjectId,
        curriculumSubjectTermMappingId: mapping.curriculumSubjectTermMappingId,
        code: mapping.subject?.subjectCode,
        name: mapping.subject?.subjectName,
        type: mapping.subject?.subjectType,
        category: mapping.subject?.subjectCategory,
        credit: mapping.credit,
        syllabus: 'Configured',
      });
    }

    terms.push({
      id: i,
      term_number: i,
      courses,
    });
  }

  return {
    ...curriculum.toJSON(),
    terms,
  };
}

export async function getBatches(curriculumId) {
  const curriculum = await curriculumRepository.findById(curriculumId);
  if (!curriculum) {
    httpError('Curriculum not found', 404);
  }

  const batchMappings = await curriculumRepository.findBatchMappingsByCurriculumId(curriculumId);

  const result = [];
  for (const mapping of batchMappings) {
    const m = mapping.toJSON();

    // Count students via batchId FK if available, fall back to legacy batchYear
    let studentCount = 0;
    if (m.batchId) {
      studentCount = await models.studentModel.count({
        where: { batchId: m.batchId },
      });
    } else if (m.batch) {
      studentCount = await curriculumRepository.countStudentsForCourseBatch(
        curriculum.courseId,
        m.batch,
      );
    }

    // Include session info if batch association is loaded
    const batch = m.batch || null;

    result.push({
      ...m,
      studentCount,
      batch,
    });
  }

  return {
    curriculumId: Number(curriculumId),
    courseId: curriculum.courseId,
    publishStatus: curriculum.publishStatus,
    batches: result,
  };
}


export async function create(data) {
  const existing = await curriculumRepository.findByNameAndCourse(
    data.name,
    data.courseId,
  );
  if (existing) {
    httpError(
      'Curriculum with this name already exists for the selected programme',
      409,
    );
  }
  return curriculumRepository.create(data);
}

export async function update(curriculumId, data) {
  const curriculum = await curriculumRepository.findById(curriculumId);
  if (!curriculum) {
    httpError('Curriculum not found', 404);
  }

  const updates = {};

  if (data.name !== undefined) {
    if (curriculum.publishStatus === 'published') {
      httpError('Cannot rename a published curriculum. Unpublish it first.', 400);
    }
    const duplicate = await curriculumRepository.findByNameAndCourse(
      data.name,
      curriculum.courseId,
      curriculumId,
    );
    if (duplicate) {
      httpError(
        'Curriculum with this name already exists for the selected programme',
        409,
      );
    }
    updates.name = data.name;
  }

  if (data.isActive !== undefined) {
    updates.isActive = data.isActive;
  }

  if (Object.keys(updates).length === 0) {
    httpError('No valid fields to update', 400);
  }

  await curriculumRepository.update(curriculumId, updates);
  return curriculumRepository.findById(curriculumId);
}

export async function publish(curriculumId, publishStatus) {
  const curriculum = await curriculumRepository.findById(curriculumId);
  if (!curriculum) {
    httpError('Curriculum not found', 404);
  }

  if (curriculum.publishStatus === publishStatus) {
    httpError(`Curriculum is already ${publishStatus}`, 400);
  }

  if (publishStatus === 'published') {
    const subjectCount = await curriculumRepository.countSubjectTermMappings(
      curriculumId,
    );
    if (subjectCount === 0) {
      httpError(
        'Cannot publish curriculum without at least one subject mapped',
        400,
      );
    }
  }

  if (publishStatus === 'draft') {
    const batchCount = await curriculumRepository.countBatchMappings(curriculumId);
    if (batchCount > 0) {
      httpError(
        'Cannot unpublish curriculum while batches are mapped. Remove batch mappings first.',
        400,
      );
    }
  }

  await curriculumRepository.update(curriculumId, { publishStatus });
  return curriculumRepository.findById(curriculumId);
}

export async function remove(curriculumId) {
  const curriculum = await curriculumRepository.findById(curriculumId);
  if (!curriculum) {
    httpError('Curriculum not found', 404);
  }

  if (curriculum.publishStatus === 'published') {
    httpError('Cannot delete a published curriculum. Unpublish it first.', 400);
  }

  const batchCount = await curriculumRepository.countBatchMappings(curriculumId);
  if (batchCount > 0) {
    httpError(
      'Cannot delete curriculum while batches are mapped. Remove batch mappings first.',
      400,
    );
  }

  const transaction = await sequelize.transaction();
  try {
    await curriculumRepository.deleteSubjectTermMappingsByCurriculumId(
      curriculumId,
      { transaction },
    );
    await curriculumRepository.remove(curriculumId, { transaction });
    await transaction.commit();
    return { curriculumId: Number(curriculumId), deleted: true };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function getAvailableSubjects(curriculumId, query = {}) {
  const curriculum = await curriculumRepository.findById(curriculumId);
  if (!curriculum) {
    httpError('Curriculum not found', 404);
  }

  const mappedRows = await models.curriculumSubjectTermMappingModel.findAll({
    where: { curriculumId },
    attributes: ['subjectId', 'subjectComponentMappingId', 'term'],
  });

  const mappedScmIds = new Set();
  const scmTermMap = new Map();
  const mappedSubjectIdsWithoutComponent = new Set();

  for (const r of mappedRows) {
    if (r.subjectComponentMappingId) {
      mappedScmIds.add(r.subjectComponentMappingId);
      scmTermMap.set(r.subjectComponentMappingId, r.term);
    } else {
      mappedSubjectIdsWithoutComponent.add(r.subjectId);
    }
  }

  const where = { courseId: curriculum.courseId, isActive: true };
  if (query.search) {
    const s = `%${query.search.trim()}%`;
    where[Op.or] = [
      { subjectCode: { [Op.like]: s } },
      { subjectName: { [Op.like]: s } },
    ];
  }

  const subjects = await scoped(models.subjectModel).findAll({
    where,
    order: [['subjectCode', 'ASC']],
    attributes: [
      'subjectId',
      'subjectCode',
      'subjectName',
      'subjectType',
      'subjectCategory',
    ],
    include: [
      {
        model: models.subjectComponentMappingModel,
        as: 'subjectComponentMappings',
        attributes: ['id', 'subjectId', 'subjectComponentId'],
        include: [
          {
            model: models.subjectComponentModel,
            as: 'component',
            attributes: ['id', 'componentName', 'code'],
          },
        ],
        required: false,
      },
    ],
  });

  return subjects.map((subj) => {
    const json = subj.toJSON();
    const mappings = Array.isArray(json.subjectComponentMappings)
      ? json.subjectComponentMappings
      : [];

    const components = mappings.map((m) => {
      const isMapped = mappedScmIds.has(m.id);
      return {
        subjectComponentMappingId: m.id,
        componentId: m.component ? m.component.id : m.subjectComponentId,
        componentName: m.component ? m.component.componentName : null,
        code: m.component ? m.component.code : null,
        isMapped,
        mappedTerm: isMapped ? scmTermMap.get(m.id) : null,
      };
    });

    const isSubjectMappedWithoutComponent = mappedSubjectIdsWithoutComponent.has(json.subjectId);
    const hasUnmappedComponent = components.length > 0
      ? components.some((c) => !c.isMapped)
      : !isSubjectMappedWithoutComponent;

    delete json.subjectComponentMappings;

    return {
      ...json,
      isMapped: components.length > 0 ? !hasUnmappedComponent : isSubjectMappedWithoutComponent,
      hasAvailableComponents: hasUnmappedComponent,
      components,
    };
  });
}

export async function mapSubjects(curriculumId, subjects) {
  const curriculum = await curriculumRepository.findById(curriculumId);
  if (!curriculum) {
    httpError('Curriculum not found', 404);
  }

  if (!subjects?.length) {
    httpError('At least one subject is required', 400);
  }

  // Duplicate check: Allow same subjectId if subjectComponentMappingId is different
  const requestKeys = subjects.map(
    (s) => `${s.subjectId}_${s.subjectComponentMappingId ?? 'none'}`
  );
  if (new Set(requestKeys).size !== requestKeys.length) {
    httpError('Duplicate subject component mappings are not allowed in the same request', 400);
  }

  const terms = subjects.map((s) => s.term ?? s.termNumber);
  if (terms.some((t) => t == null || t < 1)) {
    httpError('Valid term is required for each subject', 400);
  }

  const totalTerms = curriculum.course?.totalTerms;
  if (totalTerms) {
    for (const term of terms) {
      if (term > totalTerms) {
        httpError(
          `Term ${term} exceeds programme total terms (${totalTerms})`,
          400,
        );
      }
    }
  }

  // Check if any subject + component mapping is already mapped to this curriculum
  const existingConditions = subjects.map((s) => ({
    subjectId: s.subjectId,
    subjectComponentMappingId: s.subjectComponentMappingId ?? null,
  }));

  const existingMappings = await models.curriculumSubjectTermMappingModel.findAll({
    where: {
      curriculumId,
      [Op.or]: existingConditions,
    },
    attributes: ['subjectId', 'subjectComponentMappingId'],
  });
  if (existingMappings.length > 0) {
    httpError('One or more subject component mappings are already mapped to this curriculum', 409);
  }

  const uniqueSubjectIds = [...new Set(subjects.map((s) => s.subjectId))];
  const subjectRecords = await scoped(models.subjectModel).findAll({
    where: { subjectId: { [Op.in]: uniqueSubjectIds } },
    attributes: ['subjectId', 'subjectCode', 'courseId'],
  });

  if (subjectRecords.length !== uniqueSubjectIds.length) {
    httpError('One or more subjects were not found', 404);
  }

  const invalidSubjects = subjectRecords.filter(
    (s) => s.courseId !== curriculum.courseId,
  );
  if (invalidSubjects.length > 0) {
    const codes = invalidSubjects.map((s) => s.subjectCode).join(', ');
    httpError(
      `Subjects must belong to the curriculum programme. Invalid: ${codes}`,
      400,
    );
  }

  // Validate subjectComponentMappingId belongs to subjectId
  const scmIds = subjects
    .map((s) => s.subjectComponentMappingId)
    .filter((id) => id != null);

  if (scmIds.length > 0) {
    const scmMappings = await models.subjectComponentMappingModel.findAll({
      where: { id: { [Op.in]: scmIds } },
      attributes: ['id', 'subjectId'],
    });
    const scmMap = new Map(scmMappings.map((m) => [m.id, m.subjectId]));

    for (const s of subjects) {
      if (s.subjectComponentMappingId != null) {
        if (!scmMap.has(s.subjectComponentMappingId)) {
          httpError(`Subject component mapping id ${s.subjectComponentMappingId} not found`, 404);
        }
        if (scmMap.get(s.subjectComponentMappingId) !== s.subjectId) {
          httpError(
            `Subject component mapping id ${s.subjectComponentMappingId} does not belong to subject ${s.subjectId}`,
            400,
          );
        }
      }
    }
  }

  // Validate curriculumCategoryId exists if provided
  const categoryIds = subjects
    .map((s) => s.curriculumCategoryId)
    .filter((id) => id != null);

  if (categoryIds.length > 0) {
    const categories = await models.curriculumCategoryModel.findAll({
      where: { id: { [Op.in]: categoryIds } },
      attributes: ['id'],
    });
    const catSet = new Set(categories.map((c) => c.id));
    for (const s of subjects) {
      if (s.curriculumCategoryId != null && !catSet.has(s.curriculumCategoryId)) {
        httpError(`Curriculum category with id ${s.curriculumCategoryId} not found`, 404);
      }
    }
  }

  const mappings = subjects.map((s) => ({
    curriculumId,
    subjectId: s.subjectId,
    subjectComponentMappingId: s.subjectComponentMappingId ?? null,
    curriculumCategoryId: s.curriculumCategoryId ?? null,
    term: s.term ?? s.termNumber,
    credit: s.credit,
  }));

  return models.curriculumSubjectTermMappingModel.bulkCreate(mappings);
}

export async function updateSubjectTermMapping(
  curriculumSubjectTermMappingId,
  data,
) {
  const mapping = await curriculumRepository.findSubjectTermMappingById(
    curriculumSubjectTermMappingId,
  );
  if (!mapping) {
    httpError('Curriculum subject mapping not found', 404);
  }

  const curriculum = await curriculumRepository.findById(mapping.curriculumId);
  if (!curriculum) {
    httpError('Curriculum not found', 404);
  }

  if (data.term !== undefined && curriculum.course?.totalTerms) {
    if (data.term > curriculum.course.totalTerms) {
      httpError(
        `Term ${data.term} exceeds programme total terms (${curriculum.course.totalTerms})`,
        400,
      );
    }
  }

  if (data.subjectComponentMappingId !== undefined && data.subjectComponentMappingId !== null) {
    const scm = await models.subjectComponentMappingModel.findByPk(data.subjectComponentMappingId);
    if (!scm) {
      httpError(`Subject component mapping id ${data.subjectComponentMappingId} not found`, 404);
    }
    if (scm.subjectId !== mapping.subjectId) {
      httpError(
        `Subject component mapping id ${data.subjectComponentMappingId} does not belong to subject ${mapping.subjectId}`,
        400,
      );
    }
  }

  if (data.curriculumCategoryId !== undefined && data.curriculumCategoryId !== null) {
    const cat = await models.curriculumCategoryModel.findByPk(data.curriculumCategoryId);
    if (!cat) {
      httpError(`Curriculum category with id ${data.curriculumCategoryId} not found`, 404);
    }
  }

  return curriculumRepository.updateSubjectTermMapping(
    curriculumSubjectTermMappingId,
    data,
  );
}

export async function unmapSubject(curriculumSubjectTermMappingId) {
  const mapping = await curriculumRepository.findSubjectTermMappingById(
    curriculumSubjectTermMappingId,
  );
  if (!mapping) {
    httpError('Curriculum subject mapping not found', 404);
  }

  const curriculum = await curriculumRepository.findById(mapping.curriculumId);
  if (!curriculum) {
    httpError('Curriculum not found', 404);
  }

  await curriculumRepository.deleteSubjectTermMapping(
    curriculumSubjectTermMappingId,
  );

  return {
    curriculumSubjectTermMappingId: Number(curriculumSubjectTermMappingId),
    curriculumId: mapping.curriculumId,
    deleted: true,
  };
}

/**
 * Map a curriculum to a published batch (batch).
 *
 * @param {number} curriculumId
 * @param {number} batchId - FK to batch
 * @param {number} userId
 */
export async function mapBatch(curriculumId, batchId, userId) {
  const curriculum = await curriculumRepository.findById(curriculumId);
  if (!curriculum) {
    httpError('Curriculum not found', 404);
  }

  if (curriculum.publishStatus !== 'published') {
    httpError('Only published curriculums can be mapped to a batch', 400);
  }

  if (!curriculum.isActive) {
    httpError('Cannot map batch to an inactive curriculum', 400);
  }

  if (!batchId) {
    httpError('batchId is required', 400);
  }

  // Validate the target batch exists and is published
  const batch = await models.batchModel.findByPk(
    Number(batchId),
    {
      attributes: ['batchId', 'batch', 'status'],
      include: [
        {
          model: models.sessionModel,
          as: 'session',
          required: true,
          where: buildScope(models.sessionModel),
          attributes: ['sessionId', 'courseId'],
          include: [
            {
              model: models.courseModel,
              as: 'course',
              required: true,
              where: buildScope(models.courseModel),
              attributes: ['courseId'],
            },
          ],
        },
      ],
    },
  );
  if (!batch) {
    httpError(`Batch (ID ${batchId}) not found`, 404);
  }
  if (batch.status !== 'published') {
    httpError('Only published batches can be mapped to a curriculum', 400);
  }

  // Uniqueness check handled by model beforeCreate hook (validateSingleCurriculumPerBatchAndProgramme)
  // but we also do a quick service-level check for a clearer error message
  const siblingCurriculums = await scoped(models.curriculumModel).findAll({
    where: { courseId: curriculum.courseId },
    attributes: ['curriculumId', 'name'],
  });
  const siblingCurriculumIds = siblingCurriculums.map((c) => c.curriculumId);

  const existingMapping = await models.curriculumBatchMappingModel.findOne({
    where: {
      batchId: Number(batchId),
      curriculumId: { [Op.in]: siblingCurriculumIds },
    },
    include: [
      {
        model: models.curriculumModel,
        as: 'curriculum',
        attributes: ['curriculumId', 'name'],
      },
    ],
  });

  if (existingMapping) {
    const mappedName =
      existingMapping.curriculum?.name || `ID ${existingMapping.curriculumId}`;
    httpError(
      `Curriculum '${mappedName}' is already mapped to this batch for this programme. Only one curriculum per programme can be mapped to a batch.`,
      409,
    );
  }

  return models.curriculumBatchMappingModel.create({
    curriculumId,
    batchId: Number(batchId),
    createdBy: userId,
  });
}

export async function unmapBatch(curriculumBatchMappingId) {
  const mapping = await curriculumRepository.findBatchMappingById(
    curriculumBatchMappingId,
  );
  if (!mapping) {
    httpError('Batch mapping not found', 404);
  }

  const curriculum = await curriculumRepository.findById(mapping.curriculumId);
  if (!curriculum) {
    httpError('Curriculum not found', 404);
  }

  // Count students — use batchId FK if available, fall back to legacy batchYear
  let studentCount = 0;
  if (mapping.batchId) {
    studentCount = await models.studentModel.count({
      where: { batchId: mapping.batchId },
    });
  } else if (mapping.batch) {
    studentCount = await curriculumRepository.countStudentsForCourseBatch(
      curriculum.courseId,
      mapping.batch,
    );
  }

  if (studentCount > 0) {
    httpError(
      `Cannot unmap this batch: ${studentCount} student(s) are enrolled. Remove student enrollments first.`,
      400,
    );
  }

  const transaction = await sequelize.transaction();
  try {
    await curriculumRepository.deleteBatchMapping(curriculumBatchMappingId, {
      transaction,
    });
    await transaction.commit();
    return {
      curriculumBatchMappingId: Number(curriculumBatchMappingId),
      curriculumId: mapping.curriculumId,
      batchId: mapping.batchId,
      deleted: true,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

