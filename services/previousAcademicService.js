import * as previousAcademicRepository from '../repository/previousAcademicRepository.js';
import { resolveTotalTerms } from '../utility/courseTerms.js';
import { resolveActiveAcademicYearContext } from '../utility/curriculumSubjectsByActiveYear.js';

async function getActiveYear() {
  const ctx = await resolveActiveAcademicYearContext();
  const activeYearRecord = ctx.academicYear;
  const activeYear = ctx.activeBatchYear;
  const yearTitle =
    activeYearRecord.yearTitle ||
    `${activeYear}-${String(activeYear + 1).slice(-2)}`;
  return { activeYear, yearTitle, activeYearRecord };
}

function emptyBatchesResponse(activeYear, yearTitle, activeYearRecord) {
  return {
    academicYear: {
      academicYearId: activeYearRecord.academicYearId || null,
      yearTitle,
      activeYear,
    },
    summary: {
      totalBatches: 0,
      totalStudents: 0,
      establishedCount: 0,
      requireReviewCount: 0,
      requireSetupCount: 0,
    },
    programmes: [],
  };
}

function aggregateHistoricalByTerm(historicalResults) {
  const historicalResultMap = new Map();
  for (const hr of historicalResults) {
    const termId = Number(hr.curriculumBatchTermMappingId);
    let agg = historicalResultMap.get(termId);
    if (!agg) {
      agg = {
        total: 0,
        frozenCount: 0,
        validatedCount: 0,
        draftCount: 0,
        blockedCount: 0,
      };
      historicalResultMap.set(termId, agg);
    }
    agg.total += 1;
    if (hr.freezeStatus === 'FROZEN' || hr.isFrozen) {
      agg.frozenCount += 1;
    }
    if (hr.freezeStatus === 'VALIDATED') {
      agg.validatedCount += 1;
    }
    if (hr.freezeStatus === 'DRAFT') {
      agg.draftCount += 1;
    }
    if (hr.resultStatus === 'FAIL' || hr.resultStatus === 'WITHHELD') {
      agg.blockedCount += 1;
    }
  }
  return historicalResultMap;
}

