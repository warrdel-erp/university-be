import * as previousAcademicRepository from '../repository/previousAcademicRepository.js';
import { resolveTotalTerms } from '../utility/courseTerms.js';
import { resolveActiveAcademicYearContext } from '../utility/curriculumSubjectsByActiveYear.js';
import sequelize from '../database/sequelizeConfig.js';
import xlsx from 'xlsx';
import {
  decimalAdd,
  decimalGreaterThan,
  parseMoneyInput,
  toMoneyNumber,
} from '../utility/decimalMoney.js';
import { getTenantStore } from '../utility/requestContext.js';

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

function aggregateMarksByCstm(marks) {
  const marksByCstm = new Map();
  for (const item of marks) {
    const cstmId = Number(item.curriculumSubjectTermMappingId);
    let agg = marksByCstm.get(cstmId);
    if (!agg) {
      agg = { total: 0, students: new Set() };
      marksByCstm.set(cstmId, agg);
    }
    agg.total += 1;
    agg.students.add(Number(item.studentId));
  }
  return marksByCstm;
}

function termAggFromSubjectMappings(subjectMappings, termNum, marksByCstm) {
  let total = 0;
  const students = new Set();
  for (const sm of subjectMappings || []) {
    if (Number(sm.term) !== Number(termNum)) {
      continue;
    }
    const agg = marksByCstm.get(Number(sm.curriculumSubjectTermMappingId));
    if (!agg) {
      continue;
    }
    total += agg.total;
    for (const studentId of agg.students) {
      students.add(studentId);
    }
  }
  if (total === 0) {
    return null;
  }
  return {
    total,
    frozenCount: 0,
    validatedCount: 0,
    draftCount: total,
    blockedCount: 0,
    studentCount: students.size,
  };
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
  const cstmIds = [];
  for (const curr of curriculums) {
    for (const sm of curr.subjectTermMappings || []) {
      cstmIds.push(sm.curriculumSubjectTermMappingId);
    }
  }
  const historicalMarks =
    await previousAcademicRepository.getHistoricalMarksByCstmIds(cstmIds);
  const marksByCstm = aggregateMarksByCstm(historicalMarks);

  const apSubjectMap = new Set();
  for (const apm of assessmentPlanMappings) {
    apSubjectMap.add(
      `${apm.courseId}_${apm.sessionId}_${apm.curriculumBatchTermMappingId}_${apm.subjectId}`,
    );
    apSubjectMap.add(
      `${apm.courseId}_${apm.curriculumBatchTermMappingId}_${apm.subjectId}`,
    );
  }

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
        const hasRegulation = Boolean(regulation);

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
        const hasTermsConfigured = termsConfigured >= totalTerms;

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
              const hrData = termAggFromSubjectMappings(
                currData.subjectMappings,
                t.term,
                marksByCstm,
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

  const curriculum = batchMapping.curriculum;
  const course = curriculum.course;
  const batch = Number(batchMapping.batch);
  const courseId = Number(curriculum.courseId);
  const { activeYear } = await getActiveYear();
  const totalTerms = resolveTotalTerms(course) || 8;
  const requiredHistoricalTerms =
    batch === activeYear ? 0 : Math.min((activeYear - batch) * 2, totalTerms);

  const termMappings = batchMapping.termMappings || [];
  const subjectMappings = curriculum.subjectTermMappings || [];
  const batchTermMappingIds = [];
  const cstmIds = [];
  for (const t of termMappings) {
    batchTermMappingIds.push(t.curriculumBatchTermMappingId);
  }
  for (const sm of subjectMappings) {
    cstmIds.push(sm.curriculumSubjectTermMappingId);
  }

  const studentCount = await previousAcademicRepository.countBatchStudents(
    courseId,
    sessionId,
    batch,
  );
  const apSubjectMappings =
    await previousAcademicRepository.getAssessmentPlanSubjectMappings(
      batchTermMappingIds,
      [courseId],
    );
  const historicalMarks =
    await previousAcademicRepository.getHistoricalMarksByCstmIds(cstmIds);

  const apKeys = new Set();
  for (const apm of apSubjectMappings) {
    apKeys.add(`${apm.curriculumBatchTermMappingId}_${apm.subjectId}`);
  }
  const markedCstmIds = new Set();
  for (const item of historicalMarks) {
    markedCstmIds.add(Number(item.curriculumSubjectTermMappingId));
  }

  const terms = [];
  let subjectsRequired = 0;
  let subjectsWithPlan = 0;
  let termsConfigured = 0;
  for (const termObj of termMappings) {
    const termNum = Number(termObj.term);
    let hasSubject = false;
    for (const sm of subjectMappings) {
      if (Number(sm.term) === termNum) {
        hasSubject = true;
        break;
      }
    }
    if (hasSubject) {
      termsConfigured += 1;
    }
  }

  for (const termObj of termMappings) {
    const termNum = Number(termObj.term);
    if (termNum > requiredHistoricalTerms) {
      continue;
    }

    const cbtmId = Number(termObj.curriculumBatchTermMappingId);
    const subjects = [];
    let hasMarks = false;
    for (const sm of subjectMappings) {
      if (Number(sm.term) !== termNum) {
        continue;
      }
      subjectsRequired += 1;
      if (apKeys.has(`${cbtmId}_${sm.subjectId}`)) {
        subjectsWithPlan += 1;
      }
      if (markedCstmIds.has(Number(sm.curriculumSubjectTermMappingId))) {
        hasMarks = true;
      }
      subjects.push({
        subjectId: sm.subjectId,
        subjectCode: sm.subject.subjectCode,
        subjectName: sm.subject.subjectName,
      });
    }

    terms.push({
      curriculumBatchTermMappingId: cbtmId,
      term: termNum,
      termName: `Semester ${termNum}`,
      yearNumber: termObj.yearNumber,
      year: termObj.year,
      subjectCount: subjects.length,
      status: hasMarks ? 'In Progress' : 'Not Started',
      subjects,
    });
  }

  const hasAssessmentPlans = subjectsRequired > 0 && subjectsWithPlan >= subjectsRequired;
  let setupReadiness = 'Setup Complete';
  if (termsConfigured < totalTerms) {
    setupReadiness = 'Needs Setup';
  } else if (!hasAssessmentPlans) {
    setupReadiness = 'Needs Attention';
  }

  let openingPosition = 'Awaiting Setup';
  if (setupReadiness === 'Setup Complete') {
    openingPosition = 'Awaiting Historical Data';
  } else if (batch === activeYear && hasAssessmentPlans) {
    openingPosition = 'Awaiting Setup';
  } else {
    openingPosition = setupReadiness;
  }

  return {
    admissionBatch: batch,
    courseId,
    courseName: course.courseName,
    courseCode: course.courseCode,
    sessionId: sessionId ? Number(sessionId) : null,
    studentsCount: studentCount,
    curriculumId: curriculum.curriculumId,
    curriculumName: curriculum.name,
    curriculumBatchMappingId,
    openingPosition,
    setupReadiness,
    setupDetails: {
      curriculum: `${termsConfigured}/${totalTerms} semesters configured`,
      curriculumId: curriculum.curriculumId,
      curriculumName: curriculum.name,
      curriculumBatchMappingId,
      assessmentPlans: `${subjectsWithPlan}/${subjectsRequired} courses configured`,
      students: studentCount,
    },
    terms,
  };
}

function studentFullName(student) {
  const parts = [student.firstName, student.middleName, student.lastName];
  const nameParts = [];
  for (const part of parts) {
    if (part) {
      nameParts.push(part);
    }
  }
  return nameParts.join(' ').trim();
}

function componentMaximumMarks(component) {
  const weightage = toMoneyNumber(component.weightagePercentage);
  if (weightage > 0) {
    return weightage;
  }
  return 100;
}

function normalizeLabel(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[·•]/g, ' ')
    .replace(/[._-]/g, ' ')
    .replace(/\s+/g, ' ');
}

