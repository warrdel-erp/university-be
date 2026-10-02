import { Op } from 'sequelize';
import sequelize from '../database/sequelizeConfig.js';
import * as models from '../models/index.js';
import { buildScope, scoped } from '../utility/scoped.js';
import { decimalAdd, decimalSubtract, toIntegerNumber } from '../utility/decimalMoney.js';
import { studentClassSectionTermWithSectionInclude } from '../utility/classSectionIncludes.js';

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

export async function findPublishedBatchesForPreviousAcademic(filters = {}) {
  const sessionWhere = { ...buildScope(models.sessionModel, { scopeConfig: { academicYear: false } }) };
  if (filters.sessionId) {
    sessionWhere.sessionId = Number(filters.sessionId);
  }

  const courseWhere = {
    isActive: true,
    ...buildScope(models.courseModel),
  };
  if (filters.courseId) {
    courseWhere.courseId = Number(filters.courseId);
  }
  if (filters.search) {
    courseWhere[Op.or] = [
      { courseName: { [Op.like]: `%${filters.search}%` } },
      { courseCode: { [Op.like]: `%${filters.search}%` } },
    ];
  }

  return models.batchModel.findAll({
    where: { status: 'published' },
    attributes: ['batchId', 'sessionId', 'batch', 'intakeCapacity', 'status'],
    include: [
      {
        model: models.sessionModel,
        as: 'session',
        required: true,
        attributes: ['sessionId', 'sessionName', 'courseId'],
        where: sessionWhere,
        include: [
          {
            model: models.courseModel,
            as: 'course',
            required: true,
            attributes: [
              'courseId',
              'courseName',
              'courseCode',
              'termType',
              'totalTerms',
              'courseDuration',
            ],
            where: courseWhere,
          },
        ],
      },
      {
        model: models.curriculumBatchMappingModel,
        as: 'curriculumMappings',
        required: false,
        attributes: ['curriculumBatchMappingId', 'curriculumId', 'batchId'],
        include: [
          {
            model: models.curriculumModel,
            as: 'curriculum',
            required: false,
            attributes: ['curriculumId', 'name', 'courseId', 'isActive'],
            where: { isActive: true },
            include: [
              {
                model: models.curriculumSubjectTermMappingModel,
                as: 'subjectTermMappings',
                required: false,
                attributes: ['curriculumSubjectTermMappingId', 'subjectId', 'term', 'credit'],
              },
            ],
          },
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
    ],
    order: [
      [{ model: models.sessionModel, as: 'session' }, 'sessionId', 'ASC'],
      ['batch', 'DESC'],
    ],
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
        attributes: ['curriculumBatchMappingId', 'curriculumId', 'batchId'],
        include: [
          {
            model: models.batchModel,
            as: 'batch',
            required: true,
            attributes: ['batchId', 'batch', 'sessionId', 'status'],
          },
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
      [
        sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('students.student_id'))),
        'studentCount',
      ],
    ],
    where,
    group: ['courseId', 'sessionId', 'batchYear'],
    raw: true,
    subQuery: false,
  });

  const countMap = new Map();
  for (const row of rows) {
    countMap.set(
      `${Number(row.courseId)}_${Number(row.sessionId)}_${Number(row.batchYear)}`,
      Number(row.studentCount) || 0,
    );
  }
  return countMap;
}

export async function getStudentCountsByBatchIds(batchIds) {
  const countMap = new Map();
  if (!batchIds.length) {
    return countMap;
  }

  const rows = await scoped(models.studentModel, {
    scopeConfig: { academicYear: false },
  }).findAll({
    attributes: [
      'batchId',
      [
        sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('students.student_id'))),
        'studentCount',
      ],
    ],
    where: { batchId: { [Op.in]: batchIds } },
    group: ['batchId'],
    raw: true,
    subQuery: false,
  });

  for (const row of rows) {
    countMap.set(Number(row.batchId), Number(row.studentCount) || 0);
  }
  return countMap;
}

