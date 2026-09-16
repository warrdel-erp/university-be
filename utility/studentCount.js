/** session_course_term_year_batch (or CBTM when batch unknown) */
export function buildTermCohortGroupKey(group) {
  if (!group) return "";
  const batchPart =
    group.batchYear != null
      ? Number(group.batchYear)
      : group.curriculumBatchTermMappingId != null
        ? `c${Number(group.curriculumBatchTermMappingId)}`
        : 0;
  return [
    Number(group.sessionId),
    Number(group.courseId),
    Number(group.term),
    Number(group.academicYearId),
    batchPart,
  ].join("_");
}

export function normalizeTermCohortGroup(group) {
  return {
    sessionId: Number(group.sessionId),
    courseId: Number(group.courseId),
    term: Number(group.term),
    academicYearId: Number(group.academicYearId),
    batchYear: group.batchYear != null ? Number(group.batchYear) : null,
    yearNumber: group.yearNumber != null ? Number(group.yearNumber) : null,
    curriculumBatchTermMappingId:
      group.curriculumBatchTermMappingId != null
        ? Number(group.curriculumBatchTermMappingId)
        : null,
  };
}

/**
 * Term-cohort group from exam_schedule.
 */
export function buildStudentGroupFromSchedule(schedule) {
  const plain = schedule.get ? schedule.get({ plain: true }) : schedule;
  const cbtm = plain.curriculumBatchTermMapping;
  const batchMapping = cbtm?.batchMapping;

  return {
    sessionId: Number(plain.sessionId),
    courseId: Number(plain.subjectSchedule?.courseId || plain.courseId),
    academicYearId: Number(plain.academicYearId),
    term: Number(cbtm ? cbtm.term : plain.term),
    yearNumber: cbtm?.yearNumber != null ? Number(cbtm.yearNumber) : null,
    batchYear:
      batchMapping?.batch != null
        ? Number(batchMapping.batch)
        : plain.batchYear != null
          ? Number(plain.batchYear)
          : null,
    curriculumBatchTermMappingId: plain.curriculumBatchTermMappingId
      ? Number(plain.curriculumBatchTermMappingId)
      : null,
  };
}

export function lookupStudentCount(countMap, group) {
  if (!countMap || !group) return 0;
  return countMap.get(buildTermCohortGroupKey(group)) || 0;
}
