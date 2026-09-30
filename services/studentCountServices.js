import { Op } from "sequelize";
import * as model from "../models/index.js";
import * as studentCountRepository from "../repository/studentCountRepository.js";
import {
  buildTermCohortGroupKey,
  normalizeTermCohortGroup,
} from "../utility/studentCount.js";

async function enrichTermCohortGroups(groups, options = {}) {
  const cstmIds = [];
  for (const g of groups) {
    if (g.curriculumSubjectTermMappingId != null) {
      cstmIds.push(Number(g.curriculumSubjectTermMappingId));
    }
  }
  const uniqueCstmIds = [...new Set(cstmIds.filter(Boolean))];
  if (!uniqueCstmIds.length) return groups;

  const rows = await model.curriculumSubjectTermMappingModel.findAll({
    where: { curriculumSubjectTermMappingId: { [Op.in]: uniqueCstmIds } },
    attributes: ["curriculumSubjectTermMappingId", "term"],
    raw: true,
    transaction: options.transaction,
  });

  const termByCstmId = new Map();
  for (const row of rows) {
    termByCstmId.set(
      Number(row.curriculumSubjectTermMappingId),
      Number(row.term),
    );
  }

  for (const g of groups) {
    if (g.curriculumSubjectTermMappingId == null) continue;
    const resolvedTerm = termByCstmId.get(
      Number(g.curriculumSubjectTermMappingId),
    );
    if (resolvedTerm != null && !isNaN(resolvedTerm)) {
      g.term = resolvedTerm;
    }
  }

  return groups;
}

/** Single source of truth for term-cohort studentCount. */
export async function countStudentsForTermCohort(group, options = {}) {
  const [enriched] = await enrichTermCohortGroups(
    [normalizeTermCohortGroup(group)],
    options,
  );
  return studentCountRepository.countTermCohortStudents(enriched, options);
}

export async function getStudentCountMapByGroups(groups, options = {}) {
  const countMap = new Map();
  const unique = [];
  const seen = new Set();

  const normalized = [];
  for (const g of groups) {
    normalized.push(normalizeTermCohortGroup(g));
  }

  await enrichTermCohortGroups(normalized, options);

  for (const g of normalized) {
    const key = buildTermCohortGroupKey(g);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(g);
  }

  await Promise.all(
    unique.map(async (g) => {
      const count = await studentCountRepository.countTermCohortStudents(
        g,
        options,
      );
      countMap.set(buildTermCohortGroupKey(g), count);
      if (g.curriculumSubjectTermMappingId && g.batchId) {
        countMap.set(
          `cstm_${Number(g.curriculumSubjectTermMappingId)}_batch_${Number(g.batchId)}`,
          count,
        );
      }
      if (g.batchId && g.term) {
        countMap.set(`batch_${Number(g.batchId)}_term_${Number(g.term)}`, count);
      }
      const fallbackKey = [
        g.sessionId || 0,
        g.courseId || 0,
        g.term || 0,
        g.batchId || 0,
      ].join("_");
      countMap.set(fallbackKey, count);
    }),
  );

  return countMap;
}

export async function countStudentsForExamGroup(
  sessionId,
  courseId,
  term,
  academicYearId,
  options = {},
) {
  return countStudentsForTermCohort(
    {
      sessionId,
      courseId,
      term,
      academicYearId,
      batchId: options.batchId,
      batchYear: options.batchYear,
      yearNumber: options.yearNumber,
      curriculumBatchTermMappingId: options.curriculumBatchTermMappingId,
    },
    options,
  );
}

export async function findStudentsForExamGroup(
  sessionId,
  courseId,
  term,
  academicYearId,
  options = {},
) {
  const group = normalizeTermCohortGroup({
    sessionId,
    courseId,
    term,
    academicYearId,
    batchId: options.batchId,
    batchYear: options.batchYear,
    yearNumber: options.yearNumber,
    curriculumBatchTermMappingId: options.curriculumBatchTermMappingId,
  });
  await enrichTermCohortGroups([group], options);
  return studentCountRepository.findTermCohortStudents(group, options);
}