function isSkipExamHeader(label) {
  return label === 'total';
}

function isCreditHeader(label) {
  return (
    label === 'credits earned' ||
    label === 'credit earned' ||
    label === 'credits'
  );
}

function isStudentHeader(label) {
  return (
    label === 'student' ||
    label === 'student id' ||
    label === 'studentid' ||
    label === 'stable id' ||
    label === 'scholar no' ||
    label === 'scholar no.' ||
    label === 'enrollment' ||
    label === 'enrolment' ||
    label === 'enroll number' ||
    label === 'student name' ||
    label === 'full name' ||
    label === 'name' ||
    label === 'reference'
  );
}

function parseSubjectHeader(raw) {
  const text = String(raw || '').trim();
  if (!text) {
    return null;
  }
  const withoutCredit = text.replace(/\s*[·•]\s*\d+(\.\d+)?\s*cr\s*$/i, '').trim();
  const separatorIndex = withoutCredit.indexOf(' - ');
  if (separatorIndex > 0) {
    return {
      subjectCode: withoutCredit.slice(0, separatorIndex).trim(),
      subjectName: withoutCredit.slice(separatorIndex + 3).trim(),
    };
  }
  return {
    subjectCode: null,
    subjectName: withoutCredit,
  };
}

function cellText(value) {
  if (value == null || value === '') {
    return '';
  }
  return String(value).trim();
}

