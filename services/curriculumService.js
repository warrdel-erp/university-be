import { Op } from 'sequelize';
import sequelize from '../database/sequelizeConfig.js';
import * as curriculumRepository from '../repository/curriculumRepository.js';
import * as models from '../models/index.js';
import { scoped } from '../utility/scoped.js';

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

export async function getAll(filters) {
  return curriculumRepository.findAll(filters);
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
        id: mapping.subject?.subjectId || mapping.curriculumSubjectTermMappingId,
        curriculumSubjectTermMappingId: mapping.curriculumSubjectTermMappingId,
        code: mapping.subject?.subjectCode || 'N/A',
        name: mapping.subject?.subjectName || 'Unknown Subject',
        type: mapping.subject?.subjectType || 'Theory',
        category: mapping.subject?.subjectCategory || 'Core',
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

  const batchMappings =
    await curriculumRepository.findBatchMappingsByCurriculumId(curriculumId);

  const result = [];
  for (const mapping of batchMappings) {
    const studentCount = await curriculumRepository.countStudentsForCourseBatch(
      curriculum.courseId,
      mapping.batch,
    );
    result.push({
      ...mapping.toJSON(),
      studentCount,
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

export async function getAvailableSubjects(curriculumId) {
  const curriculum = await curriculumRepository.findById(curriculumId);
  if (!curriculum) {
    httpError('Curriculum not found', 404);
  }

  const mappedRows = await models.curriculumSubjectTermMappingModel.findAll({
    where: { curriculumId },
    attributes: ['subjectId'],
  });
  const mappedSubjectIds = mappedRows.map((r) => r.subjectId);

  const where = { courseId: curriculum.courseId, isActive: true };
  if (mappedSubjectIds.length > 0) {
    where.subjectId = { [Op.notIn]: mappedSubjectIds };
  }

  return scoped(models.subjectModel).findAll({
    where,
    order: [['subjectCode', 'ASC']],
    attributes: [
      'subjectId',
      'subjectCode',
      'subjectName',
      'subjectType',
      'subjectCategory',
    ],
  });
}

export async function mapSubjects(curriculumId, subjects) {
  const curriculum = await curriculumRepository.findById(curriculumId);
  if (!curriculum) {
    httpError('Curriculum not found', 404);
  }
  assertDraft(curriculum, 'map subjects to');

  if (!subjects?.length) {
    httpError('At least one subject is required', 400);
  }

  const subjectIds = subjects.map((s) => s.subjectId);
  if (new Set(subjectIds).size !== subjectIds.length) {
    httpError('Duplicate subjects are not allowed in the same request', 400);
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

  const existingMappings = await models.curriculumSubjectTermMappingModel.findAll({
    where: { curriculumId, subjectId: { [Op.in]: subjectIds } },
    attributes: ['subjectId'],
  });
  if (existingMappings.length > 0) {
    httpError('One or more subjects are already mapped to this curriculum', 409);
  }

  const subjectRecords = await scoped(models.subjectModel).findAll({
    where: { subjectId: { [Op.in]: subjectIds } },
    attributes: ['subjectId', 'subjectCode', 'courseId'],
  });

  if (subjectRecords.length !== subjectIds.length) {
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

  const mappings = subjects.map((s) => ({
    curriculumId,
    subjectId: s.subjectId,
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
  assertDraft(curriculum, 'update subject mappings on');

  if (data.term !== undefined && curriculum.course?.totalTerms) {
    if (data.term > curriculum.course.totalTerms) {
      httpError(
        `Term ${data.term} exceeds programme total terms (${curriculum.course.totalTerms})`,
        400,
      );
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
  assertDraft(curriculum, 'unmap subjects from');

  await curriculumRepository.deleteSubjectTermMapping(
    curriculumSubjectTermMappingId,
  );

  return {
    curriculumSubjectTermMappingId: Number(curriculumSubjectTermMappingId),
    curriculumId: mapping.curriculumId,
    deleted: true,
  };
}

export async function mapBatch(curriculumId, batch, userId) {
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

  if (!batch) {
    httpError('Batch is required', 400);
  }

  const siblingCurriculums = await scoped(models.curriculumModel).findAll({
    where: { courseId: curriculum.courseId },
    attributes: ['curriculumId', 'name'],
  });
  const siblingCurriculumIds = siblingCurriculums.map((c) => c.curriculumId);

  const existingMapping = await models.curriculumBatchMappingModel.findOne({
    where: {
      batch,
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
      `Curriculum '${mappedName}' is already mapped to batch ${batch} for this programme. Only one curriculum per programme can be mapped to a batch.`,
      409,
    );
  }

  return models.curriculumBatchMappingModel.create({
    curriculumId,
    batch,
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

  const studentCount = await curriculumRepository.countStudentsForCourseBatch(
    curriculum.courseId,
    mapping.batch,
  );
  if (studentCount > 0) {
    httpError(
      `Cannot unmap batch ${mapping.batch}: ${studentCount} student(s) are enrolled for this programme batch`,
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
      batch: mapping.batch,
      deleted: true,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
