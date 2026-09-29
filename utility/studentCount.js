/** session_course_term_year_batch */
export function buildTermCohortGroupKey(group) {
  if (!group) return "";
  const sId = group.sessionId != null && !isNaN(Number(group.sessionId)) ? Number(group.sessionId) : 0;
  const cId = group.courseId != null && !isNaN(Number(group.courseId)) ? Number(group.courseId) : 0;
  const t = group.term != null && !isNaN(Number(group.term)) ? Number(group.term) : 0;
  const ayId = group.academicYearId != null && !isNaN(Number(group.academicYearId)) ? Number(group.academicYearId) : 0;
  const bId = group.batchId != null && !isNaN(Number(group.batchId)) ? Number(group.batchId) : 0;
  return [sId, cId, t, ayId, bId].join("_");
}

export function normalizeTermCohortGroup(group) {
  return {
    sessionId: group?.sessionId != null && !isNaN(Number(group.sessionId)) ? Number(group.sessionId) : null,
    courseId: group?.courseId != null && !isNaN(Number(group.courseId)) ? Number(group.courseId) : null,
    term: group?.term != null && !isNaN(Number(group.term)) ? Number(group.term) : null,
    academicYearId: group?.academicYearId != null && !isNaN(Number(group.academicYearId)) ? Number(group.academicYearId) : null,
    batchId: group?.batchId != null && !isNaN(Number(group.batchId)) ? Number(group.batchId) : null,
    batchYear: group?.batchYear != null && !isNaN(Number(group.batchYear)) ? Number(group.batchYear) : null,
    yearNumber: group?.yearNumber != null && !isNaN(Number(group.yearNumber)) ? Number(group.yearNumber) : null,
    curriculumBatchTermMappingId:
      group?.curriculumBatchTermMappingId != null && !isNaN(Number(group.curriculumBatchTermMappingId))
        ? Number(group.curriculumBatchTermMappingId)
        : null,
  };
}

/**
 * Term-cohort group from exam_schedule.
 */
export function buildStudentGroupFromSchedule(schedule) {
  const plain = schedule.get ? schedule.get({ plain: true }) : schedule;

  const rawSessionId = plain.batch?.sessionId || plain.sessionId;
  const rawCourseId = plain.subjectSchedule?.courseId || plain.courseId;
  const rawTerm = plain.curriculumSubjectTermMapping?.term || plain.term;

  return {
    sessionId: rawSessionId != null && !isNaN(Number(rawSessionId)) ? Number(rawSessionId) : null,
    courseId: rawCourseId != null && !isNaN(Number(rawCourseId)) ? Number(rawCourseId) : null,
    academicYearId: plain.academicYearId && !isNaN(Number(plain.academicYearId)) ? Number(plain.academicYearId) : null,
    term: rawTerm != null && !isNaN(Number(rawTerm)) ? Number(rawTerm) : null,
    batchId: plain.batchId && !isNaN(Number(plain.batchId)) ? Number(plain.batchId) : null,
    curriculumSubjectTermMappingId: plain.curriculumSubjectTermMappingId && !isNaN(Number(plain.curriculumSubjectTermMappingId))
      ? Number(plain.curriculumSubjectTermMappingId)
      : null,
  };
}

export function lookupStudentCount(countMap, group) {
  if (!countMap || !group) return 0;
  return countMap.get(buildTermCohortGroupKey(group)) || 0;
}
