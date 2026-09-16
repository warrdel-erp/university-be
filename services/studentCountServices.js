import * as curriculumBatchTermRepository from "../repository/curriculumBatchTermRepository.js";
import * as studentCountRepository from "../repository/studentCountRepository.js";
import {
  buildTermCohortGroupKey,
  normalizeTermCohortGroup,
} from "../utility/studentCount.js";

async function enrichTermCohortGroups(groups, options = {}) {
  const needIds = [];
  for (const g of groups) {
    if (
      g.curriculumBatchTermMappingId != null &&
      (g.batchYear == null || g.yearNumber == null)
    ) {
      needIds.push(Number(g.curriculumBatchTermMappingId));
    }
  }
  if (!needIds.length) return groups;

  const rows = await curriculumBatchTermRepository.findEnrichmentByIds(
    needIds,
    options,
  );

  const byId = new Map();
  for (const row of rows) {
    byId.set(row.curriculumBatchTermMappingId, row);
  }

  for (const g of groups) {
    if (g.curriculumBatchTermMappingId == null) continue;
    const ctx = byId.get(Number(g.curriculumBatchTermMappingId));
    if (!ctx) continue;
    g.term = ctx.term;
    g.yearNumber = ctx.yearNumber;
    g.batchYear = ctx.batchYear;
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
      countMap.set(
        buildTermCohortGroupKey(g),
        await studentCountRepository.countTermCohortStudents(g, options),
      );
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
    batchYear: options.batchYear,
    yearNumber: options.yearNumber,
    curriculumBatchTermMappingId: options.curriculumBatchTermMappingId,
  });
  await enrichTermCohortGroups([group], options);
  return studentCountRepository.findTermCohortStudents(group, options);
}
