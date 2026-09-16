import { Op } from "sequelize";
import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

export function curriculumBatchTermScheduleInclude() {
  return {
    model: model.curriculumBatchTermMappingModel,
    as: "curriculumBatchTermMapping",
    attributes: [
      "curriculumBatchTermMappingId",
      "term",
      "yearNumber",
      "year",
    ],
    required: false,
    include: [
      {
        model: model.curriculumBatchMappingModel,
        as: "batchMapping",
        attributes: ["curriculumBatchMappingId", "curriculumId", "batch"],
        required: true,
      },
    ],
  };
}

export async function findContextById(curriculumBatchTermMappingId, options = {}) {
  const row = await model.curriculumBatchTermMappingModel.findByPk(
    Number(curriculumBatchTermMappingId),
    {
      attributes: [
        "curriculumBatchTermMappingId",
        "curriculumBatchMappingId",
        "term",
        "yearNumber",
        "year",
      ],
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
              attributes: ["curriculumId", "courseId", "name"],
              required: true,
              where: buildScope(model.curriculumModel),
            },
          ],
        },
      ],
      transaction: options.transaction,
    },
  );

  if (!row) return null;

  const plain = row.get({ plain: true });
  const batchMapping = plain.batchMapping;
  const curriculum = batchMapping.curriculum;

  return {
    curriculumBatchTermMappingId: Number(plain.curriculumBatchTermMappingId),
    curriculumBatchMappingId: Number(plain.curriculumBatchMappingId),
    term: Number(plain.term),
    yearNumber: Number(plain.yearNumber),
    year: Number(plain.year),
    batch: Number(batchMapping.batch),
    curriculumId: Number(curriculum.curriculumId),
    courseId: Number(curriculum.courseId),
    curriculumName: curriculum.name,
  };
}

export async function findSubjectTermMapping(subjectId, curriculumId, term, options = {}) {
  return model.curriculumSubjectTermMappingModel.findOne({
    where: {
      subjectId: Number(subjectId),
      curriculumId: Number(curriculumId),
      term: Number(term),
    },
    attributes: ["curriculumSubjectTermMappingId", "subjectId", "term"],
    transaction: options.transaction,
  });
}

export async function findClassSectionTermIdsByBatchTerm(context, filters = {}, options = {}) {
  if (
    context.courseId == null ||
    context.term == null ||
    context.yearNumber == null
  ) {
    return [];
  }

  const sectionWhere = {
    courseId: Number(context.courseId),
    year: Number(context.yearNumber),
    ...buildScope(model.classSectionModel),
  };
  if (filters.sessionId != null) {
    sectionWhere.sessionId = Number(filters.sessionId);
  }
  if (filters.academicYearId != null) {
    sectionWhere.academicYearId = Number(filters.academicYearId);
  }

  const rows = await model.classSectionTermModel.findAll({
    attributes: ["classSectionTermId"],
    where: { term: Number(context.term) },
    include: [
      {
        model: model.classSectionModel,
        as: "classSection",
        attributes: [],
        required: true,
        where: sectionWhere,
      },
    ],
    transaction: options.transaction,
  });

  const classSectionTermIds = [];
  for (const row of rows) {
    classSectionTermIds.push(Number(row.classSectionTermId));
  }
  return classSectionTermIds;
}

export async function findEnrichmentByIds(curriculumBatchTermMappingIds, options = {}) {
  const ids = [...new Set(curriculumBatchTermMappingIds.map(Number))];
  if (!ids.length) return [];

  const rows = await model.curriculumBatchTermMappingModel.findAll({
    attributes: ["curriculumBatchTermMappingId", "term", "yearNumber", "year"],
    where: {
      curriculumBatchTermMappingId: { [Op.in]: ids },
    },
    include: [
      {
        model: model.curriculumBatchMappingModel,
        as: "batchMapping",
        attributes: ["batch"],
        required: true,
      },
    ],
    transaction: options.transaction,
  });

  const result = [];
  for (const row of rows) {
    const plain = row.get({ plain: true });
    result.push({
      curriculumBatchTermMappingId: Number(plain.curriculumBatchTermMappingId),
      term: Number(plain.term),
      yearNumber: Number(plain.yearNumber),
      year: Number(plain.year),
      batchYear: Number(plain.batchMapping.batch),
    });
  }
  return result;
}

export async function findStudentsByBatchAndClassSectionTerms(
  context,
  classSectionTermIds,
  filters = {},
  options = {},
) {
  const where = {
    courseId: Number(context.courseId),
    batchYear: Number(context.batch),
    classSectionTermId: { [Op.in]: classSectionTermIds },
  };
  if (filters.sessionId != null) {
    where.sessionId = Number(filters.sessionId);
  }

  return scoped(model.studentModel).findAll({
    attributes: [
      "studentId",
      "firstName",
      "middleName",
      "lastName",
      "scholarNumber",
      "enrollNumber",
      "fatherName",
      "classSectionTermId",
      "batchYear",
      "courseId",
      "sessionId",
    ],
    where,
    order: [["firstName", "ASC"]],
    transaction: options.transaction,
  });
}
