import { Op } from "sequelize";
import * as model from "../models/index.js";
import * as acedmicYearRepository from "../repository/acedmicYearRepository.js";
import { getAcademicYearId, getTenantStore } from "./requestContext.js";
import { buildScope } from "./scoped.js";
import {
  decimalGreaterThan,
  toIntegerNumber,
} from "./decimalMoney.js";

/**
 * Resolve tenant active academic year + calendar year from startingDate
 * (e.g. 2026-07-01 → activeYear 2026).
 */
export async function resolveActiveAcademicYearContext(options = {}) {
  let academicYearId = getAcademicYearId();
  let academicYear = null;

  if (academicYearId) {
    academicYear = await acedmicYearRepository.getSingleacedmicYearDetails(
      academicYearId,
      options,
    );
  }

  if (!academicYear) {
    const store = getTenantStore();
    const activeYears =
      await acedmicYearRepository.getActiveAcedmicYearByInstitute(
        store.instituteId,
        store.universityId,
      );
    academicYear = activeYears?.[0] || null;
  }

  if (!academicYear?.academicYearId || !academicYear?.startingDate) {
    const err = new Error(
      "Active academic year is required to resolve curriculum subjects",
    );
    err.statusCode = 400;
    throw err;
  }

  const activeBatchYear = toIntegerNumber(
    String(academicYear.startingDate).slice(0, 4),
  );
  if (!decimalGreaterThan(activeBatchYear, 0)) {
    const err = new Error(
      "Unable to resolve active year from academic year starting date",
    );
    err.statusCode = 400;
    throw err;
  }

  return {
    academicYearId: toIntegerNumber(academicYear.academicYearId),
    activeBatchYear,
    academicYear,
  };
}

/**
 * Curriculum subjects for the active calendar year (batch-term.year).
 *
 * Path:
 * curriculum_batch_term_mapping (year = activeBatchYear)
 *   → curriculum_batch_mapping (batch)
 *   → curriculum (courseId)
 *   → curriculum_subject_term_mapping (same term) → subject
 *
 * Filters (all optional):
 * - courseId / courseIds
 * - subjectId / subjectIds
 * - terms
 * - batches (admission batch years)
 * - activeBatchYear / academicYearId overrides
 */