export async function getPreviousAcademicBatches(filters = {}) {
  const { activeYear, yearTitle, activeYearRecord } = await getActiveYear();
  const courses = await previousAcademicRepository.findProgrammesWithSessions(filters);

  if (!courses.length) {
    return emptyBatchesResponse(activeYear, yearTitle, activeYearRecord);
  }

  const courseIds = [];
  for (const course of courses) {
    courseIds.push(course.courseId);
  }

  const curriculums = await previousAcademicRepository.getCurriculumBatchMappings(courseIds);
  const regulationMappings =
    await previousAcademicRepository.getAcademicRegulationCourseMappings(courseIds);

  const curriculumMap = new Map();
  const batchTermMappingIds = [];
  const courseMappedBatchesMap = new Map();

  for (const curr of curriculums) {
    const cid = Number(curr.courseId);
    if (!courseMappedBatchesMap.has(cid)) {
      courseMappedBatchesMap.set(cid, new Set());
    }

    for (const bm of curr.batchMappings || []) {
      const batch = Number(bm.batch);
      courseMappedBatchesMap.get(cid).add(batch);
      curriculumMap.set(`${cid}_${batch}`, {
        curriculum: curr,
        batchMapping: bm,
        terms: bm.termMappings || [],
        subjectMappings: curr.subjectTermMappings || [],
      });
      for (const t of bm.termMappings || []) {
        batchTermMappingIds.push(t.curriculumBatchTermMappingId);
      }
    }
  }

  const regulationMap = new Map();
  for (const reg of regulationMappings) {
    regulationMap.set(reg.courseId, reg.academicRegulation);
  }

  const courseDurationMap = new Map();
  const allBatchYearsSet = new Set();

  for (const course of courses) {
    const totalTerms = resolveTotalTerms(course) || 8;
    const duration = Math.ceil(totalTerms / 2) || 4;
    courseDurationMap.set(course.courseId, { totalTerms, duration });

    for (let i = 0; i < duration; i++) {
      allBatchYearsSet.add(activeYear - i);
    }
    const mappedBatches = courseMappedBatchesMap.get(course.courseId);
    if (mappedBatches) {
      for (const b of mappedBatches) {
        allBatchYearsSet.add(b);
      }
    }
  }

  const studentCountMap = await previousAcademicRepository.getBatchStudentCounts(
    courseIds,
    Array.from(allBatchYearsSet),
  );
  const assessmentPlanMappings =
    await previousAcademicRepository.getAssessmentPlanSubjectMappings(
      batchTermMappingIds,
      courseIds,
    );
  const historicalResults =
    await previousAcademicRepository.getHistoricalResultsByTermIds(batchTermMappingIds);

  const apSubjectMap = new Set();
  for (const apm of assessmentPlanMappings) {
    apSubjectMap.add(
      `${apm.courseId}_${apm.sessionId}_${apm.curriculumBatchTermMappingId}_${apm.subjectId}`,
    );
    apSubjectMap.add(
      `${apm.courseId}_${apm.curriculumBatchTermMappingId}_${apm.subjectId}`,
    );
  }

  const historicalResultMap = aggregateHistoricalByTerm(historicalResults);

  let totalBatchesCount = 0;
  let totalStudentsCount = 0;
  let establishedTotal = 0;
  let requireReviewTotal = 0;
  let requireSetupTotal = 0;
  const programmeResults = [];

  for (const course of courses) {
    const { totalTerms, duration } = courseDurationMap.get(course.courseId);
    const regulation = regulationMap.get(course.courseId);

    const sessionList = [];
    for (const mapping of course.sessionCourseMappings || []) {
      if (mapping.session) {
        sessionList.push(mapping.session);
      }
    }
    if (sessionList.length === 0) {
      continue;
    }

    const courseBatchesSet = new Set();
    for (let i = 0; i < duration; i++) {
      courseBatchesSet.add(activeYear - i);
    }
    const mapped = courseMappedBatchesMap.get(course.courseId);
    if (mapped) {
      for (const b of mapped) {
        courseBatchesSet.add(b);
      }
    }

    const courseBatches = Array.from(courseBatchesSet).sort((a, b) => b - a);

    for (const session of sessionList) {
      const sessionId = session.sessionId;
      const sessionName = session.sessionName || `Session ${sessionId}`;
      const batchRows = [];
      let programmeSessionStudents = 0;

      for (const batchYear of courseBatches) {
        const studentCount =
          studentCountMap.get(`${course.courseId}_${sessionId}_${batchYear}`) || 0;
        programmeSessionStudents += studentCount;

        const currData = curriculumMap.get(`${course.courseId}_${batchYear}`);
        const isCurrentBatch = batchYear === activeYear;
        const requiredHistoricalTerms = isCurrentBatch
          ? 0
          : Math.min((activeYear - batchYear) * 2, totalTerms);

        const hasCurriculum = Boolean(currData?.curriculum);
        const hasTermsConfigured = Boolean(currData?.terms?.length >= totalTerms);
        const hasRegulation = Boolean(regulation);

        let currentYearTermFound = false;
        if (isCurrentBatch && currData?.terms) {
          for (const t of currData.terms) {
            if (Number(t.year) === activeYear || Number(t.yearNumber) === 1) {
              currentYearTermFound = true;
              break;
            }
          }
        }

        let subjectsRequired = 0;
        let subjectsConfigured = 0;
        if (currData?.terms && currData?.subjectMappings) {
          for (const t of currData.terms) {
            const isCurrentYearTerm =
              Number(t.year) === activeYear || Number(t.yearNumber) === 1;
            const includeTerm = isCurrentBatch
              ? !currentYearTermFound || isCurrentYearTerm
              : Number(t.term) <= requiredHistoricalTerms;
            if (!includeTerm) {
              continue;
            }
            for (const subj of currData.subjectMappings) {
              if (Number(subj.term) !== Number(t.term)) {
                continue;
              }
              subjectsRequired += 1;
              const specificKey = `${course.courseId}_${sessionId}_${t.curriculumBatchTermMappingId}_${subj.subjectId}`;
              const genericKey = `${course.courseId}_${t.curriculumBatchTermMappingId}_${subj.subjectId}`;
              if (apSubjectMap.has(specificKey) || apSubjectMap.has(genericKey)) {
                subjectsConfigured += 1;
              }
            }
          }
        }

        const hasAssessmentPlans =
          subjectsRequired > 0 && subjectsConfigured >= subjectsRequired;

        let setupReadiness = 'Setup Complete';
        let setupMessage = 'All prerequisites configured.';
        if (!hasCurriculum || !hasTermsConfigured) {
          setupReadiness = 'Needs Setup';
          setupMessage = 'Curriculum structure incomplete.';
        } else if (!hasAssessmentPlans) {
          setupReadiness = 'Needs Attention';
          setupMessage = 'Assessment plans incomplete';
        } else if (!hasRegulation) {
          setupReadiness = 'Needs Setup';
          setupMessage = 'Regulation not linked.';
        }

        let openingPosition = 'Awaiting Setup';
        let statusFilterValues = [openingPosition, setupReadiness];

        if (isCurrentBatch) {
          openingPosition = hasAssessmentPlans
            ? 'Awaiting Setup'
            : setupReadiness;
          statusFilterValues = [openingPosition, setupReadiness];
        } else {
          let frozenTermsCount = 0;
          let blockedStudentsCount = 0;
          let validatedCount = 0;
          if (currData?.terms) {
            for (const t of currData.terms) {
              if (t.term > requiredHistoricalTerms) {
                continue;
              }
              const hrData = historicalResultMap.get(
                Number(t.curriculumBatchTermMappingId),
              );
              if (!hrData) {
                continue;
              }
              if (hrData.frozenCount > 0) {
                frozenTermsCount += 1;
              }
              blockedStudentsCount += hrData.blockedCount;
              validatedCount += hrData.validatedCount;
            }
          }

          if (setupReadiness !== 'Setup Complete') {
            openingPosition = 'Awaiting Setup';
          } else if (frozenTermsCount >= requiredHistoricalTerms && studentCount > 0) {
            openingPosition = 'Established';
          } else if (blockedStudentsCount > 0) {
            openingPosition = 'Awaiting Historical Data';
          } else if (validatedCount > 0) {
            openingPosition = 'Awaiting Historical Data';
          } else {
            openingPosition = 'Awaiting Historical Data';
          }
          statusFilterValues = [openingPosition, setupReadiness];
        }

        if (filters.status && filters.status !== 'All States') {
          let statusMatched = false;
          for (const value of statusFilterValues) {
            if (value === filters.status) {
              statusMatched = true;
              break;
            }
          }
          if (!statusMatched) {
            continue;
          }
        }

        totalBatchesCount += 1;
        totalStudentsCount += studentCount;
        if (openingPosition === 'Established') {
          establishedTotal += 1;
        } else if (setupReadiness === 'Needs Attention') {
          requireReviewTotal += 1;
        } else if (
          setupReadiness === 'Needs Setup' ||
          openingPosition === 'Awaiting Setup' ||
          openingPosition === 'Awaiting Historical Data'
        ) {
          requireSetupTotal += 1;
        }

        let termsConfigured = 0;
        if (currData?.terms && currData?.subjectMappings) {
          for (const t of currData.terms) {
            let hasSubject = false;
            for (const subj of currData.subjectMappings) {
              if (Number(subj.term) === Number(t.term)) {
                hasSubject = true;
                break;
              }
            }
            if (hasSubject) {
              termsConfigured += 1;
            }
          }
        }

        batchRows.push({
          admissionBatch: batchYear,
          isCurrentBatch,
          studentsCount: studentCount,
          curriculumBatchMappingId:
            currData?.batchMapping?.curriculumBatchMappingId || null,
          termsConfigured,
          totalTerms,
          setupReadiness,
          setupMessage,
          openingPosition,
        });
      }

      programmeResults.push({
        courseId: course.courseId,
        courseName: course.courseName,
        courseCode: course.courseCode,
        sessionId,
        sessionName,
        totalBatches: batchRows.length,
        totalStudents: programmeSessionStudents,
        batches: batchRows,
      });
    }
  }

  return {
    academicYear: {
      academicYearId: activeYearRecord.academicYearId || null,
      yearTitle,
      activeYear,
    },
    summary: {
      totalBatches: totalBatchesCount,
      totalStudents: totalStudentsCount,
      establishedCount: establishedTotal,
      requireReviewCount: requireReviewTotal,
      requireSetupCount: requireSetupTotal,
    },
    programmes: programmeResults,
  };
}