export async function getAcademicRegulationCourseMappings(courseIds, batchIds = []) {
  const batchWhere = {};
  if (Array.isArray(batchIds) && batchIds.length > 0) {
    batchWhere.batchId = { [Op.in]: batchIds.map(Number) };
  }

  const sessionInclude = {
    model: models.sessionModel,
    as: 'session',
    required: true,
  };
  if (Array.isArray(courseIds) && courseIds.length > 0) {
    sessionInclude.where = { courseId: { [Op.in]: courseIds.map(Number) } };
  }

  const matchingBatches = await scoped(models.batchModel).findAll({
    where: batchWhere,
    attributes: ['batchId', 'sessionId'],
    include: [sessionInclude],
    raw: true,
  });

  const resolvedBatchIds = matchingBatches.map(b => b.batchId);
  if (resolvedBatchIds.length === 0) {
    return [];
  }

  return scoped(models.academicRegulationCourseMappingModel).findAll({
    where: { batchId: { [Op.in]: resolvedBatchIds } },
    attributes: ['academicRegulationCourseMappingId', 'batchId', 'academicRegulationId'],
    include: [
      {
        model: models.academicRegulationModel,
        as: 'academicRegulation',
        attributes: ['academicRegulationId', 'regulationName'],
      },
      {
        model: models.batchModel,
        as: 'batch',
        attributes: ['batchId', 'sessionId'],
        include: [
          {
            model: models.sessionModel,
            as: 'session',
            attributes: ['sessionId', 'courseId'],
          },
        ],
      },
    ],
  });
}

export async function getAssessmentPlanSubjectMappings(batchTermMappingIds, courseIds, sessionId = null) {
  const subjectWhere = {};
  if (Array.isArray(courseIds) && courseIds.length > 0) {
    subjectWhere.courseId = { [Op.in]: courseIds.map(Number) };
  }

  const rows = await scoped(models.assessmentPlanSubjectMappingModel).findAll({
    include: [
      {
        model: models.subjectModel,
        as: 'subject',
        required: Object.keys(subjectWhere).length > 0,
        where: Object.keys(subjectWhere).length > 0 ? subjectWhere : undefined,
        attributes: ['subjectId', 'courseId'],
      },
      {
        model: models.assessmentPlanModel,
        as: 'assessmentPlan',
        required: true,
        attributes: ['assessmentPlanId', 'batchId'],
      },
    ],
    attributes: [
      'assessmentPlanSubjectMappingId',
      'assessmentPlanId',
      'subjectId',
      'batchId',
      'curriculumSubjectTermMappingId',
    ],
  });

  return rows.map((r) => {
    const plain = r.get ? r.get({ plain: true }) : r;
    return {
      assessmentPlanSubjectMappingId: plain.assessmentPlanSubjectMappingId,
      assessmentPlanId: plain.assessmentPlanId,
      subjectId: plain.subjectId,
      batchId: plain.batchId,
      curriculumSubjectTermMappingId: plain.curriculumSubjectTermMappingId,
      batchId: plain.assessmentPlan?.batchId || plain.batchId || null,
      courseId: null,
      sessionId: sessionId ? Number(sessionId) : null,
      curriculumBatchTermMappingId: null,
    };
  });
}

export async function getHistoricalMarksByCstmIds(curriculumSubjectTermMappingIds) {
  if (curriculumSubjectTermMappingIds.length === 0) {
    return [];
  }

  return scoped(models.studentResultItemModel, {
    scopeConfig: { academicYear: false },
  }).findAll({
    where: {
      curriculumSubjectTermMappingId: { [Op.in]: curriculumSubjectTermMappingIds },
    },
    attributes: [
      'studentResultItemId',
      'studentId',
      'curriculumSubjectTermMappingId',
      'assessmentPlanComponentId',
      'maximumMarks',
      'obtainedMarks',
      'creditEarned',
      'attempt',
    ],
  });
}