export async function findCurriculumSubjectsForActiveYear(
  {
    courseId,
    courseIds,
    subjectId,
    subjectIds,
    terms,
    batches,
    batchIds,
    activeBatchYear: activeBatchYearOverride,
    academicYearId,
  } = {},
  options = {},
) {
  let activeBatchYear = activeBatchYearOverride ? Number(activeBatchYearOverride) : null;
  let resolvedAcademicYearId = academicYearId ? Number(academicYearId) : null;

  if (!activeBatchYear && resolvedAcademicYearId) {
    const academicYear = await acedmicYearRepository.getSingleacedmicYearDetails(
      resolvedAcademicYearId,
      options,
    );
    if (academicYear?.startingDate) {
      activeBatchYear = Number(String(academicYear.startingDate).slice(0, 4));
    }
  }

  if (!activeBatchYear) {
    const ctx = await resolveActiveAcademicYearContext(options);
    activeBatchYear = ctx.activeBatchYear;
    resolvedAcademicYearId = resolvedAcademicYearId || ctx.academicYearId;
  }

  const courseIdList = [
    ...(courseId ? [Number(courseId)] : []),
    ...(Array.isArray(courseIds) ? courseIds.map(Number).filter(Boolean) : []),
  ];

  const subjectIdList = [
    ...(subjectId ? [Number(subjectId)] : []),
    ...(Array.isArray(subjectIds) ? subjectIds.map(Number).filter(Boolean) : []),
  ];

  const termList = Array.isArray(terms) ? terms.map(Number).filter(Boolean) : [];
  const batchList = Array.isArray(batches) ? batches.map(Number).filter(Boolean) : [];
  const batchIdList = Array.isArray(batchIds) ? batchIds.map(Number).filter(Boolean) : [];

  const batchWhere = {};
  if (batchIdList.length > 0) {
    batchWhere.batchId = batchIdList.length === 1 ? batchIdList[0] : { [Op.in]: batchIdList };
  }

  const curriculumWhere = {
    ...buildScope(model.curriculumModel),
    ...(courseIdList.length > 0 && {
      courseId: courseIdList.length === 1 ? courseIdList[0] : { [Op.in]: courseIdList },
    }),
  };

  const subjectTermWhere = {
    ...(termList.length > 0 && {
      term: termList.length === 1 ? termList[0] : { [Op.in]: termList },
    }),
    ...(subjectIdList.length > 0 && {
      subjectId: subjectIdList.length === 1 ? subjectIdList[0] : { [Op.in]: subjectIdList },
    }),
  };

  const batchInclude = {
    model: model.curriculumBatchMappingModel,
    as: "batchMapping",
    attributes: ["curriculumBatchMappingId", "curriculumId", "batchId"],
    required: true,
    ...(Object.keys(batchWhere).length > 0 && { where: batchWhere }),
    include: [
      {
        model: model.batchModel,
        as: "batch",
        attributes: ["batchId", "batch", "sessionId"],
        required: true,
        ...(batchList.length > 0 && {
          where: batchList.length === 1 ? { batch: batchList[0] } : { batch: { [Op.in]: batchList } },
        }),
      },
      {
        model: model.curriculumModel,
        as: "curriculum",
        attributes: ["curriculumId", "name", "courseId"],
        required: true,
        where: curriculumWhere,
        include: [
          {
            model: model.curriculumSubjectTermMappingModel,
            as: "subjectTermMappings",
            attributes: [
              "curriculumSubjectTermMappingId",
              "subjectId",
              "term",
              "credit",
            ],
            required: true,
            ...(Object.keys(subjectTermWhere).length > 0 && { where: subjectTermWhere }),
            include: [
              {
                model: model.subjectModel,
                as: "subject",
                attributes: [
                  "subjectId",
                  "subjectName",
                  "subjectCode",
                  "subjectType",
                  "subjectCategory",
                  "shortName",
                  "description",
                  "isActive",
                  "courseId",
                ],
                required: true,
                where: {
                  ...buildScope(model.subjectModel),
                  isActive: true,
                },
              },
            ],
          },
        ],
      },
    ],
  };

  const batchTermWhere = {
    year: activeBatchYear,
    ...(termList.length > 0 && {
      term: termList.length === 1 ? termList[0] : { [Op.in]: termList },
    }),
  };

  const termRows = await model.curriculumBatchTermMappingModel.findAll({
    attributes: [
      "curriculumBatchTermMappingId",
      "curriculumBatchMappingId",
      "term",
      "yearNumber",
      "year",
    ],
    where: batchTermWhere,
    include: [batchInclude],
    transaction: options.transaction,
  });

  const rows = [];
  const seen = new Set();

  for (const termRow of termRows) {
    const plainTerm = termRow.get ? termRow.get({ plain: true }) : termRow;
    const batchMapping = plainTerm.batchMapping;
    if (!batchMapping?.curriculum) continue;

    const curriculum = batchMapping.curriculum;
    const batchObj = batchMapping.batch;
    const batch = batchObj?.batch != null ? Number(batchObj.batch) : null;
    const expectedYearNumber = batch != null ? Number(activeBatchYear) - batch + 1 : Number(plainTerm.yearNumber);

    if (expectedYearNumber < 1 || Number(plainTerm.yearNumber) !== expectedYearNumber) {
      continue;
    }

    const activeTerm = Number(plainTerm.term);

    for (const mapping of curriculum.subjectTermMappings || []) {
      if (Number(mapping.term) !== activeTerm || !mapping.subject) continue;

      const key = `${curriculum.courseId}:${mapping.subjectId}:${activeTerm}:${batch}`;
      if (seen.has(key)) continue;
      seen.add(key);

      rows.push({
        subjectId: Number(mapping.subjectId),
        term: activeTerm,
        credit: mapping.credit,
        year: Number(plainTerm.year),
        yearNumber: Number(plainTerm.yearNumber),
        batch,
        batchId: Number(batchMapping.batchId),
        curriculumId: Number(curriculum.curriculumId),
        curriculumSubjectTermMappingId: Number(mapping.curriculumSubjectTermMappingId),
        curriculumBatchMappingId: Number(batchMapping.curriculumBatchMappingId),
        curriculumBatchTermMappingId: Number(plainTerm.curriculumBatchTermMappingId),
        curriculumName: curriculum.name,
        courseId: Number(curriculum.courseId),
        academicYearId: resolvedAcademicYearId,
        activeBatchYear,
        subject: mapping.subject,
      });
    }
  }

  return {
    academicYearId: resolvedAcademicYearId,
    activeBatchYear,
    rows,
  };
}

