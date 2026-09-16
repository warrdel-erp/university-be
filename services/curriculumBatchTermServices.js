import * as curriculumBatchTermRepository from "../repository/curriculumBatchTermRepository.js";

/** Load CBTM → term, batch, yearNumber, courseId. */
export async function resolveCurriculumBatchTermContext(
  curriculumBatchTermMappingId,
  options = {},
) {
  const context = await curriculumBatchTermRepository.findContextById(
    curriculumBatchTermMappingId,
    options,
  );

  if (!context) {
    const err = new Error(
      `Curriculum Batch Term Mapping (ID: ${Number(curriculumBatchTermMappingId)}) does not exist`,
    );
    err.statusCode = 404;
    throw err;
  }

  return context;
}

/** Subject must be on the CBTM curriculum at the same term. */
export async function assertSubjectOnCurriculumBatchTerm(
  subjectId,
  context,
  options = {},
) {
  const mapping = await curriculumBatchTermRepository.findSubjectTermMapping(
    subjectId,
    context.curriculumId,
    context.term,
    options,
  );

  if (!mapping) {
    const err = new Error(
      `Subject (ID: ${subjectId}) is not mapped to curriculum term ${context.term} for this batch`,
    );
    err.statusCode = 400;
    throw err;
  }

  return mapping.get({ plain: true });
}

/** class_section_term ids for course + yearNumber + term (+ optional session/year). */
export async function resolveClassSectionTermIdsFromBatchTerm(
  context,
  filters = {},
  options = {},
) {
  return curriculumBatchTermRepository.findClassSectionTermIdsByBatchTerm(
    context,
    filters,
    options,
  );
}

/**
 * Apply CBTM as source of truth onto exam schedule payload.
 * Zod already requires subjectId + curriculumBatchTermMappingId.
 */
export async function applyCurriculumBatchTermToExamDetail(
  examDetail,
  options = {},
) {
  const context = await resolveCurriculumBatchTermContext(
    examDetail.curriculumBatchTermMappingId,
    options,
  );

  await assertSubjectOnCurriculumBatchTerm(
    examDetail.subjectId,
    context,
    options,
  );

  if (
    examDetail.courseId != null &&
    Number(examDetail.courseId) !== context.courseId
  ) {
    const err = new Error(
      `courseId ${examDetail.courseId} does not match curriculum course ${context.courseId} for this batch term`,
    );
    err.statusCode = 400;
    throw err;
  }

  examDetail.curriculumBatchTermMappingId = context.curriculumBatchTermMappingId;
  examDetail.term = context.term;
  examDetail.courseId = context.courseId;

  return context;
}

export async function findStudentsForCurriculumBatchTerm(
  context,
  filters = {},
  options = {},
) {
  const classSectionTermIds =
    await curriculumBatchTermRepository.findClassSectionTermIdsByBatchTerm(
      context,
      filters,
      options,
    );
  if (!classSectionTermIds.length) return [];

  return curriculumBatchTermRepository.findStudentsByBatchAndClassSectionTerms(
    context,
    classSectionTermIds,
    filters,
    options,
  );
}
