import { Op } from 'sequelize';
import sequelize from '../database/sequelizeConfig.js';
import * as models from '../models/index.js';
import { buildScope, scoped } from '../utility/scoped.js';

export async function findProgrammesWithSessions(filters = {}) {
  const courseWhere = { isActive: true };
  if (filters.courseId) {
    courseWhere.courseId = filters.courseId;
  }
  if (filters.search) {
    courseWhere[Op.or] = [
      { courseName: { [Op.like]: `%${filters.search}%` } },
      { courseCode: { [Op.like]: `%${filters.search}%` } },
    ];
  }

  const sessionRequired = Boolean(filters.sessionId);
  const sessionScope = { scopeConfig: { academicYear: false } };
  const sessionWhere = { ...buildScope(models.sessionModel, sessionScope) };
  if (filters.sessionId) {
    sessionWhere.sessionId = filters.sessionId;
  }

  return scoped(models.courseModel).findAll({
    where: courseWhere,
    attributes: [
      'courseId',
      'courseName',
      'courseCode',
      'termType',
      'totalTerms',
      'courseDuration',
    ],
    include: [
      {
        model: models.sessionCouseMappingModel,
        as: 'sessionCourseMappings',
        required: sessionRequired,
        attributes: ['sessionCourseMappingId', 'sessionId', 'courseId'],
        where: buildScope(models.sessionCouseMappingModel, sessionScope),
        include: [
          {
            model: models.sessionModel,
            as: 'session',
            attributes: ['sessionId', 'sessionName'],
            required: sessionRequired,
            where: sessionWhere,
          },
        ],
      },
    ],
    order: [['courseName', 'ASC']],
  });
}

export async function getCurriculumBatchMappings(courseIds) {
  return scoped(models.curriculumModel).findAll({
    where: { courseId: { [Op.in]: courseIds } },
    attributes: ['curriculumId', 'name', 'courseId'],
    include: [
      {
        model: models.curriculumBatchMappingModel,
        as: 'batchMappings',
        required: false,
        attributes: ['curriculumBatchMappingId', 'curriculumId', 'batch'],
        include: [
          {
            model: models.curriculumBatchTermMappingModel,
            as: 'termMappings',
            required: false,
            attributes: [
              'curriculumBatchTermMappingId',
              'term',
              'yearNumber',
              'year',
            ],
          },
        ],
      },
      {
        model: models.curriculumSubjectTermMappingModel,
        as: 'subjectTermMappings',
        required: false,
        attributes: ['curriculumSubjectTermMappingId', 'subjectId', 'term', 'credit'],
      },
    ],
  });
}

export async function getBatchStudentCounts(courseIds, batchYears) {
  const where = {
    courseId: { [Op.in]: courseIds },
  };
  if (batchYears.length > 0) {
    where.batchYear = { [Op.in]: batchYears };
  }

  const rows = await scoped(models.studentModel, {
    scopeConfig: { academicYear: false },
  }).findAll({
    attributes: [
      'courseId',
      'sessionId',
      'batchYear',
      [sequelize.fn('COUNT', sequelize.col('student_id')), 'studentCount'],
    ],
    where,
    group: ['courseId', 'sessionId', 'batchYear'],
    raw: true,
  });

  const countMap = new Map();
  for (const row of rows) {
    countMap.set(
      `${row.courseId}_${row.sessionId}_${row.batchYear}`,
      Number(row.studentCount) || 0,
    );
  }
  return countMap;
}

export async function getAcademicRegulationCourseMappings(courseIds) {
  return scoped(models.academicRegulationCourseMappingModel).findAll({
    where: { courseId: { [Op.in]: courseIds } },
    attributes: ['academicRegulationCourseMappingId', 'courseId', 'academicRegulationId'],
    include: [
      {
        model: models.academicRegulationModel,
        as: 'academicRegulation',
        attributes: ['academicRegulationId', 'regulationName'],
      },
    ],
  });
}

export async function getAssessmentPlanSubjectMappings(batchTermMappingIds, courseIds) {
  if (batchTermMappingIds.length === 0) {
    return [];
  }

  const where = {
    curriculumBatchTermMappingId: { [Op.in]: batchTermMappingIds },
  };
  if (courseIds.length > 0) {
    where.courseId = { [Op.in]: courseIds };
  }

  return scoped(models.assessmentPlanSubjectMappingModel).findAll({
    where,
    attributes: [
      'assessmentPlanSubjectMappingId',
      'assessmentPlanId',
      'subjectId',
      'curriculumBatchTermMappingId',
      'courseId',
      'sessionId',
    ],
  });
}

export async function getHistoricalResultsByTermIds(batchTermMappingIds) {
  if (batchTermMappingIds.length === 0) {
    return [];
  }

  return scoped(models.studentHistoricalResultModel, {
    scopeConfig: { academicYear: false },
  }).findAll({
    where: {
      curriculumBatchTermMappingId: { [Op.in]: batchTermMappingIds },
    },
    attributes: [
      'studentHistoricalResultId',
      'curriculumBatchTermMappingId',
      'freezeStatus',
      'isFrozen',
      'resultStatus',
    ],
  });
}

export async function findBatchMappingDetails(curriculumBatchMappingId) {
  return scoped(models.curriculumBatchMappingModel).findByPk(
    curriculumBatchMappingId,
    {
      attributes: ['curriculumBatchMappingId', 'curriculumId', 'batch'],
      include: [
        {
          model: models.curriculumModel,
          as: 'curriculum',
          attributes: ['curriculumId', 'name', 'courseId'],
          include: [
            {
              model: models.courseModel,
              as: 'course',
              attributes: [
                'courseId',
                'courseName',
                'courseCode',
                'termType',
                'totalTerms',
                'courseDuration',
              ],
              include: [
                {
                  model: models.sessionCouseMappingModel,
                  as: 'sessionCourseMappings',
                  required: false,
                  attributes: ['sessionCourseMappingId', 'sessionId', 'courseId'],
                  where: buildScope(models.sessionCouseMappingModel, {
                    scopeConfig: { academicYear: false },
                  }),
                  include: [
                    {
                      model: models.sessionModel,
                      as: 'session',
                      attributes: ['sessionId', 'sessionName'],
                      required: false,
                      where: buildScope(models.sessionModel, {
                        scopeConfig: { academicYear: false },
                      }),
                    },
                  ],
                },
              ],
            },
            {
              model: models.curriculumSubjectTermMappingModel,
              as: 'subjectTermMappings',
              required: false,
              attributes: [
                'curriculumSubjectTermMappingId',
                'subjectId',
                'term',
              ],
            },
          ],
        },
        {
          model: models.curriculumBatchTermMappingModel,
          as: 'termMappings',
          attributes: [
            'curriculumBatchTermMappingId',
            'term',
            'yearNumber',
            'year',
          ],
        },
      ],
    },
  );
}

export async function countBatchStudents(courseId, sessionId, batchYear) {
  const where = { courseId, batchYear };
  if (sessionId) {
    where.sessionId = sessionId;
  }
  return scoped(models.studentModel, {
    scopeConfig: { academicYear: false },
  }).count({ where });
}