export async function findBatchMappingDetails(curriculumBatchMappingId) {
  return scoped(models.curriculumBatchMappingModel).findByPk(
    curriculumBatchMappingId,
    {
      attributes: ['curriculumBatchMappingId', 'curriculumId', 'batchId'],
      include: [
        {
          model: models.batchModel,
          as: 'batch',
          required: true,
          attributes: ['batchId', 'batch', 'sessionId', 'status'],
        },
        {
          model: models.curriculumModel,
          as: 'curriculum',
          required: true,
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
              include: [
                {
                  model: models.subjectModel,
                  as: 'subject',
                  attributes: ['subjectId', 'subjectCode', 'subjectName'],
                },
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
      order: [[{ model: models.curriculumBatchTermMappingModel, as: 'termMappings' }, 'term', 'ASC']],
    },
  );
}

export async function countBatchStudents(courseId, sessionId, batchYear) {
  const batchWhere = {};
  if (sessionId != null) batchWhere.sessionId = Number(sessionId);
  if (batchYear != null) batchWhere.batch = Number(batchYear);

  const matchedBatch = await scoped(models.batchModel).findOne({
    where: batchWhere,
    include: courseId != null ? [
      {
        model: models.sessionModel,
        as: 'session',
        where: { courseId: Number(courseId) },
        required: true,
        attributes: [],
      },
    ] : [],
    attributes: ['batchId'],
  });

  if (matchedBatch?.batchId) {
    return countStudentsByBatchId(matchedBatch.batchId);
  }
  return 0;
}

export async function countStudentsByBatchId(batchId) {
  if (batchId == null) {
    return 0;
  }
  return scoped(models.studentModel, {
    scopeConfig: { academicYear: false },
  }).count({
    where: { batchId: Number(batchId) },
  });
}

export async function ensureCurriculumBatchTermMappings(
  curriculumBatchMappingId,
  course,
  batchYear,
  transaction,
) {
  const existing = await scoped(models.curriculumBatchTermMappingModel).findAll({
    where: { curriculumBatchMappingId: Number(curriculumBatchMappingId) },
    attributes: [
      'curriculumBatchTermMappingId',
      'term',
      'yearNumber',
      'year',
    ],
    order: [['term', 'ASC']],
    transaction,
  });
  if (existing.length > 0) {
    return existing;
  }

  const { resolveTotalTerms, yearFromTerm } = await import('../utility/courseTerms.js');
  const totalTerms = resolveTotalTerms(course) || 0;
  if (!totalTerms || batchYear == null) {
    return [];
  }

  const rows = [];
  for (let term = 1; term <= totalTerms; term++) {
    const yearNumber = yearFromTerm(term, course);
    rows.push({
      curriculumBatchMappingId: Number(curriculumBatchMappingId),
      term,
      yearNumber,
      year: toIntegerNumber(decimalSubtract(decimalAdd(batchYear, yearNumber), 1)),
    });
  }

  await scoped(models.curriculumBatchTermMappingModel).bulkCreate(rows, { transaction });

  return scoped(models.curriculumBatchTermMappingModel).findAll({
    where: { curriculumBatchMappingId: Number(curriculumBatchMappingId) },
    attributes: [
      'curriculumBatchTermMappingId',
      'term',
      'yearNumber',
      'year',
    ],
    order: [['term', 'ASC']],
    transaction,
  });
}

export async function findTermMappingWithBatch(curriculumBatchTermMappingId) {
  return scoped(models.curriculumBatchTermMappingModel).findByPk(
    curriculumBatchTermMappingId,
    {
      attributes: [
        'curriculumBatchTermMappingId',
        'curriculumBatchMappingId',
        'term',
        'yearNumber',
        'year',
      ],
      include: [
        {
          model: models.curriculumBatchMappingModel,
          as: 'batchMapping',
          required: true,
          attributes: ['curriculumBatchMappingId', 'curriculumId', 'batchId'],
          include: [
            {
              model: models.batchModel,
              as: 'batch',
              required: true,
              attributes: ['batchId', 'batch', 'sessionId', 'status'],
            },
            {
              model: models.curriculumModel,
              as: 'curriculum',
              attributes: ['curriculumId', 'name', 'courseId'],
              required: true,
              where: buildScope(models.curriculumModel),
              include: [
                {
                  model: models.courseModel,
                  as: 'course',
                  attributes: ['courseId', 'courseName', 'courseCode'],
                },
              ],
            },
          ],
        },
      ],
    },
  );
}

export async function findStudentsByCourseBatch(courseId, batchYear, sessionId, batchId = null) {
  let resolvedBatchId = batchId ? Number(batchId) : null;
  if (!resolvedBatchId && batchYear != null) {
    const matchedBatch = await scoped(models.batchModel).findOne({
      where: {
        ...(sessionId != null && { sessionId: Number(sessionId) }),
        batch: Number(batchYear),
      },
      include: courseId != null ? [
        {
          model: models.sessionModel,
          as: 'session',
          where: { courseId: Number(courseId) },
          required: true,
          attributes: [],
        },
      ] : [],
      attributes: ['batchId'],
    });
    if (matchedBatch?.batchId) {
      resolvedBatchId = Number(matchedBatch.batchId);
    }
  }

  const where = {};
  if (resolvedBatchId) {
    where.batchId = resolvedBatchId;
  }

  return scoped(models.studentModel, {
    scopeConfig: { academicYear: false },
  }).findAll({
    where,
    attributes: [
      'studentId',
      'firstName',
      'middleName',
      'lastName',
      'enrollNumber',
      'scholarNumber',
      'admissionNumber',
      'batchId',
      'classSectionTermId',
      'sessionId',
    ],
    include: [
      {
        model: models.batchModel,
        as: 'batch',
        required: false,
        attributes: ['batchId', 'batch', 'sessionId'],
      },
      studentClassSectionTermWithSectionInclude({
        includeSectionTerms: false,
        termRequired: false,
        sectionRequired: false,
      }),
      {
        model: models.sessionModel,
        as: 'studentSession',
        required: false,
        attributes: ['sessionId', 'sessionName'],
        where: buildScope(models.sessionModel, {
          scopeConfig: { academicYear: false },
        }),
      },
    ],
    order: [
      ['enrollNumber', 'ASC'],
      ['firstName', 'ASC'],
    ],
  });
}

/**
 * Get student list by batchId + year.
 * Filters students by batchId, year (study year number or academic year), and optional filters (sessionId, courseId).
 */
export async function findStudentsByBatchAndYear(batchId, year = null, options = {}) {
  const bId = Number(batchId);
  if (!bId) {
    return [];
  }

  const where = {
    batchId: bId,
  };
  if (options.courseId) {
    where.courseId = Number(options.courseId);
  }

  const sectionWhere = {};
  if (year != null && year !== '') {
    const yNum = Number(year);
    if (!Number.isNaN(yNum)) {
      if (yNum <= 10) {
        // Study year: 1st year, 2nd year, etc.
        sectionWhere.year = yNum;
      } else {
        // Calendar / batch year: e.g. 2025, 2026
        sectionWhere[Op.or] = [
          { activeYear: yNum },
          { '$students.batch_year$': yNum },
        ];
      }
    }
  }

  return scoped(models.studentModel, {
    scopeConfig: { academicYear: false },
  }).findAll({
    where,
    attributes: [
      'studentId',
      'firstName',
      'middleName',
      'lastName',
      'enrollNumber',
      'scholarNumber',
      'batchId',
      'batchYear',
      'classSectionTermId',
      'sessionId',
    ],
    include: [
      {
        model: models.batchModel,
        as: 'batch',
        required: false,
        attributes: ['batchId', 'batch', 'sessionId'],
      },
      studentClassSectionTermWithSectionInclude({
        includeSectionTerms: false,
        termRequired: false,
        sectionRequired: Object.keys(sectionWhere).length > 0,
        sectionWhere: Object.keys(sectionWhere).length > 0 ? sectionWhere : undefined,
        sectionAttributes: ['classSectionsId', 'year', 'batchId', 'activeYear'],
      }),
      {
        model: models.sessionModel,
        as: 'studentSession',
        required: false,
        attributes: ['sessionId', 'sessionName'],
        where: buildScope(models.sessionModel, {
          scopeConfig: { academicYear: false },
        }),
      },
    ],
    order: [
      ['scholarNumber', 'ASC'],
      ['enrollNumber', 'ASC'],
      ['firstName', 'ASC'],
    ],
    transaction: options.transaction,
  });
}

export async function findStudentsWithTermResultItems(
  courseId,
  batchYear,
  sessionId,
  curriculumSubjectTermMappingIds,
  pagination = {},
  extraOptions = {},
) {
  let resolvedBatchId = extraOptions.batchId ? Number(extraOptions.batchId) : null;
  if (!resolvedBatchId && batchYear != null) {
    const matchedBatch = await scoped(models.batchModel).findOne({
      where: {
        ...(sessionId != null && { sessionId: Number(sessionId) }),
        batch: Number(batchYear),
      },
      include: courseId != null ? [
        {
          model: models.sessionModel,
          as: 'session',
          where: { courseId: Number(courseId) },
          required: true,
          attributes: [],
        },
      ] : [],
      attributes: ['batchId'],
      transaction: extraOptions.transaction,
    });
    if (matchedBatch?.batchId) {
      resolvedBatchId = Number(matchedBatch.batchId);
    }
  }

  let classSectionTermIds = [];
  if (resolvedBatchId && extraOptions.term != null) {
    const classSections = await scoped(models.classSectionModel).findAll({
      where: { batchId: resolvedBatchId },
      attributes: ['classSectionsId'],
      raw: true,
      transaction: extraOptions.transaction,
    });
    const sectionIds = classSections.map((cs) => Number(cs.classSectionsId)).filter(Boolean);
    if (sectionIds.length > 0) {
      const cstRows = await scoped(models.classSectionTermModel).findAll({
        where: {
          classSectionsId: { [Op.in]: sectionIds },
          term: Number(extraOptions.term),
        },
        attributes: ['classSectionTermId'],
        raw: true,
        transaction: extraOptions.transaction,
      });
      classSectionTermIds = cstRows.map((r) => Number(r.classSectionTermId)).filter(Boolean);
    }
  }

  const where = {};
  if (resolvedBatchId) {
    where.batchId = resolvedBatchId;
  }
  if (classSectionTermIds.length > 0) {
    where.classSectionTermId = { [Op.in]: classSectionTermIds };
  }

  const include = [
    {
      model: models.sessionModel,
      as: 'studentSession',
      required: false,
      attributes: ['sessionId', 'sessionName'],
      where: buildScope(models.sessionModel, {
        scopeConfig: { academicYear: false },
      }),
    },
  ];

  if (curriculumSubjectTermMappingIds.length > 0) {
    const resultItemWhere = { ...buildScope(models.studentResultItemModel) };
    resultItemWhere.curriculumSubjectTermMappingId = { [Op.in]: curriculumSubjectTermMappingIds };
    include.push({
      model: models.studentResultItemModel,
      as: 'resultItems',
      required: false,
      separate: true,
      attributes: [
        'studentResultItemId',
        'studentId',
        'curriculumSubjectTermMappingId',
        'assessmentPlanComponentId',
        'obtainedMarks',
        'maximumMarks',
        'creditEarned',
        'attempt',
      ],
      where: resultItemWhere,
    });
  }

  const options = {
    where,
    attributes: [
      'studentId',
      'firstName',
      'middleName',
      'lastName',
      'enrollNumber',
      'scholarNumber',
      'admissionNumber',
      'sessionId',
    ],
    include,
    order: [
      ['enrollNumber', 'ASC'],
      ['firstName', 'ASC'],
    ],
    distinct: true,
  };

  if (pagination.limit != null) {
    options.limit = pagination.limit;
    options.offset = pagination.offset;
    return scoped(models.studentModel, {
      scopeConfig: { academicYear: false },
    }).findAndCountAll(options);
  }

  const rows = await scoped(models.studentModel, {
    scopeConfig: { academicYear: false },
  }).findAll(options);
  return { count: rows.length, rows };
}

export async function findAssessmentPlanSubjectsForTerm(
  curriculumBatchTermMappingId,
  sessionId,
  courseId = null,
) {
  const rows = await scoped(models.assessmentPlanSubjectMappingModel).findAll({
    attributes: [
      'assessmentPlanSubjectMappingId',
      'assessmentPlanId',
      'subjectId',
      'batchId',
      'curriculumSubjectTermMappingId',
    ],
    include: [
      {
        model: models.subjectModel,
        as: 'subject',
        required: true,
        attributes: ['subjectId', 'subjectCode', 'subjectName', 'courseId'],
        where: courseId ? { courseId: Number(courseId) } : undefined,
      },
      {
        model: models.assessmentPlanModel,
        as: 'assessmentPlan',
        required: true,
        attributes: ['assessmentPlanId', 'planName', 'planCode', 'gradingId', 'regulationId', 'batchId'],
        where: {
          ...buildScope(models.assessmentPlanModel, {
            scopeConfig: { academicYear: false },
          }),
        },
        include: [
          gradingSchemeInclude(),
          academicRegulationInclude(false),
          {
            model: models.assessmentPlanComponentModel,
            as: 'components',
            required: true,
            attributes: [
              'assessmentPlanComponentId',
              'examSetupTypeId',
              'weightagePercentage',
            ],
            include: [
              {
                model: models.examSetupTypeModel,
                as: 'examSetupType',
                required: true,
                attributes: ['examSetupTypeId', 'examName', 'examCode', 'examCategory'],
                where: buildScope(models.examSetupTypeModel, {
                  scopeConfig: { academicYear: false },
                }),
              },
            ],
          },
        ],
      },
    ],
  });
  return rows;
}

export async function findSubjectTermMappingsByCurriculumTerm(curriculumId, term) {
  return scoped(models.curriculumSubjectTermMappingModel).findAll({
    where: { curriculumId, term },
    attributes: [
      'curriculumSubjectTermMappingId',
      'curriculumId',
      'subjectId',
      'term',
      'credit',
    ],
    include: [
      {
        model: models.subjectModel,
        as: 'subject',
        required: true,
        attributes: ['subjectId', 'subjectCode', 'subjectName'],
      },
    ],
  });
}

export async function createStudentResultItems(rows, transaction) {
  return scoped(models.studentResultItemModel).bulkCreate(rows, { transaction });
}

export async function upsertStudentResultItems(rows, transaction) {
  return scoped(models.studentResultItemModel).bulkCreate(rows, {
    transaction,
    updateOnDuplicate: ['maximumMarks', 'obtainedMarks', 'creditEarned', 'attempt', 'updatedAt'],
  });
}

export async function createUploadLog(payload, transaction) {
  return scoped(models.previousAcademicUploadLogModel).create(payload, { transaction });
}

function gradingSchemeInclude() {
  return {
    model: models.gradingModel,
    as: 'gradingScheme',
    required: false,
    attributes: [
      'gradingId',
      'gradingName',
      'gradingCode',
      'gradingMethod',
      'minimumPassingMarks',
      'maximumMarks',
    ],
    where: buildScope(models.gradingModel, {
      scopeConfig: { academicYear: false },
    }),
    include: [
      {
        model: models.gradingGradeModel,
        as: 'grades',
        required: false,
        attributes: [
          'gradingGradeId',
          'grade',
          'minPercentage',
          'maxPercentage',
          'isPass',
          'sortOrder',
        ],
      },
    ],
  };
}

function academicRegulationInclude(required, batchYear = null) {
  const regulationWhere = { ...buildScope(models.academicRegulationModel) };
  if (batchYear != null) {
    const batchYearText = String(batchYear);
    regulationWhere[Op.or] = [
      { applicableBatch: batchYearText },
      { applicableBatch: { [Op.like]: `${batchYearText} %` } },
      { applicableBatch: { [Op.like]: `${batchYearText}-%` } },
    ];
  }

  return {
    model: models.academicRegulationModel,
    as: 'academicRegulation',
    required,
    attributes: [
      'academicRegulationId',
      'regulationCode',
      'regulationName',
      'applicableBatch',
      'academicYearRange',
      'status',
      'version',
      'gradingSchemeId',
      'evaluationPattern',
      'minimumOverallMarks',
      'minimumOverallPercentage',
      'minimumInternalMarks',
      'minimumExternalMarks',
    ],
    where: regulationWhere,
    include: [gradingSchemeInclude()],
  };
}

export async function findAcademicRegulationForCourse(courseId, sessionId, batchYear = null) {
  const batchWhere = {};
  if (sessionId) {
    batchWhere.sessionId = Number(sessionId);
  }
  if (batchYear != null) {
    batchWhere.batch = Number(batchYear);
  }

  const sessionInclude = {
    model: models.sessionModel,
    as: 'session',
    required: true,
  };
  if (courseId) {
    sessionInclude.where = { courseId: Number(courseId) };
  }

  const matchingBatches = await scoped(models.batchModel).findAll({
    where: batchWhere,
    attributes: ['batchId', 'sessionId', 'batch'],
    include: [sessionInclude],
    raw: true,
  });

  const batchIds = matchingBatches.map(b => b.batchId);
  if (batchIds.length === 0) {
    return [];
  }

  return scoped(models.academicRegulationCourseMappingModel).findAll({
    where: { batchId: { [Op.in]: batchIds } },
    attributes: [
      'academicRegulationCourseMappingId',
      'batchId',
      'academicRegulationId',
    ],
    include: [
      academicRegulationInclude(true, batchYear),
      {
        model: models.batchModel,
        as: 'batch',
        attributes: ['batchId', 'sessionId', 'batch'],
      },
    ],
  });
}

function uploadLogListOptions(where) {
  return {
    where,
    attributes: [
      'previousAcademicUploadLogId',
      'curriculumBatchTermMappingId',
      'sessionId',
      'fileName',
      'mimeType',
      'fileSize',
      'status',
      'errorMessage',
      'entriesCreated',
      'entriesUpdated',
      'createdBy',
      'createdAt',
    ],
    include: [
      {
        model: models.users,
        as: 'uploadedBy',
        required: false,
        attributes: ['userId', 'userName'],
      },
      {
        model: models.sessionModel,
        as: 'session',
        required: false,
        attributes: ['sessionId', 'sessionName'],
        where: buildScope(models.sessionModel, {
          scopeConfig: { academicYear: false },
        }),
      },
    ],
    order: [['createdAt', 'DESC']],
  };
}

export async function findUploadLogsByTermMappingId(curriculumBatchTermMappingId, sessionId) {
  const where = { curriculumBatchTermMappingId };
  if (sessionId) {
    where.sessionId = sessionId;
  }

  return scoped(models.previousAcademicUploadLogModel).findAll(
    uploadLogListOptions(where),
  );
}

export async function findLatestUploadLogByTermMappingId(curriculumBatchTermMappingId, sessionId) {
  const where = { curriculumBatchTermMappingId };
  if (sessionId) {
    where.sessionId = sessionId;
  }

  return scoped(models.previousAcademicUploadLogModel).findOne(
    uploadLogListOptions(where),
  );
}

export async function findSessionsByIds(sessionIds) {
  if (!sessionIds || sessionIds.length === 0) {
    return [];
  }

  return scoped(models.sessionModel, {
    scopeConfig: { academicYear: false },
  }).findAll({
    where: { sessionId: { [Op.in]: sessionIds } },
    attributes: ['sessionId', 'sessionName'],
    order: [['sessionId', 'ASC']],
  });
}

export async function updateStudentResultItem(studentResultItemId, payload, transaction) {
  return scoped(models.studentResultItemModel).update(payload, {
    where: { studentResultItemId },
    transaction,
  });
}
