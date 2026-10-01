export function buildTermCohortGroupKey(group) {
  if (!group) return "";
  const cstmId =
    group.curriculumSubjectTermMappingId != null &&
    !isNaN(Number(group.curriculumSubjectTermMappingId))
      ? Number(group.curriculumSubjectTermMappingId)
      : group.curriculumBatchTermMappingId != null &&
          !isNaN(Number(group.curriculumBatchTermMappingId))
        ? Number(group.curriculumBatchTermMappingId)
        : 0;
  const bId =
    group.batchId != null && !isNaN(Number(group.batchId))
      ? Number(group.batchId)
      : 0;
  const t =
    group.term != null && !isNaN(Number(group.term)) ? Number(group.term) : 0;

  if (cstmId > 0 && bId > 0) {
    return `cstm_${cstmId}_batch_${bId}`;
  }
  if (bId > 0 && t > 0) {
    return `batch_${bId}_term_${t}`;
  }

  const sId =
    group.sessionId != null && !isNaN(Number(group.sessionId))
      ? Number(group.sessionId)
      : 0;
  const cId =
    group.courseId != null && !isNaN(Number(group.courseId))
      ? Number(group.courseId)
      : 0;
  return [sId, cId, t, bId].join("_");
}

export function normalizeTermCohortGroup(group) {
  const cstmId =
    group?.curriculumSubjectTermMappingId != null &&
    !isNaN(Number(group.curriculumSubjectTermMappingId))
      ? Number(group.curriculumSubjectTermMappingId)
      : group?.curriculumBatchTermMappingId != null &&
          !isNaN(Number(group.curriculumBatchTermMappingId))
        ? Number(group.curriculumBatchTermMappingId)
        : null;

  return {
    sessionId:
      group?.sessionId != null && !isNaN(Number(group.sessionId))
        ? Number(group.sessionId)
        : null,
    courseId:
      group?.courseId != null && !isNaN(Number(group.courseId))
        ? Number(group.courseId)
        : null,
    term:
      group?.term != null && !isNaN(Number(group.term))
        ? Number(group.term)
        : null,
    academicYearId:
      group?.academicYearId != null && !isNaN(Number(group.academicYearId))
        ? Number(group.academicYearId)
        : null,
    batchId:
      group?.batchId != null && !isNaN(Number(group.batchId))
        ? Number(group.batchId)
        : null,
    batchYear:
      group?.batchYear != null && !isNaN(Number(group.batchYear))
        ? Number(group.batchYear)
        : null,
    yearNumber:
      group?.yearNumber != null && !isNaN(Number(group.yearNumber))
        ? Number(group.yearNumber)
        : null,
    curriculumSubjectTermMappingId: cstmId,
    curriculumBatchTermMappingId: cstmId,
  };
}

/**
 * Term-cohort group from exam_schedule.
 */
export function buildStudentGroupFromSchedule(schedule, fallback = {}) {
  const plain = schedule.get ? schedule.get({ plain: true }) : schedule;

  const rawSessionId =
    plain.batch?.sessionId ?? plain.sessionId ?? fallback?.sessionId;
  const rawCourseId =
    plain.subjectSchedule?.courseId ?? plain.courseId ?? fallback?.courseId;
  const rawTerm =
    plain.curriculumSubjectTermMapping?.term ?? plain.term ?? fallback?.term;
  const rawBatchId =
    plain.batchId ?? plain.batch?.batchId ?? fallback?.batchId;
  const rawCstmId =
    plain.curriculumSubjectTermMappingId ??
    plain.curriculumSubjectTermMapping?.curriculumSubjectTermMappingId ??
    plain.curriculumBatchTermMappingId ??
    fallback?.curriculumSubjectTermMappingId;

  return {
    sessionId:
      rawSessionId != null && !isNaN(Number(rawSessionId))
        ? Number(rawSessionId)
        : null,
    courseId:
      rawCourseId != null && !isNaN(Number(rawCourseId))
        ? Number(rawCourseId)
        : null,
    term:
      rawTerm != null && !isNaN(Number(rawTerm)) ? Number(rawTerm) : null,
    batchId:
      rawBatchId != null && !isNaN(Number(rawBatchId))
        ? Number(rawBatchId)
        : null,
    curriculumSubjectTermMappingId:
      rawCstmId != null && !isNaN(Number(rawCstmId))
        ? Number(rawCstmId)
        : null,
    curriculumBatchTermMappingId:
      rawCstmId != null && !isNaN(Number(rawCstmId))
        ? Number(rawCstmId)
        : null,
  };
}

export function lookupStudentCount(countMap, group) {
  if (!countMap || !group) return 0;
  const cstmId =
    group.curriculumSubjectTermMappingId != null &&
    !isNaN(Number(group.curriculumSubjectTermMappingId))
      ? Number(group.curriculumSubjectTermMappingId)
      : group.curriculumBatchTermMappingId != null &&
          !isNaN(Number(group.curriculumBatchTermMappingId))
        ? Number(group.curriculumBatchTermMappingId)
        : 0;
  const bId =
    group.batchId != null && !isNaN(Number(group.batchId))
      ? Number(group.batchId)
      : 0;
  const t =
    group.term != null && !isNaN(Number(group.term)) ? Number(group.term) : 0;

  if (cstmId > 0 && bId > 0 && countMap.has(`cstm_${cstmId}_batch_${bId}`)) {
    return countMap.get(`cstm_${cstmId}_batch_${bId}`) || 0;
  }
  if (bId > 0 && t > 0 && countMap.has(`batch_${bId}_term_${t}`)) {
    return countMap.get(`batch_${bId}_term_${t}`) || 0;
  }
  return countMap.get(buildTermCohortGroupKey(group)) || 0;
}