async function loadTermMarksContext(curriculumBatchTermMappingId, sessionId = null) {
  const termMapping = await previousAcademicRepository.findTermMappingWithBatch(
    curriculumBatchTermMappingId,
  );
  if (!termMapping) {
    const error = new Error(
      `Curriculum batch term mapping with ID ${curriculumBatchTermMappingId} not found`,
    );
    error.statusCode = 404;
    throw error;
  }

  const batchMapping = termMapping.batchMapping;
  const curriculum = batchMapping.curriculum;
  const course = curriculum.course;
  const batch = Number(batchMapping.batch);
  const courseId = Number(curriculum.courseId);
  const curriculumId = Number(curriculum.curriculumId);
  const term = Number(termMapping.term);

  const studentRows = await previousAcademicRepository.findStudentsByCourseBatch(
    courseId,
    batch,
    sessionId,
  );
  const apMappings =
    await previousAcademicRepository.findAssessmentPlanSubjectsForTerm(
      curriculumBatchTermMappingId,
      sessionId,
    );
  const cstmRows =
    await previousAcademicRepository.findSubjectTermMappingsByCurriculumTerm(
      curriculumId,
      term,
    );

  const cstmBySubjectId = new Map();
  for (const row of cstmRows) {
    cstmBySubjectId.set(Number(row.subjectId), row);
  }

  const subjects = [];
  const seenSubjects = new Set();
  const cstmIds = [];
  for (const mapping of apMappings) {
    const subjectId = Number(mapping.subjectId);
    if (seenSubjects.has(subjectId)) {
      continue;
    }
    seenSubjects.add(subjectId);

    const cstm = cstmBySubjectId.get(subjectId);
    if (!cstm) {
      continue;
    }

    const curriculumSubjectTermMappingId = Number(cstm.curriculumSubjectTermMappingId);
    cstmIds.push(curriculumSubjectTermMappingId);

    const examSetupTypes = [];
    const seenExamTypes = new Set();
    for (const component of mapping.assessmentPlan.components) {
      const examSetupTypeId = Number(component.examSetupTypeId);
      if (seenExamTypes.has(examSetupTypeId)) {
        continue;
      }
      seenExamTypes.add(examSetupTypeId);
      examSetupTypes.push({
        examSetupTypeId,
        examName: component.examSetupType.examName,
        examCode: component.examSetupType.examCode,
        assessmentPlanComponentId: Number(component.assessmentPlanComponentId),
        maximumMarks: componentMaximumMarks(component),
      });
    }
    if (examSetupTypes.length === 0) {
      continue;
    }

    subjects.push({
      subjectId,
      subjectCode: mapping.subject.subjectCode,
      subjectName: mapping.subject.subjectName,
      assessmentPlanId: mapping.assessmentPlanId,
      curriculumSubjectTermMappingId,
      credit: Number(cstm.credit) || 0,
      examSetupTypes,
    });
  }

  const existingItems =
    await previousAcademicRepository.getHistoricalMarksByCstmIds(cstmIds);
  const marksByKey = new Map();
  for (const item of existingItems) {
    marksByKey.set(
      `${item.studentId}_${item.curriculumSubjectTermMappingId}_${item.assessmentPlanComponentId}`,
      item,
    );
  }

  const students = [];
  for (const student of studentRows) {
    const marks = [];
    for (const subject of subjects) {
      for (const examType of subject.examSetupTypes) {
        const existing = marksByKey.get(
          `${student.studentId}_${subject.curriculumSubjectTermMappingId}_${examType.assessmentPlanComponentId}`,
        );
        marks.push({
          curriculumSubjectTermMappingId: subject.curriculumSubjectTermMappingId,
          assessmentPlanComponentId: examType.assessmentPlanComponentId,
          obtainedMarks: existing ? toMoneyNumber(existing.obtainedMarks) : null,
          maximumMarks: examType.maximumMarks,
          creditEarned: existing ? toMoneyNumber(existing.creditEarned) : null,
        });
      }
    }
    let sessionName = null;
    if (student.studentSession) {
      sessionName = student.studentSession.sessionName;
    }
    students.push({
      studentId: student.studentId,
      firstName: student.firstName,
      fullName: studentFullName(student),
      enrollment: student.enrollNumber,
      scholarNo: student.scholarNumber,
      batch: student.batchYear,
      sessionId: student.sessionId ? Number(student.sessionId) : null,
      sessionName,
      marks,
    });
  }

  return {
    curriculumBatchTermMappingId: Number(termMapping.curriculumBatchTermMappingId),
    term,
    year: termMapping.year,
    yearNumber: termMapping.yearNumber,
    batch,
    courseId,
    curriculumId,
    sessionId,
    courseName: course.courseName,
    courseCode: course.courseCode,
    students,
    subjects,
    marksByKey,
  };
}

export async function getTermMarksTemplate(curriculumBatchTermMappingId, sessionId = null) {
  const context = await loadTermMarksContext(curriculumBatchTermMappingId, sessionId);
  return {
    curriculumBatchTermMappingId: context.curriculumBatchTermMappingId,
    term: context.term,
    year: context.year,
    yearNumber: context.yearNumber,
    batch: context.batch,
    courseId: context.courseId,
    sessionId: context.sessionId,
    students: context.students,
    subjects: context.subjects,
  };
}

function buildStudentTermReview(student, context) {
  const termLabel = `Semester ${context.term}`;
  const issues = [];
  const subjects = [];
  let missingCount = 0;

  for (const subject of context.subjects) {
    const assessments = [];
    let totalObtainedMarks = 0;
    let totalMaximumMarks = 0;

    for (const examType of subject.examSetupTypes) {
      const existing = context.marksByKey.get(
        `${student.studentId}_${subject.curriculumSubjectTermMappingId}_${examType.assessmentPlanComponentId}`,
      );
      const obtainedMarks = existing ? toMoneyNumber(existing.obtainedMarks) : null;
      const maximumMarks = examType.maximumMarks;
      totalMaximumMarks = decimalAdd(totalMaximumMarks, maximumMarks);

      if (obtainedMarks == null) {
        missingCount += 1;
        issues.push({
          type: 'warning',
          code: 'MARKS_MISSING',
          message: `${examType.examName} result missing`,
          subjectId: subject.subjectId,
          subjectCode: subject.subjectCode,
          subjectName: subject.subjectName,
          examName: examType.examName,
          assessmentPlanComponentId: examType.assessmentPlanComponentId,
        });
      } else {
        totalObtainedMarks = decimalAdd(totalObtainedMarks, obtainedMarks);
        if (decimalGreaterThan(obtainedMarks, maximumMarks)) {
          issues.push({
            type: 'warning',
            code: 'MARKS_EXCEED_MAXIMUM',
            message: `${examType.examName} obtained marks exceed maximum ${maximumMarks}`,
            subjectId: subject.subjectId,
            subjectCode: subject.subjectCode,
            subjectName: subject.subjectName,
            examName: examType.examName,
            assessmentPlanComponentId: examType.assessmentPlanComponentId,
            obtainedMarks,
            maximumMarks,
          });
        }
      }

      assessments.push({
        examSetupTypeId: examType.examSetupTypeId,
        examName: examType.examName,
        examCode: examType.examCode,
        assessmentPlanComponentId: examType.assessmentPlanComponentId,
        obtainedMarks,
        maximumMarks,
      });
    }

    subjects.push({
      subjectId: subject.subjectId,
      subjectCode: subject.subjectCode,
      subjectName: subject.subjectName,
      curriculumSubjectTermMappingId: subject.curriculumSubjectTermMappingId,
      assessments,
      totalObtainedMarks,
      totalMaximumMarks,
    });
  }

  const isComplete = missingCount === 0;
  const academicHistory = isComplete ? `${termLabel} complete` : `${termLabel} incomplete`;
  const status = issues.length > 0 ? 'Ready with warning' : 'Ready';

  return {
    studentId: student.studentId,
    scholarNo: student.scholarNo || student.enrollment,
    studentName: student.fullName,
    enrollment: student.enrollment,
    batch: student.batch,
    sessionId: student.sessionId,
    sessionName: student.sessionName,
    academicHistory,
    backlogs: 0,
    issueCount: issues.length,
    status,
    issues,
    subjects,
  };
}

