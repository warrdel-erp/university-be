/** session_course_term_year */
export function buildTermCohortGroupKey(group) {
  if (!group) return "";
  return [
    Number(group.sessionId),
    Number(group.courseId),
    Number(group.term),
    Number(group.academicYearId),
  ].join("_");
}

export function normalizeTermCohortGroup(group) {
  return {
    sessionId: Number(group.sessionId),
    courseId: Number(group.courseId),
    term: Number(group.term),
    academicYearId: Number(group.academicYearId),
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

  return {
    sessionId: Number(plain.sessionId),
    courseId: Number(plain.subjectSchedule?.courseId || plain.courseId),
    academicYearId: Number(plain.academicYearId),
    term: Number(cbtm ? cbtm.term : plain.term),
    curriculumBatchTermMappingId: plain.curriculumBatchTermMappingId
      ? Number(plain.curriculumBatchTermMappingId)
      : null,
  };
}

export function lookupStudentCount(countMap, group) {
  if (!countMap || !group) return 0;
  return countMap.get(buildTermCohortGroupKey(group)) || 0;
}
