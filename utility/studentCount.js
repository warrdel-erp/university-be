/** session_course_term_year[_batch][_yearNumber][_cbtm] */
export function buildTermCohortGroupKey(group) {
  return [
    Number(group.sessionId),
    Number(group.courseId),
    Number(group.term),
    Number(group.academicYearId),
    group.batchYear != null ? Number(group.batchYear) : "",
    group.yearNumber != null ? Number(group.yearNumber) : "",
    group.curriculumBatchTermMappingId != null
      ? Number(group.curriculumBatchTermMappingId)
      : "",
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
 * When curriculumBatchTermMapping is loaded, term/batch/yearNumber come from it.
 */
export function buildStudentGroupFromSchedule(schedule) {
  const plain = schedule.get ? schedule.get({ plain: true }) : schedule;
  const cbtm = plain.curriculumBatchTermMapping;

  return {
    sessionId: Number(plain.sessionId),
    courseId: Number(plain.subjectSchedule.courseId),
    academicYearId: Number(plain.academicYearId),
    term: Number(cbtm ? cbtm.term : plain.term),
    batchYear: cbtm ? Number(cbtm.batchMapping.batch) : null,
    yearNumber: cbtm ? Number(cbtm.yearNumber) : null,
    curriculumBatchTermMappingId: plain.curriculumBatchTermMappingId
      ? Number(plain.curriculumBatchTermMappingId)
      : null,
  };
}

export function lookupStudentCount(countMap, group) {
  return countMap.get(buildTermCohortGroupKey(group)) || 0;
}