function collectSessions(students) {
  const seen = new Set();
  const sessions = [];
  for (const student of students) {
    if (student.sessionId == null) {
      continue;
    }
    if (seen.has(student.sessionId)) {
      continue;
    }
    seen.add(student.sessionId);
    sessions.push({
      sessionId: student.sessionId,
      sessionName: student.sessionName,
    });
  }
  return sessions;
}

function mapUploadLog(row) {
  let uploadedBy = null;
  if (row.uploadedBy) {
    uploadedBy = {
      userId: row.uploadedBy.userId,
      userName: row.uploadedBy.userName,
    };
  }
  let sessionName = null;
  if (row.session) {
    sessionName = row.session.sessionName;
  }
  return {
    uploadLogId: Number(row.previousAcademicUploadLogId),
    fileName: row.fileName,
    mimeType: row.mimeType,
    fileSize: row.fileSize != null ? Number(row.fileSize) : null,
    status: row.status,
    errorMessage: row.errorMessage,
    entriesCreated: Number(row.entriesCreated),
    entriesUpdated: Number(row.entriesUpdated),
    sessionId: row.sessionId,
    sessionName,
    createdAt: row.createdAt,
    uploadedBy,
  };
}

async function getRecentUpload(curriculumBatchTermMappingId, sessionId) {
  const row = await previousAcademicRepository.findLatestUploadLogByTermMappingId(
    Number(curriculumBatchTermMappingId),
    sessionId,
  );
  if (!row) {
    return null;
  }
  return mapUploadLog(row);
}

export async function getTermStudents(curriculumBatchTermMappingId, sessionId = null) {
  const context = await loadTermMarksContext(curriculumBatchTermMappingId, sessionId);
  const students = [];
  let readyCount = 0;
  let readyWithWarningCount = 0;
  let warningIssueCount = 0;

  for (const student of context.students) {
    const review = buildStudentTermReview(student, context);
    if (review.issueCount > 0) {
      readyWithWarningCount += 1;
    } else {
      readyCount += 1;
    }
    warningIssueCount += review.issueCount;

    students.push({
      studentId: review.studentId,
      scholarNo: review.scholarNo,
      studentName: review.studentName,
      enrollment: review.enrollment,
      batch: review.batch,
      sessionId: review.sessionId,
      sessionName: review.sessionName,
      academicHistory: review.academicHistory,
      backlogs: review.backlogs,
      issueCount: review.issueCount,
      status: review.status,
    });
  }

  const sessions = collectSessions(students);
  const recentUpload = await getRecentUpload(
    context.curriculumBatchTermMappingId,
    sessionId,
  );

  return {
    curriculumBatchTermMappingId: context.curriculumBatchTermMappingId,
    term: context.term,
    year: context.year,
    yearNumber: context.yearNumber,
    batch: context.batch,
    course: {
      courseId: context.courseId,
      courseName: context.courseName,
      courseCode: context.courseCode,
    },
    sessionId: sessionId ? Number(sessionId) : null,
    sessions,
    recentUpload,
    summary: {
      totalStudents: students.length,
      ready: readyCount + readyWithWarningCount,
      readyWithWarning: readyWithWarningCount,
      blocked: 0,
      issues: warningIssueCount,
      blocking: 0,
      warnings: warningIssueCount,
    },
    students,
  };
}

export async function getTermStudentDetails(
  curriculumBatchTermMappingId,
  studentId,
  sessionId = null,
) {
  const context = await loadTermMarksContext(curriculumBatchTermMappingId, sessionId);
  let matched = null;
  for (const student of context.students) {
    if (Number(student.studentId) === Number(studentId)) {
      matched = student;
      break;
    }
  }
  if (!matched) {
    const error = new Error(`Student with ID ${studentId} not found for this term`);
    error.statusCode = 404;
    throw error;
  }

  const review = buildStudentTermReview(matched, context);
  return {
    curriculumBatchTermMappingId: context.curriculumBatchTermMappingId,
    term: context.term,
    year: context.year,
    yearNumber: context.yearNumber,
    batch: context.batch,
    courseId: context.courseId,
    courseName: context.courseName,
    courseCode: context.courseCode,
    session: {
      sessionId: review.sessionId,
      sessionName: review.sessionName,
    },
    ...review,
  };
}