/**
 * Active-year curriculum batch-term rows for courses (no subject required).
 * Use this when selectable terms must appear even if curriculum subjects
 * are not mapped for that term yet.
 */
export async function findActiveYearBatchTermsByCourseIds(
  courseIds,
  options = {},
) {
  const courseIdList = [];
  for (const id of courseIds || []) {
    if (id == null || id === "") continue;
    courseIdList.push(Number(id));
  }
  if (!courseIdList.length) {
    return { academicYearId: null, activeBatchYear: null, rows: [] };
  }

  let resolvedAcademicYearId = options.academicYearId
    ? toIntegerNumber(options.academicYearId)
    : null;
  let activeBatchYear = options.activeBatchYear
    ? toIntegerNumber(options.activeBatchYear)
    : null;

  if (!activeBatchYear && resolvedAcademicYearId) {
    const academicYear = await acedmicYearRepository.getSingleacedmicYearDetails(
      resolvedAcademicYearId,
      options,
    );
    if (academicYear?.startingDate) {
      activeBatchYear = toIntegerNumber(
        String(academicYear.startingDate).slice(0, 4),
      );
    }
  }

  if (!activeBatchYear) {
    const ctx = await resolveActiveAcademicYearContext(options);
    activeBatchYear = ctx.activeBatchYear;
    if (!resolvedAcademicYearId) {
      resolvedAcademicYearId = ctx.academicYearId;
    }
  }

  const termRows = await model.curriculumBatchTermMappingModel.findAll({
    attributes: [
      "curriculumBatchTermMappingId",
      "curriculumBatchMappingId",
      "term",
      "yearNumber",
      "year",
    ],
    where: { year: activeBatchYear },
    include: [
      {
        model: model.curriculumBatchMappingModel,
        as: "batchMapping",
        attributes: ["curriculumBatchMappingId", "curriculumId", "batchId"],
        required: true,
        include: [
          {
            model: model.batchModel,
            as: "batch",
            attributes: ["batchId", "batch", "sessionId"],
            required: true,
          },
          {
            model: model.curriculumModel,
            as: "curriculum",
            attributes: ["curriculumId", "name", "courseId"],
            required: true,
            where: {
              ...buildScope(model.curriculumModel),
              courseId: { [Op.in]: courseIdList },
            },
          },
        ],
      },
    ],
    transaction: options.transaction,
  });

  const rows = [];
  const seen = new Set();
  for (const termRow of termRows) {
    const plain = termRow.get ? termRow.get({ plain: true }) : termRow;
    const batchMapping = plain.batchMapping;
    if (!batchMapping || !batchMapping.curriculum) continue;

    const batchObj = batchMapping.batch;
    const batch = batchObj?.batch != null ? Number(batchObj.batch) : null;
    const expectedYearNumber = batch != null ? Number(activeBatchYear) - batch + 1 : Number(plain.yearNumber);
    if (
      expectedYearNumber < 1 ||
      Number(plain.yearNumber) !== expectedYearNumber
    ) {
      continue;
    }

    const courseId = Number(batchMapping.curriculum.courseId);
    const term = Number(plain.term);
    const key = `${courseId}_${batch}_${term}`;
    if (seen.has(key)) continue;
    seen.add(key);

    rows.push({
      courseId,
      term,
      batch,
      batchId: Number(batchMapping.batchId),
      year: Number(plain.year),
      yearNumber: Number(plain.yearNumber),
      curriculumId: Number(batchMapping.curriculum.curriculumId),
      curriculumName: batchMapping.curriculum.name,
      curriculumBatchMappingId: Number(batchMapping.curriculumBatchMappingId),
      curriculumBatchTermMappingId: Number(plain.curriculumBatchTermMappingId),
      academicYearId: resolvedAcademicYearId,
      activeBatchYear,
    });
  }

  return {
    academicYearId: resolvedAcademicYearId,
    activeBatchYear,
    rows,
  };
}

/**
 * Unique subjectIds from findCurriculumSubjectsForActiveYear.
 */
export async function findActiveCurriculumSubjectIds(filters = {}, options = {}) {
  const result = await findCurriculumSubjectsForActiveYear(filters, options);
  const subjectIds = [];
  const seen = new Set();
  for (const row of result.rows) {
    if (seen.has(row.subjectId)) continue;
    seen.add(row.subjectId);
    subjectIds.push(row.subjectId);
  }
  return {
    academicYearId: result.academicYearId,
    activeBatchYear: result.activeBatchYear,
    subjectIds,
  };
}
