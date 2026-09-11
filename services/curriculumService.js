import { Op } from 'sequelize';
import * as curriculumRepository from '../repository/curriculumRepository.js';
import * as models from '../models/index.js';
import { scoped } from '../utility/scoped.js';

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

export async function create(data) {
  const existing = await curriculumRepository.findByNameAndCourse(data.name, data.courseId);
  if (existing) { 
      const e = new Error('Curriculum with this name already exists for the selected programme'); 
      e.statusCode = 409; 
      throw e; 
  }
  return curriculumRepository.create(data);
}

export async function getAvailableSubjects(curriculumId) {
  const curriculum = await curriculumRepository.findById(curriculumId);
  if (!curriculum) {
    const e = new Error('Curriculum not found');
    e.statusCode = 404;
    throw e;
  }

  const mappedRows = await models.curriculumSubjectTermMappingModel.findAll({
    where: { curriculumId },
    attributes: ['subjectId'],
  });
  const mappedSubjectIds = mappedRows.map(r => r.subjectId);

  const where = { courseId: curriculum.courseId, isActive: true };
  if (mappedSubjectIds.length > 0) {
    where.subjectId = { [Op.notIn]: mappedSubjectIds };
  }

  return scoped(models.subjectModel).findAll({
    where,
    order: [['subjectCode', 'ASC']],
    attributes: ['subjectId', 'subjectCode', 'subjectName', 'subjectType', 'subjectCategory'],
  });
}

export async function mapSubjects(curriculumId, subjects) {
  const curriculum = await curriculumRepository.findById(curriculumId);
  if (!curriculum) {
    const e = new Error('Curriculum not found');
    e.statusCode = 404;
    throw e;
  }

  if (!subjects?.length) {
    const e = new Error('At least one subject is required');
    e.statusCode = 400;
    throw e;
  }

  const subjectIds = subjects.map(s => s.subjectId);
  if (new Set(subjectIds).size !== subjectIds.length) {
    const e = new Error('Duplicate subjects are not allowed in the same request');
    e.statusCode = 400;
    throw e;
  }

  const terms = subjects.map(s => s.term ?? s.termNumber);
  if (terms.some(t => t == null || t < 1)) {
    const e = new Error('Valid term is required for each subject');
    e.statusCode = 400;
    throw e;
  }

  const existingMappings = await models.curriculumSubjectTermMappingModel.findAll({
    where: { curriculumId, subjectId: { [Op.in]: subjectIds } },
    attributes: ['subjectId'],
  });
  if (existingMappings.length > 0) {
    const e = new Error('One or more subjects are already mapped to this curriculum');
    e.statusCode = 409;
    throw e;
  }

  const subjectRecords = await scoped(models.subjectModel).findAll({
    where: { subjectId: { [Op.in]: subjectIds } },
    attributes: ['subjectId', 'subjectCode', 'courseId'],
  });

  if (subjectRecords.length !== subjectIds.length) {
    const e = new Error('One or more subjects were not found');
    e.statusCode = 404;
    throw e;
  }

  const invalidSubjects = subjectRecords.filter(s => s.courseId !== curriculum.courseId);
  if (invalidSubjects.length > 0) {
    const codes = invalidSubjects.map(s => s.subjectCode).join(', ');
    const e = new Error(`Subjects must belong to the curriculum programme. Invalid: ${codes}`);
    e.statusCode = 400;
    throw e;
  }

  const mappings = subjects.map(s => ({
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
    const e = new Error('Curriculum subject mapping not found');
    e.statusCode = 404;
    throw e;
  }

  return curriculumRepository.updateSubjectTermMapping(
    curriculumSubjectTermMappingId,
    data,
  );
}

export async function mapBatch(curriculumId, batch, userId) {
  const curriculum = await curriculumRepository.findById(curriculumId);
  if (!curriculum) {
    const e = new Error('Curriculum not found');
    e.statusCode = 404;
    throw e;
  }

  if (!batch) {
    const e = new Error('Batch is required');
    e.statusCode = 400;
    throw e;
  }

  // Ensure one batch for one programme has only one curriculum mapping
  const siblingCurriculums = await scoped(models.curriculumModel).findAll({
    where: { courseId: curriculum.courseId },
    attributes: ['curriculumId', 'name'],
  });
  const siblingCurriculumIds = siblingCurriculums.map(c => c.curriculumId);

  const existingMapping = await models.curriculumBatchMappingModel.findOne({
    where: {
      batch,
      curriculumId: { [Op.in]: siblingCurriculumIds },
    },
    include: [{
      model: models.curriculumModel,
      as: 'curriculum',
      attributes: ['curriculumId', 'name'],
    }],
  });

  if (existingMapping) {
    const mappedName = existingMapping.curriculum?.name || `ID ${existingMapping.curriculumId}`;
    const e = new Error(
      `Curriculum '${mappedName}' is already mapped to batch ${batch} for this programme. Only one curriculum per programme can be mapped to a batch.`
    );
    e.statusCode = 409;
    throw e;
  }

  return models.curriculumBatchMappingModel.create({
    curriculumId,
    batch,
    createdBy: userId,
  });
}