function assessmentPlanComponentCount(mapping) {
  if (!mapping) {
    return 0;
  }
  const seen = new Set();
  for (const component of mapping.assessmentPlan.components) {
    seen.add(Number(component.assessmentPlanComponentId));
  }
  return seen.size;
}

export async function getTermSubjects(curriculumBatchTermMappingId, sessionId = null) {
  const termMapping = await previousAcademicRepository.findTermMappingWithBatch(
    curriculumBatchTermMappingId,
  );
  if (!termMapping) {
    const error = new Error(
      `Curriculum batch term mapping with ID ${curriculumBatchTermMappingId} not found`,
    );
    error.statusCode = 404;
    throw error;
  }

  const batchMapping = termMapping.batchMapping;
  const curriculum = batchMapping.curriculum;
  const course = curriculum.course;
  const batch = Number(batchMapping.batch);
  const courseId = Number(curriculum.courseId);
  const curriculumId = Number(curriculum.curriculumId);
  const term = Number(termMapping.term);

  const studentRows = await previousAcademicRepository.findStudentsByCourseBatch(
    courseId,
    batch,
    sessionId,
  );
  const cstmRows =
    await previousAcademicRepository.findSubjectTermMappingsByCurriculumTerm(
      curriculumId,
      term,
    );
  const apMappings =
    await previousAcademicRepository.findAssessmentPlanSubjectsForTerm(
      curriculumBatchTermMappingId,
      sessionId,
    );

  const cstmIds = [];
  for (const row of cstmRows) {
    cstmIds.push(row.curriculumSubjectTermMappingId);
  }
  const markRows = await previousAcademicRepository.getHistoricalMarksByCstmIds(cstmIds);

  const sessionNameById = new Map();
  const studentsBySession = new Map();
  for (const student of studentRows) {
    const sid = Number(student.sessionId);
    let list = studentsBySession.get(sid);
    if (!list) {
      list = [];
      studentsBySession.set(sid, list);
    }
    list.push(Number(student.studentId));
    if (!sessionNameById.has(sid) && student.studentSession) {
      sessionNameById.set(sid, student.studentSession.sessionName);
    }
  }

  const markedByCstm = new Map();
  for (const item of markRows) {
    const cstmId = Number(item.curriculumSubjectTermMappingId);
    let marked = markedByCstm.get(cstmId);
    if (!marked) {
      marked = new Set();
      markedByCstm.set(cstmId, marked);
    }
    marked.add(Number(item.studentId));
  }

  const apBySubjectSession = new Map();
  const apBySubject = new Map();
  for (const mapping of apMappings) {
    const subjectId = Number(mapping.subjectId);
    apBySubjectSession.set(`${subjectId}_${mapping.sessionId}`, mapping);
    if (!apBySubject.has(subjectId)) {
      apBySubject.set(subjectId, mapping);
    }
  }

  const sessionIds = [];
  if (sessionId) {
    sessionIds.push(Number(sessionId));
  } else {
    for (const sid of studentsBySession.keys()) {
      sessionIds.push(sid);
    }
  }
  if (sessionIds.length === 0) {
    sessionIds.push(null);
  }

  const sessions = [];
  for (const sid of sessionIds) {
    const sessionStudentIds = studentsBySession.get(sid) || [];
    const totalStudents = sessionStudentIds.length;
    const subjects = [];

    for (const cstm of cstmRows) {
      const subjectId = Number(cstm.subjectId);
      const cstmId = Number(cstm.curriculumSubjectTermMappingId);
      const apMapping =
        apBySubjectSession.get(`${subjectId}_${sid}`) || apBySubject.get(subjectId);
      const componentCount = assessmentPlanComponentCount(apMapping);
      const markedSet = markedByCstm.get(cstmId);
      let markedCount = 0;
      if (markedSet) {
        for (const studentId of sessionStudentIds) {
          if (markedSet.has(studentId)) {
            markedCount += 1;
          }
        }
      }

      let status = 'Incomplete';
      if (totalStudents > 0 && componentCount > 0 && markedCount === totalStudents) {
        status = 'Complete';
      }

      subjects.push({
        subjectId,
        subjectCode: cstm.subject.subjectCode,
        subjectName: cstm.subject.subjectName,
        curriculumSubjectTermMappingId: cstmId,
        credit: Number(cstm.credit) || 0,
        sessionId: sid,
        studentCount: totalStudents,
        assessmentPlanComponentCount: componentCount,
        markedStudents: `${markedCount}/${totalStudents}`,
        status,
      });
    }

    sessions.push({
      sessionId: sid,
      sessionName: sessionNameById.get(sid) || null,
      studentCount: totalStudents,
      subjects,
    });
  }

  if (sessionId && !sessionNameById.has(Number(sessionId))) {
    const sessionRows = await previousAcademicRepository.findSessionsByIds([
      Number(sessionId),
    ]);
    for (const session of sessionRows) {
      for (const item of sessions) {
        if (Number(item.sessionId) === Number(session.sessionId)) {
          item.sessionName = session.sessionName;
        }
      }
    }
  }

  const recentUpload = await getRecentUpload(
    termMapping.curriculumBatchTermMappingId,
    sessionId,
  );

  return {
    curriculumBatchTermMappingId: Number(termMapping.curriculumBatchTermMappingId),
    term,
    year: termMapping.year,
    yearNumber: termMapping.yearNumber,
    batch,
    course: {
      courseId,
      courseName: course.courseName,
      courseCode: course.courseCode,
    },
    sessions,
    recentUpload,
  };
}

