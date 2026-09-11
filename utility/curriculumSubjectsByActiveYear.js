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
    activeBatchYear: activeBatchYearOverride,
    academicYearId,
  } = {},
  options = {},
) {
  let activeBatchYear = activeBatchYearOverride
    ? toIntegerNumber(activeBatchYearOverride)
    : null;
  let resolvedAcademicYearId = academicYearId
    ? toIntegerNumber(academicYearId)
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

  const courseIdList = [];
  if (courseId != null) courseIdList.push(Number(courseId));
  if (Array.isArray(courseIds)) {
    for (const id of courseIds) {
      if (id == null || id === "") continue;
      courseIdList.push(Number(id));
    }
  }

  const subjectIdList = [];
  if (subjectId != null) subjectIdList.push(Number(subjectId));
  if (Array.isArray(subjectIds)) {
    for (const id of subjectIds) {
      if (id == null || id === "") continue;
      subjectIdList.push(Number(id));
    }
  }

  const termList = [];
  if (Array.isArray(terms)) {
    for (const term of terms) {
      if (term == null || term === "") continue;
      termList.push(Number(term));
    }
  }

  const batchList = [];
  if (Array.isArray(batches)) {
    for (const batch of batches) {
      if (batch == null || batch === "") continue;
      batchList.push(Number(batch));
    }
  }

  const batchWhere = {};
  if (batchList.length === 1) {
    batchWhere.batch = batchList[0];
  } else if (batchList.length > 1) {
    batchWhere.batch = { [Op.in]: batchList };
  }

  const curriculumWhere = {
    ...buildScope(model.curriculumModel),
  };
  if (courseIdList.length === 1) {
    curriculumWhere.courseId = courseIdList[0];
  } else if (courseIdList.length > 1) {
    curriculumWhere.courseId = { [Op.in]: courseIdList };
  }

  const subjectTermWhere = {};
  if (termList.length === 1) {
    subjectTermWhere.term = termList[0];
  } else if (termList.length > 1) {
    subjectTermWhere.term = { [Op.in]: termList };
  }
  if (subjectIdList.length === 1) {
    subjectTermWhere.subjectId = subjectIdList[0];
  } else if (subjectIdList.length > 1) {
    subjectTermWhere.subjectId = { [Op.in]: subjectIdList };
  }

  const batchInclude = {
    model: model.curriculumBatchMappingModel,
    as: "batchMapping",
    attributes: ["curriculumBatchMappingId", "curriculumId", "batch"],
    required: true,
    include: [
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
            where:
              Object.keys(subjectTermWhere).length > 0
                ? subjectTermWhere
                : undefined,
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
  if (Object.keys(batchWhere).length > 0) {
    batchInclude.where = batchWhere;
  }

  // year = calendar year of the academic year; term narrows to the batch
  // currently in that term (not every batch's same term number).
  const batchTermWhere = { year: activeBatchYear };
  if (termList.length === 1) {
    batchTermWhere.term = termList[0];
  } else if (termList.length > 1) {
    batchTermWhere.term = { [Op.in]: termList };
  }

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
    if (!batchMapping) continue;

    const curriculum = batchMapping.curriculum;
    if (!curriculum) continue;

    const activeTerm = Number(plainTerm.term);

    for (const mapping of curriculum.subjectTermMappings || []) {
      // Subject-term must match the batch-term row for this calendar year
      if (Number(mapping.term) !== activeTerm) continue;

      const subject = mapping.subject;
      if (!subject) continue;

      const key = `${curriculum.courseId}:${mapping.subjectId}:${activeTerm}:${batchMapping.batch}`;
      if (seen.has(key)) continue;
      seen.add(key);

      rows.push({
        subjectId: Number(mapping.subjectId),
        term: activeTerm,
        credit: mapping.credit,
        year: Number(plainTerm.year),
        yearNumber: Number(plainTerm.yearNumber),
        batch: Number(batchMapping.batch),
        curriculumId: Number(curriculum.curriculumId),
        curriculumSubjectTermMappingId: Number(
          mapping.curriculumSubjectTermMappingId,
        ),
        curriculumBatchMappingId: Number(batchMapping.curriculumBatchMappingId),
        curriculumBatchTermMappingId: Number(
          plainTerm.curriculumBatchTermMappingId,
        ),
        curriculumName: curriculum.name,
        courseId: Number(curriculum.courseId),
        academicYearId: resolvedAcademicYearId,
        activeBatchYear,
        subject,
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
        attributes: ["curriculumBatchMappingId", "curriculumId", "batch"],
        required: true,
        include: [
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

    const courseId = Number(batchMapping.curriculum.courseId);
    const term = Number(plain.term);
    const batch = Number(batchMapping.batch);
    const key = `${courseId}_${batch}_${term}`;
    if (seen.has(key)) continue;
    seen.add(key);

    rows.push({
      courseId,
      term,
      batch,
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