export async function getSingleBatchDetails(curriculumBatchMappingId, sessionId = null) {
  const batchMapping = await previousAcademicRepository.findBatchMappingDetails(
    curriculumBatchMappingId,
  );
  if (!batchMapping) {
    const error = new Error(
      `Curriculum batch mapping with ID ${curriculumBatchMappingId} not found`,
    );
    error.statusCode = 404;
    throw error;
  }

  const batch = Number(batchMapping.batch);
  const curriculum = batchMapping.curriculum;
  const course = curriculum?.course;
  const courseId = Number(curriculum?.courseId);

  const { activeYear, yearTitle } = await getActiveYear();

  const sessionMappings = course?.sessionCourseMappings || [];
  let sessionNum = sessionId ? Number(sessionId) : null;
  let sessionName = null;
  for (const mapping of sessionMappings) {
    if (!mapping.session) {
      continue;
    }
    if (sessionNum == null) {
      sessionNum = Number(mapping.session.sessionId);
      sessionName = mapping.session.sessionName;
      break;
    }
    if (Number(mapping.session.sessionId) === sessionNum) {
      sessionName = mapping.session.sessionName;
      break;
    }
  }
  if (sessionNum == null) {
    const error = new Error('No session is mapped to this course');
    error.statusCode = 400;
    throw error;
  }

  const studentCount = await previousAcademicRepository.countBatchStudents(
    courseId,
    sessionNum,
    batch,
  );
  const regMappings =
    await previousAcademicRepository.getAcademicRegulationCourseMappings([courseId]);
  const regulation = regMappings[0]?.academicRegulation || null;

  const totalTerms = resolveTotalTerms(course) || 8;
  const isCurrentBatch = batch === activeYear;
  const requiredHistoricalTerms = isCurrentBatch
    ? 0
    : Math.min((activeYear - batch) * 2, totalTerms);

  const termMappings = [...(batchMapping.termMappings || [])];
  termMappings.sort((a, b) => Number(a.term) - Number(b.term));

  const batchTermMappingIds = [];
  for (const t of termMappings) {
    batchTermMappingIds.push(t.curriculumBatchTermMappingId);
  }

  const apSubjectMappings =
    await previousAcademicRepository.getAssessmentPlanSubjectMappings(
      batchTermMappingIds,
      [courseId],
    );
  const apSubjectSet = new Set();
  for (const apm of apSubjectMappings) {
    apSubjectSet.add(
      `${apm.courseId}_${apm.sessionId}_${apm.curriculumBatchTermMappingId}_${apm.subjectId}`,
    );
    apSubjectSet.add(
      `${apm.courseId}_${apm.curriculumBatchTermMappingId}_${apm.subjectId}`,
    );
  }

  const historicalResults =
    await previousAcademicRepository.getHistoricalResultsByTermIds(batchTermMappingIds);
  const termResultsMap = aggregateHistoricalByTerm(historicalResults);

  const subjectMappings = curriculum?.subjectTermMappings || [];
  let totalHistoricalCoursesRequired = 0;
  let totalHistoricalCoursesConfigured = 0;
  let currentYearCoursesRequired = 0;
  let currentYearCoursesConfigured = 0;
  let frozenTermsCount = 0;
  const previousTerms = [];

  let currentYearTermFound = false;
  for (const termObj of termMappings) {
    if (Number(termObj.year) === activeYear || Number(termObj.yearNumber) === 1) {
      currentYearTermFound = true;
      break;
    }
  }

  for (const termObj of termMappings) {
    const termNum = Number(termObj.term);
    const isHistorical = termNum <= requiredHistoricalTerms;
    const isCurrentYearTerm =
      Number(termObj.year) === activeYear || Number(termObj.yearNumber) === 1;
    const countCurrentYearPlans =
      isCurrentBatch && (!currentYearTermFound || isCurrentYearTerm);
    const cbtmId = Number(termObj.curriculumBatchTermMappingId);
    const calcYear = termObj.year || batch + (termObj.yearNumber || 1) - 1;
    let subjectCount = 0;

    for (const sm of subjectMappings) {
      if (Number(sm.term) !== termNum) {
        continue;
      }
      subjectCount += 1;
      const specificKey = `${courseId}_${sessionNum}_${cbtmId}_${sm.subjectId}`;
      const genericKey = `${courseId}_${cbtmId}_${sm.subjectId}`;
      const isConfigured =
        apSubjectSet.has(specificKey) || apSubjectSet.has(genericKey);
      if (isHistorical) {
        totalHistoricalCoursesRequired += 1;
        if (isConfigured) {
          totalHistoricalCoursesConfigured += 1;
        }
      }
      if (countCurrentYearPlans) {
        currentYearCoursesRequired += 1;
        if (isConfigured) {
          currentYearCoursesConfigured += 1;
        }
      }
    }

    if (!isHistorical) {
      continue;
    }

    const termResultAgg = termResultsMap.get(cbtmId);
    let validation = null;
    let termStatus = 'Not Started';
    let termStatusMessage = 'Template ready';
    let isFrozen = false;

    if (termResultAgg && termResultAgg.total > 0) {
      const readyCount = Math.max(0, studentCount - termResultAgg.blockedCount);
      validation = {
        readyStudents: readyCount,
        totalStudents: studentCount,
        summary: `${readyCount}/${studentCount} ready`,
        blockingCount: termResultAgg.blockedCount,
        warningCount: 0,
      };
      if (termResultAgg.frozenCount >= studentCount && studentCount > 0) {
        termStatus = 'Frozen';
        termStatusMessage = 'Historical data frozen';
        isFrozen = true;
        frozenTermsCount += 1;
      } else if (termResultAgg.blockedCount > 0) {
        termStatus = 'Review Required';
        termStatusMessage = `${termResultAgg.blockedCount} students blocked`;
      } else if (termResultAgg.validatedCount > 0) {
        termStatus = 'Ready to Submit';
        termStatusMessage = `${readyCount}/${studentCount} ready`;
      } else {
        termStatus = 'In Progress';
        termStatusMessage = 'Draft uploaded';
      }
    }

    previousTerms.push({
      curriculumBatchTermMappingId: cbtmId,
      term: termNum,
      termName: `Semester ${termNum}`,
      academicPeriod: `${calcYear}-${String(calcYear + 1).slice(-2)}`,
      yearNumber: termObj.yearNumber,
      year: calcYear,
      subjectCount,
      validation,
      status: termStatus,
      statusMessage: termStatusMessage,
      isFrozen,
    });
  }

  const hasCurriculum = Boolean(curriculum);
  const hasAllTermsConfigured = termMappings.length >= totalTerms;
  const hasRegulation = Boolean(regulation);
  const planRequired = isCurrentBatch
    ? currentYearCoursesRequired
    : totalHistoricalCoursesRequired;
  const planConfigured = isCurrentBatch
    ? currentYearCoursesConfigured
    : totalHistoricalCoursesConfigured;
  const hasAssessmentPlans = planRequired > 0 && planConfigured >= planRequired;

  let setupReadinessStatus = 'Setup Complete';
  let setupReadinessMessage = 'All prerequisites configured.';
  if (!hasCurriculum || !hasAllTermsConfigured) {
    setupReadinessStatus = 'Needs Setup';
    setupReadinessMessage = 'Curriculum structure incomplete.';
  } else if (!hasAssessmentPlans) {
    setupReadinessStatus = 'Needs Attention';
    setupReadinessMessage = 'Assessment plans incomplete';
  } else if (!hasRegulation) {
    setupReadinessStatus = 'Needs Setup';
    setupReadinessMessage = 'Regulation not linked.';
  }

  const assessmentPlanLabel = isCurrentBatch
    ? `${planConfigured}/${planRequired} current courses configured`
    : `${planConfigured}/${planRequired} historical courses configured (Sem 1–${requiredHistoricalTerms})`;

  let openingPosition = 'Awaiting Setup';
  if (isCurrentBatch) {
    openingPosition = hasAssessmentPlans
      ? 'Awaiting Setup'
      : setupReadinessStatus;
  } else if (setupReadinessStatus !== 'Setup Complete') {
    openingPosition = 'Awaiting Setup';
  } else if (frozenTermsCount >= requiredHistoricalTerms && studentCount > 0) {
    openingPosition = 'Established';
  } else {
    openingPosition = 'Awaiting Historical Data';
  }

  const result = {
    batchHeader: {
      admissionBatch: batch,
      courseId,
      courseName: course?.courseName || 'Programme',
      courseCode: course?.courseCode || null,
      sessionId: sessionNum,
      sessionName: sessionName || `Session ${sessionNum}`,
      studentsCount: studentCount,
      academicYear: yearTitle,
      curriculumId: curriculum?.curriculumId,
      curriculumName: curriculum?.name,
      curriculumBatchMappingId,
      openingPosition,
    },
    setupReadiness: {
      status: setupReadinessStatus,
      message: setupReadinessMessage,
      items: {
        batchStudents: {
          label: 'Batch Students',
          value: `${studentCount} students`,
          isComplete: studentCount > 0,
          count: studentCount,
        },
        curriculumStructure: {
          label: 'Curriculum Structure',
          value: `${termMappings.length}/${totalTerms} semesters configured`,
          isComplete: hasAllTermsConfigured,
          configured: termMappings.length,
          total: totalTerms,
        },
        assessmentPlans: {
          label: 'Assessment Plans',
          value: assessmentPlanLabel,
          isComplete: hasAssessmentPlans,
          configured: planConfigured,
          total: planRequired,
        },
        regulation: {
          label: 'Regulation & Academic Rules',
          value: regulation ? regulation.regulationName : 'Not linked',
          isComplete: hasRegulation,
          regulationId: regulation?.academicRegulationId || null,
          regulationName: regulation?.regulationName || null,
        },
      },
    },
    setupDetails: {
      curriculum: hasCurriculum
        ? `${termMappings.length}/${totalTerms} semesters configured`
        : 'Not configured',
      curriculumId: curriculum?.curriculumId || null,
      curriculumName: curriculum?.name || null,
      curriculumBatchMappingId,
      assessmentPlans: assessmentPlanLabel,
      regulation: regulation ? regulation.regulationName : 'Not linked',
      students: studentCount,
    },
    terms: previousTerms,
  };

  return result;
}