function buildStudentLookup(students) {
  const byEnrollment = new Map();
  const byId = new Map();
  const nameCount = new Map();
  const byName = new Map();

  for (const student of students) {
    byId.set(Number(student.studentId), student);
    if (student.enrollment) {
      byEnrollment.set(String(student.enrollment).trim().toLowerCase(), student);
    }
    if (student.scholarNo) {
      byEnrollment.set(String(student.scholarNo).trim().toLowerCase(), student);
    }
    const nameKey = normalizeLabel(student.fullName);
    if (!nameKey) {
      continue;
    }
    nameCount.set(nameKey, (nameCount.get(nameKey) || 0) + 1);
    byName.set(nameKey, student);
  }

  for (const [nameKey, count] of nameCount) {
    if (count > 1) {
      byName.delete(nameKey);
    }
  }

  return { byEnrollment, byId, byName };
}

function findUploadedStudent(row, studentCols, lookup) {
  const enrollment = studentCols.enrollment != null ? cellText(row[studentCols.enrollment]) : '';
  const fullName = studentCols.fullName != null ? cellText(row[studentCols.fullName]) : '';
  const studentIdText = studentCols.studentId != null ? cellText(row[studentCols.studentId]) : '';

  if (enrollment) {
    const student = lookup.byEnrollment.get(enrollment.toLowerCase());
    if (student) {
      return student;
    }
  }
  if (fullName) {
    const student = lookup.byName.get(normalizeLabel(fullName));
    if (student) {
      return student;
    }
  }
  if (studentIdText) {
    const student = lookup.byId.get(Number(studentIdText));
    if (student) {
      return student;
    }
  }
  return null;
}

function findSubjectForHeader(header, subjects) {
  if (!header) {
    return null;
  }
  const codeKey = header.subjectCode ? normalizeLabel(header.subjectCode) : '';
  const nameKey = header.subjectName ? normalizeLabel(header.subjectName) : '';
  for (const subject of subjects) {
    if (codeKey && normalizeLabel(subject.subjectCode) === codeKey) {
      return subject;
    }
  }
  for (const subject of subjects) {
    if (nameKey && normalizeLabel(subject.subjectName) === nameKey) {
      return subject;
    }
    if (nameKey && normalizeLabel(`${subject.subjectCode} ${subject.subjectName}`) === nameKey) {
      return subject;
    }
  }
  return null;
}

function findExamType(subject, examLabel) {
  const examKey = normalizeLabel(examLabel);
  if (!examKey || !subject) {
    return null;
  }
  for (const examType of subject.examSetupTypes) {
    if (normalizeLabel(examType.examName) === examKey) {
      return examType;
    }
    if (normalizeLabel(examType.examCode) === examKey) {
      return examType;
    }
  }
  return null;
}

