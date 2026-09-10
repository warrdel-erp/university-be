import { Op, fn, col } from 'sequelize';
import { scoped } from '../utility/scoped.js';
import * as model from '../models/index.js';

const curriculumAttributes = [
  'curriculumId',
  'name',
  'courseId',
  'universityId',
  'instituteId',
  'isActive',
  'createdAt',
  'updatedAt',
  'createdBy',
];

const courseAttributes = [
  'courseId',
  'courseName',
  'courseCode',
  'totalTerms',
  'departmentId',
];

const batchMappingAttributes = [
  'curriculumBatchMappingId',
  'curriculumId',
  'batch',
];

export async function findAll(filters = {}) {
  const curriculums = await scoped(model.curriculumModel).findAll({
    where: filters,
    attributes: curriculumAttributes,
    include: [
      {
        model: model.courseModel,
        as: 'course',
        attributes: courseAttributes,
      },
      {
        model: model.curriculumBatchMappingModel,
        as: 'batchMappings',
        attributes: batchMappingAttributes,
        required: false,
      },
    ],
    order: [['createdAt', 'DESC']],
  });

  const courseIds = [];
  const batchYears = [];
  for (const curriculum of curriculums) {
    for (const mapping of curriculum.batchMappings) {
      courseIds.push(Number(curriculum.courseId));
      batchYears.push(Number(mapping.batch));
    }
  }

  const countMap = new Map();
  if (courseIds.length > 0) {
    const countRows = await scoped(model.studentModel).findAll({
      attributes: [
        'courseId',
        'batchYear',
        [fn('COUNT', fn('DISTINCT', col('student_id'))), 'studentCount'],
      ],
      where: {
        courseId: { [Op.in]: courseIds },
        batchYear: { [Op.in]: batchYears },
      },
      group: ['courseId', 'batchYear'],
      raw: true,
    });

    for (const row of countRows) {
      countMap.set(
        `${Number(row.courseId)}_${Number(row.batchYear)}`,
        Number(row.studentCount) || 0,
      );
    }
  }

  for (const curriculum of curriculums) {
    let studentCount = 0;
    for (const mapping of curriculum.batchMappings) {
      const key = `${Number(curriculum.courseId)}_${Number(mapping.batch)}`;
      studentCount += countMap.get(key) || 0;
    }
    curriculum.setDataValue('studentCount', studentCount);
  }

  return curriculums;
}

export async function findById(id) {
  return scoped(model.curriculumModel).findByPk(id, {
    attributes: curriculumAttributes,
    include: [
      {
        model: model.courseModel,
        as: 'course',
        attributes: courseAttributes,
      },
    ],
  });
}

export async function create(data, options = {}) {
  return scoped(model.curriculumModel).create(data, options);
}

export async function update(id, data, options = {}) {
  return scoped(model.curriculumModel).update(data, {
    where: { curriculumId: id },
    ...options,
  });
}

export async function remove(id, options = {}) {
  return scoped(model.curriculumModel).destroy({
    where: { curriculumId: id },
    ...options,
  });
}

export async function findByNameAndCourse(name, courseId) {
  return scoped(model.curriculumModel).findOne({
    where: { name, courseId },
    attributes: curriculumAttributes,
  });
}

const subjectTermMappingAttributes = [
  'curriculumSubjectTermMappingId',
  'curriculumId',
  'subjectId',
  'term',
  'credit',
  'createdAt',
  'updatedAt',
  'createdBy',
];

export async function findSubjectTermMappingsByCurriculumId(curriculumId) {
  return model.curriculumSubjectTermMappingModel.findAll({
    where: { curriculumId },
    attributes: subjectTermMappingAttributes,
    include: [
      {
        model: model.subjectModel,
        as: 'subject',
        attributes: [
          'subjectId',
          'subjectCode',
          'subjectName',
          'subjectType',
          'subjectCategory',
        ],
      },
    ],
    order: [
      ['term', 'ASC'],
      ['curriculumSubjectTermMappingId', 'ASC'],
    ],
  });
}

export async function findSubjectTermMappingById(curriculumSubjectTermMappingId) {
  return model.curriculumSubjectTermMappingModel.findByPk(
    curriculumSubjectTermMappingId,
    {
      attributes: subjectTermMappingAttributes,
      include: [
        {
          model: model.subjectModel,
          as: 'subject',
          attributes: [
            'subjectId',
            'subjectCode',
            'subjectName',
            'subjectType',
            'subjectCategory',
          ],
        },
      ],
    },
  );
}

export async function updateSubjectTermMapping(
  curriculumSubjectTermMappingId,
  data,
  options = {},
) {
  await model.curriculumSubjectTermMappingModel.update(data, {
    where: { curriculumSubjectTermMappingId },
    ...options,
  });

  return findSubjectTermMappingById(curriculumSubjectTermMappingId);
}