function detectExamHeaderRow(sheetRows, subjects) {
  const knownExams = new Set();
  for (const subject of subjects) {
    for (const examType of subject.examSetupTypes) {
      knownExams.add(normalizeLabel(examType.examName));
      if (examType.examCode) {
        knownExams.add(normalizeLabel(examType.examCode));
      }
    }
  }

  let bestIndex = -1;
  let bestScore = 0;
  for (let i = 0; i < sheetRows.length; i++) {
    const row = sheetRows[i];
    if (!row) {
      continue;
    }
    let score = 0;
    let studentHeaderHits = 0;
    for (const cell of row) {
      const label = normalizeLabel(cell);
      if (!label) {
        continue;
      }
      if (knownExams.has(label) || isSkipExamHeader(label) || isCreditHeader(label)) {
        score += 1;
      }
      if (isStudentHeader(label)) {
        studentHeaderHits += 1;
      }
    }
    if (studentHeaderHits > 0) {
      score += studentHeaderHits;
    }
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  return bestIndex;
}

function resolveStudentColumns(examHeaderRow, maxMarksRow) {
  const cols = {
    enrollment: null,
    fullName: null,
    studentId: null,
  };
  const width = Math.max(examHeaderRow.length, maxMarksRow ? maxMarksRow.length : 0);
  for (let col = 0; col < width; col++) {
    const headerLabel = normalizeLabel(examHeaderRow[col]);
    const subLabel = maxMarksRow ? normalizeLabel(maxMarksRow[col]) : '';
    if (
      headerLabel === 'scholar no' ||
      headerLabel === 'scholar no.' ||
      headerLabel === 'enrollment' ||
      headerLabel === 'enrolment' ||
      headerLabel === 'enroll number' ||
      subLabel === 'stable id'
    ) {
      cols.enrollment = col;
    } else if (
      headerLabel === 'student name' ||
      headerLabel === 'full name' ||
      headerLabel === 'name' ||
      subLabel === 'reference'
    ) {
      cols.fullName = col;
    } else if (
      headerLabel === 'student id' ||
      headerLabel === 'studentid' ||
      headerLabel === 'student'
    ) {
      cols.studentId = col;
    }
  }
  if (cols.enrollment == null) {
    cols.enrollment = 0;
  }
  if (cols.fullName == null) {
    cols.fullName = 1;
  }
  return cols;
}

function buildMarkColumns(sheetRows, examHeaderIndex, subjects) {
  const examHeaderRow = sheetRows[examHeaderIndex] || [];
  const subjectRow = sheetRows[examHeaderIndex - 1] || [];
  const maxMarksRow = sheetRows[examHeaderIndex + 1] || [];
  const studentCols = resolveStudentColumns(examHeaderRow, maxMarksRow);
  const studentColSet = new Set();
  if (studentCols.enrollment != null) {
    studentColSet.add(studentCols.enrollment);
  }
  if (studentCols.fullName != null) {
    studentColSet.add(studentCols.fullName);
  }
  if (studentCols.studentId != null) {
    studentColSet.add(studentCols.studentId);
  }

  const width = Math.max(examHeaderRow.length, subjectRow.length, maxMarksRow.length);
  const filledSubjects = [];
  let currentSubject = null;
  for (let col = 0; col < width; col++) {
    const parsed = parseSubjectHeader(subjectRow[col]);
    if (parsed) {
      currentSubject = parsed;
    }
    filledSubjects[col] = currentSubject;
  }

  const columns = [];
  const creditColsByCstmId = new Map();
  for (let col = 0; col < width; col++) {
    if (studentColSet.has(col)) {
      continue;
    }
    const examLabel = cellText(examHeaderRow[col]);
    const examKey = normalizeLabel(examLabel);
    if (!examKey || isSkipExamHeader(examKey) || isStudentHeader(examKey)) {
      continue;
    }
    const subject = findSubjectForHeader(filledSubjects[col], subjects);
    if (isCreditHeader(examKey)) {
      if (subject) {
        creditColsByCstmId.set(subject.curriculumSubjectTermMappingId, col);
      }
      continue;
    }
    const examType = findExamType(subject, examLabel);
    if (!examType) {
      continue;
    }
    columns.push({
      col,
      subjectName: subject.subjectName,
      examName: examType.examName,
      curriculumSubjectTermMappingId: subject.curriculumSubjectTermMappingId,
      assessmentPlanComponentId: examType.assessmentPlanComponentId,
      maximumMarks: examType.maximumMarks,
    });
        }

        return {
    studentCols,
    columns,
    creditColsByCstmId,
    dataStartIndex: examHeaderIndex + 2,
  };
}

export async function uploadTermMarks(curriculumBatchTermMappingId, file, sessionId = null) {
  const fileMeta = buildUploadFileMeta(file);
  let status = 'SUCCESS';
  let errorMessage = null;
  let created = 0;
  let updated = 0;
  let failure = null;

  try {
    const result = await processTermMarksUpload(
      curriculumBatchTermMappingId,
      file,
      sessionId,
    );
    created = result.created;
    updated = result.updated;
  } catch (error) {
    status = 'FAILED';
    errorMessage = formatUploadError(error);
    failure = error;
  }

  const store = getTenantStore();
  let log;
  try {
    log = await previousAcademicRepository.createUploadLog({
      curriculumBatchTermMappingId: Number(curriculumBatchTermMappingId),
      sessionId: sessionId ? Number(sessionId) : null,
      fileName: fileMeta.fileName,
      mimeType: fileMeta.mimeType,
      fileSize: fileMeta.fileSize,
      fileData: fileMeta.fileData,
      status,
      errorMessage,
      entriesCreated: created,
      entriesUpdated: updated,
      createdBy: store.userId,
    });
  } catch (logError) {
    if (failure) {
      throw failure;
    }
    throw logError;
  }

  if (failure) {
    throw failure;
  }

  return {
    created,
    updated,
    uploadLogId: Number(log.previousAcademicUploadLogId),
    status,
    fileName: fileMeta.fileName,
  };
}

export async function getTermUploadHistory(curriculumBatchTermMappingId, sessionId = null) {
  const termMapping = await previousAcademicRepository.findTermMappingWithBatch(
    curriculumBatchTermMappingId,
  );
  if (!termMapping) {
    const error = new Error(
      `Curriculum batch term mapping with ID ${curriculumBatchTermMappingId} not found`,
    );
    error.statusCode = 404;
    throw error;
  }

  const batchMapping = termMapping.batchMapping;
  const curriculum = batchMapping.curriculum;
  const course = curriculum.course;

  const rows = await previousAcademicRepository.findUploadLogsByTermMappingId(
    Number(curriculumBatchTermMappingId),
    sessionId,
  );

  const sessions = [];
  const seenSessionIds = new Set();
  const uploads = [];
  for (const row of rows) {
    const mapped = mapUploadLog(row);
    if (mapped.sessionId != null && !seenSessionIds.has(Number(mapped.sessionId))) {
      seenSessionIds.add(Number(mapped.sessionId));
      sessions.push({
        sessionId: Number(mapped.sessionId),
        sessionName: mapped.sessionName,
      });
    }
    uploads.push(mapped);
  }

  if (sessionId && !seenSessionIds.has(Number(sessionId))) {
    const sessionRows = await previousAcademicRepository.findSessionsByIds([
      Number(sessionId),
    ]);
    for (const session of sessionRows) {
      sessions.push({
        sessionId: Number(session.sessionId),
        sessionName: session.sessionName,
      });
    }
  }

  return {
    curriculumBatchTermMappingId: Number(termMapping.curriculumBatchTermMappingId),
    course: {
      courseId: Number(course.courseId),
      courseName: course.courseName,
      courseCode: course.courseCode,
    },
    term: {
      curriculumBatchTermMappingId: Number(termMapping.curriculumBatchTermMappingId),
      term: Number(termMapping.term),
      year: termMapping.year,
      yearNumber: termMapping.yearNumber,
    },
    sessions,
    uploads,
  };
}

function buildUploadFileMeta(file) {
  if (!file) {
    return {
      fileName: null,
      mimeType: null,
      fileSize: null,
      fileData: null,
    };
  }

  const fileData = file.data || file.buffer || null;
  let fileSize = null;
  if (file.size != null) {
    fileSize = Number(file.size);
  } else if (fileData) {
    fileSize = fileData.length;
  }

  return {
    fileName: file.name || file.originalname || null,
    mimeType: file.mimetype || file.mimeType || null,
    fileSize,
    fileData,
  };
}

function formatUploadError(error) {
  if (error.details && error.details.length > 0) {
    return error.details.join('\n');
  }
  return error.message || 'Upload failed';
}

async function processTermMarksUpload(curriculumBatchTermMappingId, file, sessionId = null) {
  if (!file || (!file.data && !file.buffer)) {
    const error = new Error('Excel file is required (form-data field: marks)');
    error.statusCode = 400;
    throw error;
  }

  const context = await loadTermMarksContext(curriculumBatchTermMappingId, sessionId);
  const workbook = xlsx.read(file.data || file.buffer, { type: 'buffer' });
  const marksSheet = workbook.Sheets[workbook.SheetNames[0]];
  const sheetRows = xlsx.utils.sheet_to_json(marksSheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  const examHeaderIndex = detectExamHeaderRow(sheetRows, context.subjects);
  if (examHeaderIndex < 0) {
    const error = new Error('Could not find exam header row in the uploaded sheet');
    error.statusCode = 400;
    throw error;
  }

  const { studentCols, columns, creditColsByCstmId, dataStartIndex } = buildMarkColumns(
    sheetRows,
    examHeaderIndex,
    context.subjects,
  );
  if (columns.length === 0) {
    const error = new Error(
      'No subject/exam columns matched assessment plan components for this term',
    );
    error.statusCode = 400;
    throw error;
  }

  const lookup = buildStudentLookup(context.students);
  const rows = [];
  let created = 0;
  let updated = 0;
  const errors = [];

  for (let rowIndex = dataStartIndex; rowIndex < sheetRows.length; rowIndex++) {
    const row = sheetRows[rowIndex];
    if (!row) {
      continue;
    }
    const enrollment = studentCols.enrollment != null ? cellText(row[studentCols.enrollment]) : '';
    const fullName = studentCols.fullName != null ? cellText(row[studentCols.fullName]) : '';
    const studentIdText = studentCols.studentId != null ? cellText(row[studentCols.studentId]) : '';
    if (!enrollment && !fullName && !studentIdText) {
      continue;
    }

    const student = findUploadedStudent(row, studentCols, lookup);
    if (!student) {
      errors.push(
        `Row ${rowIndex + 1}: student not found (${enrollment || fullName || studentIdText})`,
      );
      continue;
    }

    const creditByCstmId = new Map();
    for (const [cstmId, creditCol] of creditColsByCstmId) {
      const creditValue = parseMoneyInput(row[creditCol]);
      if (creditValue == null || Number.isNaN(creditValue) || decimalGreaterThan(0, creditValue)) {
        creditByCstmId.set(cstmId, 0);
      } else {
        creditByCstmId.set(cstmId, creditValue);
      }
    }

    for (const column of columns) {
      const obtainedMarks = parseMoneyInput(row[column.col]);
      if (obtainedMarks == null) {
        continue;
      }
      if (Number.isNaN(obtainedMarks) || decimalGreaterThan(0, obtainedMarks)) {
        errors.push(
          `Row ${rowIndex + 1}: invalid marks for ${column.subjectName} ${column.examName}`,
        );
        continue;
      }
      if (decimalGreaterThan(obtainedMarks, column.maximumMarks)) {
        errors.push(
          `Row ${rowIndex + 1}: ${column.subjectName} ${column.examName} exceeds maximum ${column.maximumMarks}`,
        );
        continue;
      }

      const existingKey = `${student.studentId}_${column.curriculumSubjectTermMappingId}_${column.assessmentPlanComponentId}`;
      const existing = context.marksByKey.get(existingKey);
      if (existing) {
        updated += 1;
      } else {
        created += 1;
      }
      rows.push({
        studentId: student.studentId,
        curriculumSubjectTermMappingId: column.curriculumSubjectTermMappingId,
        assessmentPlanComponentId: column.assessmentPlanComponentId,
        maximumMarks: column.maximumMarks,
        obtainedMarks,
        creditEarned: creditByCstmId.get(column.curriculumSubjectTermMappingId) || 0,
      });
    }
  }

  if (errors.length > 0) {
    const error = new Error(errors[0]);
    error.statusCode = 400;
    error.details = errors;
    throw error;
  }
  if (rows.length === 0) {
    return {
      created: 0,
      updated: 0,
    };
  }

  const transaction = await sequelize.transaction();
  try {
    await previousAcademicRepository.upsertStudentResultItems(rows, transaction);
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  return {
    created,
    updated,
  };
}
