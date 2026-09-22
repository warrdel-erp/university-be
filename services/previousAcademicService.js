import * as previousAcademicRepository from '../repository/previousAcademicRepository.js';
import { buildTermName, resolveTotalTerms, termsForYear } from '../utility/courseTerms.js';
import { resolveActiveAcademicYearContext } from '../utility/curriculumSubjectsByActiveYear.js';
import sequelize from '../database/sequelizeConfig.js';
import xlsx from 'xlsx';
import {
  decimalAdd,
  decimalDivide,
  decimalGreaterThan,
  decimalGreaterThanOrEqual,
  decimalLessThan,
  decimalLessThanOrEqual,
  decimalMultiply,
  parseMoneyInput,
  toMoneyNumber,
} from '../utility/decimalMoney.js';
import { getTenantStore } from '../utility/requestContext.js';

async function getActiveYear() {
  const academicYearContext = await resolveActiveAcademicYearContext();
  const activeYearRecord = academicYearContext.academicYear;
  const activeYear = academicYearContext.activeBatchYear;
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

function buildCurrentTerms({ course, terms, batchYear, activeYear, duration }) {
  const currentTerms = [];
  for (const termMapping of terms) {
    if (Number(termMapping.year) !== activeYear) {
      continue;
    }
    const termNumber = Number(termMapping.term);
    currentTerms.push({
      curriculumBatchTermMappingId: Number(termMapping.curriculumBatchTermMappingId),
      term: termNumber,
      termName: buildTermName(course.termType, termNumber),
      yearNumber: Number(termMapping.yearNumber),
      year: Number(termMapping.year),
    });
  }

  if (currentTerms.length > 0) {
    currentTerms.sort((a, b) => a.term - b.term);
    return currentTerms;
  }

  const currentYearNumber = activeYear - batchYear + 1;
  if (currentYearNumber < 1 || currentYearNumber > duration) {
    return [];
  }

  const expectedTerms = termsForYear(currentYearNumber, course);
  for (const termNumber of expectedTerms) {
    let curriculumBatchTermMappingId = null;
    for (const termMapping of terms) {
      if (Number(termMapping.term) === termNumber) {
        curriculumBatchTermMappingId = Number(termMapping.curriculumBatchTermMappingId);
        break;
      }
    }
    currentTerms.push({
      curriculumBatchTermMappingId,
      term: termNumber,
      termName: buildTermName(course.termType, termNumber),
      yearNumber: currentYearNumber,
      year: activeYear,
    });
  }
  return currentTerms;
}

function aggregateMarksBySubjectTermMapping(marks) {
  const marksBySubjectTermMapping = new Map();
  for (const resultItem of marks) {
    const curriculumSubjectTermMappingId = Number(resultItem.curriculumSubjectTermMappingId);
    let aggregation = marksBySubjectTermMapping.get(curriculumSubjectTermMappingId);
    if (!aggregation) {
      aggregation = { total: 0, students: new Set() };
      marksBySubjectTermMapping.set(curriculumSubjectTermMappingId, aggregation);
    }
    aggregation.total += 1;
    aggregation.students.add(Number(resultItem.studentId));
  }
  return marksBySubjectTermMapping;
}

function termAggregationFromSubjectMappings(subjectMappings, termNumber, marksBySubjectTermMapping) {
  let total = 0;
  const students = new Set();
  for (const subjectTermMapping of subjectMappings || []) {
    if (Number(subjectTermMapping.term) !== Number(termNumber)) {
      continue;
    }
    const aggregation = marksBySubjectTermMapping.get(
      Number(subjectTermMapping.curriculumSubjectTermMappingId),
    );
    if (!aggregation) {
      continue;
    }
    total += aggregation.total;
    for (const studentId of aggregation.students) {
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

  for (const curriculum of curriculums) {
    const courseId = Number(curriculum.courseId);
    if (!courseMappedBatchesMap.has(courseId)) {
      courseMappedBatchesMap.set(courseId, new Set());
    }

    for (const curriculumBatchMapping of curriculum.batchMappings || []) {
      const batch = Number(curriculumBatchMapping.batch);
      courseMappedBatchesMap.get(courseId).add(batch);
      curriculumMap.set(`${courseId}_${batch}`, {
        curriculum,
        batchMapping: curriculumBatchMapping,
        terms: curriculumBatchMapping.termMappings || [],
        subjectMappings: curriculum.subjectTermMappings || [],
      });
      for (const termMapping of curriculumBatchMapping.termMappings || []) {
        batchTermMappingIds.push(termMapping.curriculumBatchTermMappingId);
      }
    }
  }

  const regulationMap = new Map();
  for (const regulationMapping of regulationMappings) {
    regulationMap.set(regulationMapping.courseId, regulationMapping.academicRegulation);
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
      for (const batchYear of mappedBatches) {
        allBatchYearsSet.add(batchYear);
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
  const curriculumSubjectTermMappingIds = [];
  for (const curriculum of curriculums) {
    for (const subjectTermMapping of curriculum.subjectTermMappings || []) {
      curriculumSubjectTermMappingIds.push(subjectTermMapping.curriculumSubjectTermMappingId);
    }
  }
  const historicalMarks =
    await previousAcademicRepository.getHistoricalMarksByCstmIds(curriculumSubjectTermMappingIds);
  const marksBySubjectTermMapping = aggregateMarksBySubjectTermMapping(historicalMarks);

  const assessmentPlanSubjectKeys = new Set();
  for (const assessmentPlanMapping of assessmentPlanMappings) {
    assessmentPlanSubjectKeys.add(
      `${assessmentPlanMapping.courseId}_${assessmentPlanMapping.sessionId}_${assessmentPlanMapping.curriculumBatchTermMappingId}_${assessmentPlanMapping.subjectId}`,
    );
    assessmentPlanSubjectKeys.add(
      `${assessmentPlanMapping.courseId}_${assessmentPlanMapping.curriculumBatchTermMappingId}_${assessmentPlanMapping.subjectId}`,
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
    const mappedBatches = courseMappedBatchesMap.get(course.courseId);
    if (mappedBatches) {
      for (const batchYear of mappedBatches) {
        courseBatchesSet.add(batchYear);
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
          studentCountMap.get(
            `${Number(course.courseId)}_${Number(sessionId)}_${Number(batchYear)}`,
          ) || 0;
        programmeSessionStudents += studentCount;

        const curriculumData = curriculumMap.get(`${course.courseId}_${batchYear}`);
        const isCurrentBatch = batchYear === activeYear;
        const requiredHistoricalTerms = isCurrentBatch
          ? 0
          : Math.min((activeYear - batchYear) * 2, totalTerms);

        const hasCurriculum = Boolean(curriculumData);
        const hasRegulation = Boolean(regulation);
        const terms = curriculumData ? curriculumData.terms : [];
        const subjectMappings = curriculumData ? curriculumData.subjectMappings : [];

        let termsConfigured = 0;
        for (const termMapping of terms) {
          let hasSubject = false;
          for (const subjectTermMapping of subjectMappings) {
            if (Number(subjectTermMapping.term) === Number(termMapping.term)) {
              hasSubject = true;
              break;
            }
          }
          if (hasSubject) {
            termsConfigured += 1;
          }
        }
        const hasTermsConfigured = termsConfigured >= totalTerms;

        let currentYearTermFound = false;
        if (isCurrentBatch) {
          for (const termMapping of terms) {
            if (Number(termMapping.year) === activeYear || Number(termMapping.yearNumber) === 1) {
              currentYearTermFound = true;
              break;
            }
          }
        }

        let subjectsRequired = 0;
        let subjectsConfigured = 0;
        for (const termMapping of terms) {
          const isCurrentYearTerm =
            Number(termMapping.year) === activeYear || Number(termMapping.yearNumber) === 1;
          const includeTerm = isCurrentBatch
            ? !currentYearTermFound || isCurrentYearTerm
            : Number(termMapping.term) <= requiredHistoricalTerms;
          if (!includeTerm) {
            continue;
          }
          for (const subjectTermMapping of subjectMappings) {
            if (Number(subjectTermMapping.term) !== Number(termMapping.term)) {
              continue;
            }
            subjectsRequired += 1;
            const specificKey = `${course.courseId}_${sessionId}_${termMapping.curriculumBatchTermMappingId}_${subjectTermMapping.subjectId}`;
            const genericKey = `${course.courseId}_${termMapping.curriculumBatchTermMappingId}_${subjectTermMapping.subjectId}`;
            if (assessmentPlanSubjectKeys.has(specificKey) || assessmentPlanSubjectKeys.has(genericKey)) {
              subjectsConfigured += 1;
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
          for (const termMapping of terms) {
            if (termMapping.term > requiredHistoricalTerms) {
              continue;
            }
            const historicalTermData = termAggregationFromSubjectMappings(
              subjectMappings,
              termMapping.term,
              marksBySubjectTermMapping,
            );
            if (!historicalTermData) {
              continue;
            }
            if (historicalTermData.frozenCount > 0) {
              frozenTermsCount += 1;
            }
            blockedStudentsCount += historicalTermData.blockedCount;
            validatedCount += historicalTermData.validatedCount;
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
          studentCount: studentCount,
          curriculumBatchMappingId: curriculumData
            ? curriculumData.batchMapping.curriculumBatchMappingId
            : null,
          termsConfigured,
          totalTerms,
          currentTerms: buildCurrentTerms({
            course,
            terms,
            batchYear,
            activeYear,
            duration,
          }),
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
  const curriculumSubjectTermMappingIds = [];
  for (const termMapping of termMappings) {
    batchTermMappingIds.push(termMapping.curriculumBatchTermMappingId);
  }
  for (const subjectTermMapping of subjectMappings) {
    curriculumSubjectTermMappingIds.push(subjectTermMapping.curriculumSubjectTermMappingId);
  }

  const studentCount = await previousAcademicRepository.countBatchStudents(
    courseId,
    sessionId,
    batch,
  );
  const assessmentPlanSubjectMappings =
    await previousAcademicRepository.getAssessmentPlanSubjectMappings(
      batchTermMappingIds,
      [courseId],
    );
  const historicalMarks =
    await previousAcademicRepository.getHistoricalMarksByCstmIds(curriculumSubjectTermMappingIds);

  const assessmentPlanSubjectKeys = new Set();
  for (const assessmentPlanMapping of assessmentPlanSubjectMappings) {
    assessmentPlanSubjectKeys.add(
      `${assessmentPlanMapping.curriculumBatchTermMappingId}_${assessmentPlanMapping.subjectId}`,
    );
  }
  const markedCurriculumSubjectTermMappingIds = new Set();
  for (const resultItem of historicalMarks) {
    markedCurriculumSubjectTermMappingIds.add(Number(resultItem.curriculumSubjectTermMappingId));
  }

  const terms = [];
  let subjectsRequired = 0;
  let subjectsWithPlan = 0;
  let termsConfigured = 0;
  for (const termMapping of termMappings) {
    const termNumber = Number(termMapping.term);
    let hasSubject = false;
    for (const subjectTermMapping of subjectMappings) {
      if (Number(subjectTermMapping.term) === termNumber) {
        hasSubject = true;
        break;
      }
    }
    if (hasSubject) {
      termsConfigured += 1;
    }
  }

  for (const termMapping of termMappings) {
    const termNumber = Number(termMapping.term);
    if (termNumber > requiredHistoricalTerms) {
      continue;
    }

    const curriculumBatchTermMappingId = Number(termMapping.curriculumBatchTermMappingId);
    const subjects = [];
    let hasMarks = false;
    for (const subjectTermMapping of subjectMappings) {
      if (Number(subjectTermMapping.term) !== termNumber) {
        continue;
      }
      subjectsRequired += 1;
      if (assessmentPlanSubjectKeys.has(`${curriculumBatchTermMappingId}_${subjectTermMapping.subjectId}`)) {
        subjectsWithPlan += 1;
      }
      if (markedCurriculumSubjectTermMappingIds.has(Number(subjectTermMapping.curriculumSubjectTermMappingId))) {
        hasMarks = true;
      }
      subjects.push({
        subjectId: subjectTermMapping.subjectId,
        subjectCode: subjectTermMapping.subject.subjectCode,
        subjectName: subjectTermMapping.subject.subjectName,
      });
    }

    terms.push({
      curriculumBatchTermMappingId,
      term: termNumber,
      termName: `Semester ${termNumber}`,
      yearNumber: termMapping.yearNumber,
      year: termMapping.year,
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
    studentCount: studentCount,
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

function normalizeSubjectCode(value) {
  return String(value || '').trim().toLowerCase();
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

function isAttemptHeader(label) {
  return (
    label === 'attempt' ||
    label === 'attempts' ||
    label === 'attempt no' ||
    label === 'attempt number' ||
    label === 'no of attempt' ||
    label === 'no of attempts'
  );
}

function parseAttemptInput(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = Number.parseInt(String(value).trim(), 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return Number.NaN;
  }
  return parsed;
}

function isStudentHeader(label) {
  return (
    label === 'student' ||
    label === 'student id' ||
    label === 'studentid' ||
    label === 'stable id' ||
    label === 'scholar no' ||
    label === 'scholar no.' ||
    label === 'scholar number' ||
    label === 'enrollment' ||
    label === 'enrolment' ||
    label === 'enroll number' ||
    label === 'enrollment number' ||
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
  let withoutCredit = text.replace(/\s*[·•]\s*\d+(\.\d+)?\s*cr\s*$/i, '').trim();
  withoutCredit = withoutCredit.replace(/\s+\d+(\.\d+)?\s*cr\s*$/i, '').trim();
  const bulletParts = [];
  for (const part of withoutCredit.split(/\s*[·•]\s*/)) {
    if (part) {
      bulletParts.push(part.trim());
    }
  }
  if (bulletParts.length >= 2) {
    return {
      subjectCode: bulletParts[0],
      subjectName: bulletParts.slice(1).join(' '),
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
  const assessmentPlanSubjectMappings =
    await previousAcademicRepository.findAssessmentPlanSubjectsForTerm(
      curriculumBatchTermMappingId,
      sessionId,
    );
  const curriculumSubjectTermMappings =
    await previousAcademicRepository.findSubjectTermMappingsByCurriculumTerm(
      curriculumId,
      term,
    );
  const { subjects, curriculumSubjectTermMappingIds } = buildTermSubjects(assessmentPlanSubjectMappings, curriculumSubjectTermMappings);

  const existingResultItems =
    await previousAcademicRepository.getHistoricalMarksByCstmIds(curriculumSubjectTermMappingIds);
  const marksByKey = new Map();
  for (const resultItem of existingResultItems) {
    marksByKey.set(
      `${resultItem.studentId}_${resultItem.curriculumSubjectTermMappingId}_${resultItem.assessmentPlanComponentId}`,
      resultItem,
    );
  }

  const students = [];
  for (const student of studentRows) {
    const studentSubjects = [];
    for (const subject of subjects) {
      const examSetupTypes = [];
      let creditEarned = null;
      let attempt = null;
      for (const examType of subject.examSetupTypes) {
        const existing = marksByKey.get(
          `${student.studentId}_${subject.curriculumSubjectTermMappingId}_${examType.assessmentPlanComponentId}`,
        );
        if (existing) {
          if (creditEarned == null && existing.creditEarned != null) {
            creditEarned = toMoneyNumber(existing.creditEarned);
          }
          if (attempt == null && existing.attempt != null) {
            attempt = Number(existing.attempt);
          }
        }
        examSetupTypes.push({
          examSetupTypeId: examType.examSetupTypeId,
          examName: examType.examName,
          examCode: examType.examCode,
          assessmentPlanComponentId: examType.assessmentPlanComponentId,
          obtainedMarks: existing ? toMoneyNumber(existing.obtainedMarks) : null,
          maximumMarks: examType.maximumMarks,
        });
      }
      studentSubjects.push({
        subjectId: subject.subjectId,
        subjectCode: subject.subjectCode,
        subjectName: subject.subjectName,
        curriculumSubjectTermMappingId: subject.curriculumSubjectTermMappingId,
        credit: subject.credit,
        creditEarned,
        attempt,
        examSetupTypes,
      });
    }
    let sessionName = null;
    if (student.studentSession) {
      sessionName = student.studentSession.sessionName;
    }
    students.push({
      studentId: student.studentId,
      firstName: student.firstName,
      fullName: studentFullName(student),
      enrollmentNumber: student.enrollNumber,
      scholarNumber: student.scholarNumber,
      batch: student.batchYear,
      sessionId: student.sessionId ? Number(student.sessionId) : null,
      sessionName,
      subjects: studentSubjects,
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
  for (const subject of context.subjects) {
    delete subject.grading;
    delete subject.regulation;
  }
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
  let missingCount = 0;

  for (const subject of context.subjects) {
    let subjectHasMissingMarks = false;

    for (const examType of subject.examSetupTypes) {
      const existing = context.marksByKey.get(
        `${student.studentId}_${subject.curriculumSubjectTermMappingId}_${examType.assessmentPlanComponentId}`,
      );
      const obtainedMarks = existing ? toMoneyNumber(existing.obtainedMarks) : null;
      const maximumMarks = examType.maximumMarks;

      if (obtainedMarks == null) {
        missingCount += 1;
        subjectHasMissingMarks = true;
      } else if (decimalGreaterThan(obtainedMarks, maximumMarks)) {
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

    if (subjectHasMissingMarks) {
      issues.push({
        type: 'warning',
        code: 'MARKS_MISSING',
        message: `${subject.subjectCode} result missing`,
        subjectId: subject.subjectId,
        subjectCode: subject.subjectCode,
        subjectName: subject.subjectName,
      });
    }
  }

  const isComplete = missingCount === 0;
  const academicHistory = isComplete ? `${termLabel} complete` : `${termLabel} incomplete`;
  const status = issues.length > 0 ? 'Ready with warning' : 'Ready';

  return {
    studentId: student.studentId,
    scholarNumber: student.scholarNumber || student.enrollmentNumber,
    studentName: student.fullName,
    enrollmentNumber: student.enrollmentNumber,
    batch: student.batch,
    sessionId: student.sessionId,
    sessionName: student.sessionName,
    academicHistory,
    backlogs: 0,
    issueCount: issues.length,
    status,
    issues,
  };
}

function mapUploadLog(uploadLog) {
  let uploadedBy = null;
  if (uploadLog.uploadedBy) {
    uploadedBy = {
      userId: uploadLog.uploadedBy.userId,
      userName: uploadLog.uploadedBy.userName,
    };
  }
  let sessionName = null;
  if (uploadLog.session) {
    sessionName = uploadLog.session.sessionName;
  }
  return {
    uploadLogId: Number(uploadLog.previousAcademicUploadLogId),
    fileName: uploadLog.fileName,
    mimeType: uploadLog.mimeType,
    fileSize: uploadLog.fileSize != null ? Number(uploadLog.fileSize) : null,
    status: uploadLog.status,
    errorMessage: uploadLog.errorMessage,
    entriesCreated: Number(uploadLog.entriesCreated),
    entriesUpdated: Number(uploadLog.entriesUpdated),
    sessionId: uploadLog.sessionId,
    sessionName,
    createdAt: uploadLog.createdAt,
    uploadedBy,
  };
}

async function getRecentUpload(curriculumBatchTermMappingId, sessionId) {
  const uploadLog = await previousAcademicRepository.findLatestUploadLogByTermMappingId(
    Number(curriculumBatchTermMappingId),
    sessionId,
  );
  if (!uploadLog) {
    return null;
  }
  return mapUploadLog(uploadLog);
}

export async function getTermStudents(
  curriculumBatchTermMappingId,
  sessionId = null,
  pagination = {},
) {
  const page = pagination.page != null ? Number(pagination.page) : 1;
  const limit = pagination.limit != null ? Number(pagination.limit) : 25;
  const statusFilter = pagination.status || null;
  const context = await loadTermMarksContext(curriculumBatchTermMappingId, sessionId);
  const students = [];
  const filteredStudents = [];
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

    const studentRow = {
      studentId: review.studentId,
      scholarNumber: review.scholarNumber,
      studentName: review.studentName,
      enrollmentNumber: review.enrollmentNumber,
      batch: review.batch,
      sessionId: review.sessionId,
      sessionName: review.sessionName,
      academicHistory: review.academicHistory,
      backlogs: review.backlogs,
      issueCount: review.issueCount,
      status: review.status,
    };
    students.push(studentRow);
    let matchesStatus = true;
    if (statusFilter === 'Ready') {
      matchesStatus = studentRow.status === 'Ready';
    } else if (statusFilter === 'warning') {
      matchesStatus = studentRow.status === 'Ready with warning';
    }
    if (matchesStatus) {
      filteredStudents.push(studentRow);
    }
  }

  const total = filteredStudents.length;
  const offset = (page - 1) * limit;
  const pagedStudents = filteredStudents.slice(offset, offset + limit);

  const recentUpload = await getRecentUpload(
    context.curriculumBatchTermMappingId,
    sessionId,
  );

  return {
    data: {
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
      recentUpload,
      summary: {
        totalStudents: total,
        ready: readyCount + readyWithWarningCount,
        readyWithWarning: readyWithWarningCount,
        blocked: 0,
        issues: warningIssueCount,
        blocking: 0,
        warnings: warningIssueCount,
      },
      students: pagedStudents,
    },
    pagination: {
      total,
      page,
      limit,
    },
  };
}

function mapGradingScheme(gradingScheme) {
  const grades = [];
  if (!gradingScheme) {
    return { grades, minimumPassingMarks: null, maximumMarks: null };
  }
  for (const band of gradingScheme.grades || []) {
    grades.push({
      grade: band.grade,
      minPercentage: toMoneyNumber(band.minPercentage),
      maxPercentage: toMoneyNumber(band.maxPercentage),
      isPass: band.isPass,
    });
  }
  return {
    grades,
    minimumPassingMarks:
      gradingScheme.minimumPassingMarks != null
        ? toMoneyNumber(gradingScheme.minimumPassingMarks)
        : null,
    maximumMarks:
      gradingScheme.maximumMarks != null ? toMoneyNumber(gradingScheme.maximumMarks) : null,
  };
}

function mapGradingBasic(gradingScheme) {
  if (!gradingScheme) {
    return null;
  }
  return {
    gradingId: Number(gradingScheme.gradingId),
    gradingName: gradingScheme.gradingName,
    gradingCode: gradingScheme.gradingCode,
    gradingMethod: gradingScheme.gradingMethod,
  };
}

function mapRegulationBasic(regulation) {
  if (!regulation) {
    return null;
  }
  return {
    academicRegulationId: Number(regulation.academicRegulationId),
    regulationCode: regulation.regulationCode,
    regulationName: regulation.regulationName,
    applicableBatch: regulation.applicableBatch,
    academicYearRange: regulation.academicYearRange,
    status: regulation.status,
    version: regulation.version != null ? Number(regulation.version) : null,
    gradingSchemeId:
      regulation.gradingSchemeId != null ? Number(regulation.gradingSchemeId) : null,
  };
}

function mapRegulationRules(regulation) {
  if (!regulation) {
    return null;
  }
  return {
    evaluationPattern: regulation.evaluationPattern,
    minimumOverallMarks:
      regulation.minimumOverallMarks != null ? Number(regulation.minimumOverallMarks) : null,
    minimumOverallPercentage:
      regulation.minimumOverallPercentage != null
        ? toMoneyNumber(regulation.minimumOverallPercentage)
        : null,
    minimumInternalMarks:
      regulation.minimumInternalMarks != null ? Number(regulation.minimumInternalMarks) : null,
    minimumExternalMarks:
      regulation.minimumExternalMarks != null ? Number(regulation.minimumExternalMarks) : null,
    gradingScheme: mapGradingScheme(regulation.gradingScheme),
  };
}

function marksPercentage(obtained, maximum) {
  if (!maximum) {
    return 0;
  }
  return decimalMultiply(decimalDivide(obtained, maximum), 100);
}

function findMatchingGrade(grades, percentage) {
  for (const band of grades) {
    if (
      decimalGreaterThanOrEqual(percentage, band.minPercentage) &&
      decimalLessThanOrEqual(percentage, band.maxPercentage)
    ) {
      return band;
    }
  }
  return null;
}

function computeSubjectOutcome({
  isComplete,
  obtained,
  maximum,
  internalObtained,
  externalObtained,
  hasInternal,
  hasExternal,
  totalCredit,
  grades,
  minimumPassingMarks,
  gradingMaximumMarks,
  regulation,
}) {
  if (!isComplete) {
    return {
      grade: null,
      obtainedCredit: 0,
      totalCredit,
      resultStatus: null,
    };
  }

  if (grades.length === 0 && minimumPassingMarks == null && regulation == null) {
    return {
      grade: null,
      obtainedCredit: 0,
      totalCredit,
      resultStatus: null,
    };
  }

  const percentage = marksPercentage(obtained, maximum);
  const band = findMatchingGrade(grades, percentage);
  let passed = true;

  if (grades.length > 0 && !band) {
    passed = false;
  }
  if (band && !band.isPass) {
    passed = false;
  }
  if (minimumPassingMarks != null) {
    if (gradingMaximumMarks) {
      const requiredPercentage = decimalMultiply(
        decimalDivide(minimumPassingMarks, gradingMaximumMarks),
        100,
      );
      if (decimalLessThan(percentage, requiredPercentage)) {
        passed = false;
      }
    } else if (decimalLessThan(obtained, minimumPassingMarks)) {
      passed = false;
    }
  }

  if (regulation) {
    if (
      regulation.minimumOverallPercentage != null &&
      decimalLessThan(percentage, regulation.minimumOverallPercentage)
    ) {
      passed = false;
    }
    if (
      regulation.minimumOverallMarks != null &&
      decimalLessThan(obtained, regulation.minimumOverallMarks)
    ) {
      passed = false;
    }
    if (
      regulation.evaluationPattern !== 'EXTERNAL_ONLY' &&
      regulation.minimumInternalMarks != null &&
      hasInternal &&
      decimalLessThan(internalObtained, regulation.minimumInternalMarks)
    ) {
      passed = false;
    }
    if (
      regulation.evaluationPattern !== 'INTERNAL_ONLY' &&
      regulation.minimumExternalMarks != null &&
      hasExternal &&
      decimalLessThan(externalObtained, regulation.minimumExternalMarks)
    ) {
      passed = false;
    }
  }

  return {
    grade: band ? band.grade : null,
    obtainedCredit: passed ? totalCredit : 0,
    totalCredit,
    resultStatus: passed ? 'Pass' : 'Fail',
  };
}

function buildTermSubjects(assessmentPlanSubjectMappings, curriculumSubjectTermMappings) {
  const subjectTermMappingBySubjectId = new Map();
  for (const subjectTermMapping of curriculumSubjectTermMappings) {
    subjectTermMappingBySubjectId.set(Number(subjectTermMapping.subjectId), subjectTermMapping);
  }

  const subjects = [];
  const curriculumSubjectTermMappingIds = [];
  const seenSubjects = new Set();
  for (const mapping of assessmentPlanSubjectMappings) {
    const subjectId = Number(mapping.subjectId);
    if (seenSubjects.has(subjectId)) {
      continue;
    }
    seenSubjects.add(subjectId);
    const subjectTermMapping = subjectTermMappingBySubjectId.get(subjectId);
    if (!subjectTermMapping) {
      continue;
    }

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
        examCategory: component.examSetupType.examCategory,
        assessmentPlanComponentId: Number(component.assessmentPlanComponentId),
        maximumMarks: componentMaximumMarks(component),
      });
    }
    if (examSetupTypes.length === 0) {
      continue;
    }

    const assessmentPlan = mapping.assessmentPlan;
    const grading = mapGradingScheme(assessmentPlan.gradingScheme);
    const regulation = mapRegulationRules(assessmentPlan.academicRegulation);
    if (grading.grades.length === 0 && regulation) {
      grading.grades = regulation.gradingScheme.grades;
      grading.minimumPassingMarks = regulation.gradingScheme.minimumPassingMarks;
      grading.maximumMarks = regulation.gradingScheme.maximumMarks;
    }

    const curriculumSubjectTermMappingId = Number(subjectTermMapping.curriculumSubjectTermMappingId);
    curriculumSubjectTermMappingIds.push(curriculumSubjectTermMappingId);
    subjects.push({
      subjectId,
      subjectCode: mapping.subject.subjectCode,
      subjectName: mapping.subject.subjectName,
      assessmentPlanId: mapping.assessmentPlanId,
      curriculumSubjectTermMappingId,
      credit: Number(subjectTermMapping.credit) || 0,
      examSetupTypes,
      grading,
      regulation,
    });
  }
  return { subjects, curriculumSubjectTermMappingIds };
}

function buildStudentMarksRow(student, subjects, courseRegulation) {
  const marksByComponent = new Map();
  const resultItems = student.resultItems || [];
  for (const resultItem of resultItems) {
    marksByComponent.set(
      `${resultItem.curriculumSubjectTermMappingId}_${resultItem.assessmentPlanComponentId}`,
      resultItem,
    );
  }

  const studentSubjects = [];
  const issueMessages = [];
  let studentTotalCredit = 0;
  let studentObtainedCredit = 0;
  let studentObtainedMarks = 0;
  let studentMaximumMarks = 0;
  let allSubjectsDecided = true;
  let anyFail = false;
  let overallGrades = null;

  for (const subject of subjects) {
    const examSetupTypes = [];
    let totalObtainedMarks = 0;
    let totalMaximumMarks = 0;
    let internalObtained = 0;
    let externalObtained = 0;
    let hasInternal = false;
    let hasExternal = false;
    let subjectAttempt = null;
    let subjectCreditEarned = null;
    let subjectHasMissingMarks = false;

    for (const examType of subject.examSetupTypes) {
      const existing = marksByComponent.get(
        `${subject.curriculumSubjectTermMappingId}_${examType.assessmentPlanComponentId}`,
      );
      const obtainedMarks = existing ? toMoneyNumber(existing.obtainedMarks) : null;
      const maximumMarks = examType.maximumMarks;
      totalMaximumMarks = decimalAdd(totalMaximumMarks, maximumMarks);
      const category = String(examType.examCategory || '').toUpperCase();
      const isInternalExam = category.includes('INTERNAL');
      const isExternalExam = category.includes('EXTERNAL');
      if (isInternalExam) {
        hasInternal = true;
      } else if (isExternalExam) {
        hasExternal = true;
      }
      if (existing) {
        if (subjectAttempt == null) {
          subjectAttempt = existing.attempt != null ? Number(existing.attempt) : 1;
        }
        if (subjectCreditEarned == null && existing.creditEarned != null) {
          subjectCreditEarned = toMoneyNumber(existing.creditEarned);
        }
      }

      if (obtainedMarks == null) {
        subjectHasMissingMarks = true;
      } else {
        totalObtainedMarks = decimalAdd(totalObtainedMarks, obtainedMarks);
        if (isInternalExam) {
          internalObtained = decimalAdd(internalObtained, obtainedMarks);
        } else if (isExternalExam) {
          externalObtained = decimalAdd(externalObtained, obtainedMarks);
        }
        if (decimalGreaterThan(obtainedMarks, maximumMarks)) {
          issueMessages.push(
            `${subject.subjectCode} ${examType.examName} obtained marks exceed maximum ${maximumMarks}`,
          );
        }
      }

      examSetupTypes.push({
        examSetupTypeId: examType.examSetupTypeId,
        examName: examType.examName,
        examCode: examType.examCode,
        assessmentPlanComponentId: examType.assessmentPlanComponentId,
        maximumMarks,
        obtainedMarks,
      });
    }

    if (subjectHasMissingMarks) {
      issueMessages.push(`${subject.subjectCode} result missing`);
    }

    let grades = subject.grading.grades;
    let minimumPassingMarks = subject.grading.minimumPassingMarks;
    let gradingMaximumMarks = subject.grading.maximumMarks;
    const regulation = subject.regulation || courseRegulation;
    if (grades.length === 0 && regulation) {
      grades = regulation.gradingScheme.grades;
      minimumPassingMarks = regulation.gradingScheme.minimumPassingMarks;
      gradingMaximumMarks = regulation.gradingScheme.maximumMarks;
    }
    if (overallGrades == null && grades.length > 0) {
      overallGrades = grades;
    }
    const outcome = computeSubjectOutcome({
      isComplete: !subjectHasMissingMarks,
      obtained: totalObtainedMarks,
      maximum: totalMaximumMarks,
      internalObtained,
      externalObtained,
      hasInternal,
      hasExternal,
      totalCredit: subject.credit,
      grades,
      minimumPassingMarks,
      gradingMaximumMarks,
      regulation,
    });

    studentTotalCredit = decimalAdd(studentTotalCredit, outcome.totalCredit);
    studentObtainedCredit = decimalAdd(studentObtainedCredit, outcome.obtainedCredit);
    studentObtainedMarks = decimalAdd(studentObtainedMarks, totalObtainedMarks);
    studentMaximumMarks = decimalAdd(studentMaximumMarks, totalMaximumMarks);
    if (outcome.resultStatus == null) {
      allSubjectsDecided = false;
    } else if (outcome.resultStatus === 'Fail') {
      anyFail = true;
    }

    studentSubjects.push({
      subjectId: subject.subjectId,
      subjectCode: subject.subjectCode,
      subjectName: subject.subjectName,
      curriculumSubjectTermMappingId: subject.curriculumSubjectTermMappingId,
      examSetupTypes,
      totalObtainedMarks,
      totalMaximumMarks,
      grade: outcome.grade,
      obtainedCredit: outcome.obtainedCredit,
      totalCredit: outcome.totalCredit,
      resultStatus: outcome.resultStatus,
      creditEarned: subjectCreditEarned,
      attempt: subjectAttempt != null ? subjectAttempt : 1,
    });
  }

  let sessionName = null;
  if (student.studentSession) {
    sessionName = student.studentSession.sessionName;
  }
  const isComplete = issueMessages.length === 0;
  let resultStatus = null;
  let grade = null;
  if (allSubjectsDecided && studentSubjects.length > 0) {
    resultStatus = anyFail ? 'Fail' : 'Pass';
    if (overallGrades) {
      const band = findMatchingGrade(
        overallGrades,
        marksPercentage(studentObtainedMarks, studentMaximumMarks),
      );
      grade = band ? band.grade : null;
    }
  }

  return {
    studentId: student.studentId,
    enrollmentNumber: student.enrollNumber,
    scholarNumber: student.scholarNumber || student.enrollNumber,
    fullName: studentFullName(student),
    sessionId: student.sessionId ? Number(student.sessionId) : null,
    sessionName,
    subjects: studentSubjects,
    grade,
    obtainedCredit: studentObtainedCredit,
    totalCredit: studentTotalCredit,
    resultStatus,
    status: isComplete ? 'Complete' : 'Blocking',
    issueCount: issueMessages.length,
    issueMessage: isComplete ? null : issueMessages.join('; '),
  };
}

export async function getTermStudentMarks(
  curriculumBatchTermMappingId,
  sessionId = null,
  pagination = {},
) {
  const statusFilter = pagination.status || null;
  const limit = pagination.limit != null ? Number(pagination.limit) : null;
  const page = limit != null ? Number(pagination.page || 1) : null;

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

  const curriculum = termMapping.batchMapping.curriculum;
  const course = curriculum.course;
  const batch = Number(termMapping.batchMapping.batch);
  const courseId = Number(curriculum.courseId);

  const assessmentPlanSubjectMappings = await previousAcademicRepository.findAssessmentPlanSubjectsForTerm(
    curriculumBatchTermMappingId,
    sessionId,
  );
  const curriculumSubjectTermMappings = await previousAcademicRepository.findSubjectTermMappingsByCurriculumTerm(
    Number(curriculum.curriculumId),
    Number(termMapping.term),
  );
  const { subjects, curriculumSubjectTermMappingIds } = buildTermSubjects(assessmentPlanSubjectMappings, curriculumSubjectTermMappings);

  const [studentPage, regulationMappings] = await Promise.all([
    previousAcademicRepository.findStudentsWithTermResultItems(
      courseId,
      batch,
      sessionId,
      curriculumSubjectTermMappingIds,
      {},
    ),
    previousAcademicRepository.findAcademicRegulationForCourse(courseId, sessionId, batch),
  ]);

  const regulationBySessionId = new Map();
  const regulationRecordBySessionId = new Map();
  let defaultRegulation = null;
  let defaultRegulationRecord = null;
  for (const mapping of regulationMappings) {
    const regulationRecord = mapping.academicRegulation;
    const rules = mapRegulationRules(regulationRecord);
    regulationBySessionId.set(Number(mapping.sessionId), rules);
    regulationRecordBySessionId.set(Number(mapping.sessionId), regulationRecord);
    if (defaultRegulation == null) {
      defaultRegulation = rules;
      defaultRegulationRecord = regulationRecord;
    }
  }

  let selectedRegulationRecord = defaultRegulationRecord;
  if (sessionId != null) {
    const sessionRegulationRecord = regulationRecordBySessionId.get(Number(sessionId));
    if (sessionRegulationRecord) {
      selectedRegulationRecord = sessionRegulationRecord;
    }
  }

  const students = [];
  let completedCount = 0;
  let issuesCount = 0;
  for (const student of studentPage.rows) {
    let courseRegulation = defaultRegulation;
    if (student.sessionId != null) {
      const sessionRegulation = regulationBySessionId.get(Number(student.sessionId));
      if (sessionRegulation) {
        courseRegulation = sessionRegulation;
      }
    }
    const studentMarks = buildStudentMarksRow(student, subjects, courseRegulation);
    if (studentMarks.status === 'Complete') {
      completedCount += 1;
    } else {
      issuesCount += 1;
    }
    if (!statusFilter || studentMarks.status === statusFilter) {
      students.push(studentMarks);
    }
  }

  let pagedStudents = students;
  const total = students.length;
  if (limit != null) {
    pagedStudents = students.slice((page - 1) * limit, (page - 1) * limit + limit);
  }

  const uploadLogs = await previousAcademicRepository.findUploadLogsByTermMappingId(
    Number(termMapping.curriculumBatchTermMappingId),
    sessionId,
  );
  const uploadHistory = [];
  for (const uploadLog of uploadLogs) {
    uploadHistory.push(mapUploadLog(uploadLog));
  }

  for (const subject of subjects) {
    delete subject.grading;
    delete subject.regulation;
  }

  const data = {
    curriculumBatchTermMappingId: Number(termMapping.curriculumBatchTermMappingId),
    term: Number(termMapping.term),
    year: termMapping.year,
    yearNumber: termMapping.yearNumber,
    batch,
    batchYear: batch,
    sessionId: sessionId ? Number(sessionId) : null,
    course: {
      courseId,
      courseName: course.courseName,
      courseCode: course.courseCode,
    },
    regulation: mapRegulationBasic(selectedRegulationRecord),
    grading: mapGradingBasic(
      selectedRegulationRecord ? selectedRegulationRecord.gradingScheme : null,
    ),
    subjects,
    students: pagedStudents,
    uploadHistory,
    summary: {
      recentUpload: uploadHistory[0] || null,
      studentCount: studentPage.count,
      subjectCount: subjects.length,
      issuesCount,
      completedCount,
    },
  };
  if (limit == null) {
    return { data };
  }
  return { data, pagination: { total, page, limit } };
}

export async function getTermStudentDetails(
  curriculumBatchTermMappingId,
  studentId,
  sessionId = null,
) {
  const context = await loadTermMarksContext(curriculumBatchTermMappingId, sessionId);
  let matchedStudent = null;
  for (const student of context.students) {
    if (Number(student.studentId) === Number(studentId)) {
      matchedStudent = student;
      break;
    }
  }
  if (!matchedStudent) {
    const error = new Error(`Student with ID ${studentId} not found for this term`);
    error.statusCode = 404;
    throw error;
  }

  const review = buildStudentTermReview(matchedStudent, context);
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
  const seenComponentIds = new Set();
  for (const component of mapping.assessmentPlan.components) {
    seenComponentIds.add(Number(component.assessmentPlanComponentId));
  }
  return seenComponentIds.size;
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
  const curriculumSubjectTermMappings =
    await previousAcademicRepository.findSubjectTermMappingsByCurriculumTerm(
      curriculumId,
      term,
    );
  const assessmentPlanSubjectMappings =
    await previousAcademicRepository.findAssessmentPlanSubjectsForTerm(
      curriculumBatchTermMappingId,
      sessionId,
    );

  const curriculumSubjectTermMappingIds = [];
  for (const subjectTermMapping of curriculumSubjectTermMappings) {
    curriculumSubjectTermMappingIds.push(subjectTermMapping.curriculumSubjectTermMappingId);
  }
  const markRows = await previousAcademicRepository.getHistoricalMarksByCstmIds(curriculumSubjectTermMappingIds);

  const sessionNameById = new Map();
  const studentsBySession = new Map();
  for (const student of studentRows) {
    const currentSessionId = Number(student.sessionId);
    let sessionStudentIds = studentsBySession.get(currentSessionId);
    if (!sessionStudentIds) {
      sessionStudentIds = [];
      studentsBySession.set(currentSessionId, sessionStudentIds);
    }
    sessionStudentIds.push(Number(student.studentId));
    if (!sessionNameById.has(currentSessionId) && student.studentSession) {
      sessionNameById.set(currentSessionId, student.studentSession.sessionName);
    }
  }

  const markedStudentsBySubjectTermMapping = new Map();
  for (const resultItem of markRows) {
    const curriculumSubjectTermMappingId = Number(resultItem.curriculumSubjectTermMappingId);
    let markedStudentIds = markedStudentsBySubjectTermMapping.get(curriculumSubjectTermMappingId);
    if (!markedStudentIds) {
      markedStudentIds = new Set();
      markedStudentsBySubjectTermMapping.set(curriculumSubjectTermMappingId, markedStudentIds);
    }
    markedStudentIds.add(Number(resultItem.studentId));
  }

  const assessmentPlanBySubjectSession = new Map();
  const assessmentPlanBySubject = new Map();
  for (const mapping of assessmentPlanSubjectMappings) {
    const subjectId = Number(mapping.subjectId);
    assessmentPlanBySubjectSession.set(`${subjectId}_${mapping.sessionId}`, mapping);
    if (!assessmentPlanBySubject.has(subjectId)) {
      assessmentPlanBySubject.set(subjectId, mapping);
    }
  }

  const sessionIds = [];
  if (sessionId) {
    sessionIds.push(Number(sessionId));
  } else {
    for (const currentSessionId of studentsBySession.keys()) {
      sessionIds.push(currentSessionId);
    }
  }
  if (sessionIds.length === 0) {
    sessionIds.push(null);
  }

  const sessions = [];
  for (const currentSessionId of sessionIds) {
    const sessionStudentIds = studentsBySession.get(currentSessionId) || [];
    const totalStudents = sessionStudentIds.length;
    const subjects = [];

    for (const subjectTermMapping of curriculumSubjectTermMappings) {
      const subjectId = Number(subjectTermMapping.subjectId);
      const curriculumSubjectTermMappingId = Number(subjectTermMapping.curriculumSubjectTermMappingId);
      const assessmentPlanSubjectMapping =
        assessmentPlanBySubjectSession.get(`${subjectId}_${currentSessionId}`) || assessmentPlanBySubject.get(subjectId);
      const componentCount = assessmentPlanComponentCount(assessmentPlanSubjectMapping);
      const markedStudentIds = markedStudentsBySubjectTermMapping.get(curriculumSubjectTermMappingId);
      let markedCount = 0;
      if (markedStudentIds) {
        for (const studentId of sessionStudentIds) {
          if (markedStudentIds.has(studentId)) {
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
        subjectCode: subjectTermMapping.subject.subjectCode,
        subjectName: subjectTermMapping.subject.subjectName,
        curriculumSubjectTermMappingId,
        credit: Number(subjectTermMapping.credit) || 0,
        sessionId: currentSessionId,
        studentCount: totalStudents,
        assessmentPlanComponentCount: componentCount,
        markedStudents: `${markedCount}/${totalStudents}`,
        status,
      });
    }

    sessions.push({
      sessionId: currentSessionId,
      sessionName: sessionNameById.get(currentSessionId) || null,
      studentCount: totalStudents,
      subjects,
    });
  }

  if (sessionId && !sessionNameById.has(Number(sessionId))) {
    const sessionRows = await previousAcademicRepository.findSessionsByIds([
      Number(sessionId),
    ]);
    for (const session of sessionRows) {
      for (const sessionEntry of sessions) {
        if (Number(sessionEntry.sessionId) === Number(session.sessionId)) {
          sessionEntry.sessionName = session.sessionName;
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
    if (student.enrollmentNumber) {
      byEnrollment.set(String(student.enrollmentNumber).trim().toLowerCase(), student);
    }
    if (student.scholarNumber) {
      byEnrollment.set(String(student.scholarNumber).trim().toLowerCase(), student);
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

function findUploadedStudent(row, studentColumns, lookup) {
  const enrollmentNumber =
    studentColumns.enrollmentNumber != null ? cellText(row[studentColumns.enrollmentNumber]) : '';
  const fullName = studentColumns.fullName != null ? cellText(row[studentColumns.fullName]) : '';
  const studentIdText = studentColumns.studentId != null ? cellText(row[studentColumns.studentId]) : '';

  if (enrollmentNumber) {
    const student = lookup.byEnrollment.get(enrollmentNumber.toLowerCase());
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
  const headerCode = normalizeSubjectCode(header.subjectCode);
  const headerNameAsCode = normalizeSubjectCode(header.subjectName);
  const nameKey = header.subjectName ? normalizeLabel(header.subjectName) : '';
  let fullKey = header.subjectCode ? normalizeLabel(header.subjectCode) : '';
  if (fullKey && nameKey) {
    fullKey = `${fullKey} ${nameKey}`;
  } else if (nameKey) {
    fullKey = nameKey;
  }

  for (const subject of subjects) {
    const subjectCode = normalizeSubjectCode(subject.subjectCode);
    if (!subjectCode) {
      continue;
    }
    if (subjectCode === headerCode || subjectCode === headerNameAsCode) {
      return subject;
    }
  }
  for (const subject of subjects) {
    const subjectNameKey = normalizeLabel(subject.subjectName);
    const combinedKey = normalizeLabel(`${subject.subjectCode} ${subject.subjectName}`);
    if (nameKey && (nameKey === subjectNameKey || nameKey === combinedKey)) {
      return subject;
    }
    if (fullKey && fullKey === combinedKey) {
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
      if (knownExams.has(label) || isSkipExamHeader(label) || isCreditHeader(label) || isAttemptHeader(label)) {
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
  const studentColumns = {
    enrollmentNumber: null,
    fullName: null,
    studentId: null,
  };
  const width = Math.max(examHeaderRow.length, maxMarksRow ? maxMarksRow.length : 0);
  for (let columnIndex = 0; columnIndex < width; columnIndex++) {
    const headerLabel = normalizeLabel(examHeaderRow[columnIndex]);
    const subLabel = maxMarksRow ? normalizeLabel(maxMarksRow[columnIndex]) : '';
    if (
      headerLabel === 'scholar no' ||
      headerLabel === 'scholar no.' ||
      headerLabel === 'scholar number' ||
      headerLabel === 'enrollment' ||
      headerLabel === 'enrolment' ||
      headerLabel === 'enroll number' ||
      headerLabel === 'enrollment number' ||
      subLabel === 'stable id'
    ) {
      studentColumns.enrollmentNumber = columnIndex;
    } else if (
      headerLabel === 'student name' ||
      headerLabel === 'full name' ||
      headerLabel === 'name' ||
      subLabel === 'reference'
    ) {
      studentColumns.fullName = columnIndex;
    } else if (
      headerLabel === 'student id' ||
      headerLabel === 'studentid' ||
      headerLabel === 'student'
    ) {
      studentColumns.studentId = columnIndex;
    }
  }
  if (studentColumns.enrollmentNumber == null) {
    studentColumns.enrollmentNumber = 0;
  }
  if (studentColumns.fullName == null) {
    studentColumns.fullName = 1;
  }
  return studentColumns;
}

function buildMarkColumns(sheetRows, examHeaderIndex, subjects) {
  const examHeaderRow = sheetRows[examHeaderIndex] || [];
  const subjectRow = sheetRows[examHeaderIndex - 1] || [];
  const maxMarksRow = sheetRows[examHeaderIndex + 1] || [];
  const studentColumns = resolveStudentColumns(examHeaderRow, maxMarksRow);
  const studentColumnIndexes = new Set();
  if (studentColumns.enrollmentNumber != null) {
    studentColumnIndexes.add(studentColumns.enrollmentNumber);
  }
  if (studentColumns.fullName != null) {
    studentColumnIndexes.add(studentColumns.fullName);
  }
  if (studentColumns.studentId != null) {
    studentColumnIndexes.add(studentColumns.studentId);
  }

  const width = Math.max(examHeaderRow.length, subjectRow.length, maxMarksRow.length);
  const filledSubjects = [];
  let currentSubject = null;
  for (let columnIndex = 0; columnIndex < width; columnIndex++) {
    const parsed = parseSubjectHeader(subjectRow[columnIndex]);
    if (parsed) {
      currentSubject = parsed;
    }
    filledSubjects[columnIndex] = currentSubject;
  }

  const columns = [];
  const creditColumnBySubjectTermMappingId = new Map();
  const attemptColumnBySubjectTermMappingId = new Map();
  for (let columnIndex = 0; columnIndex < width; columnIndex++) {
    if (studentColumnIndexes.has(columnIndex)) {
      continue;
    }
    const examLabel = cellText(examHeaderRow[columnIndex]);
    const examKey = normalizeLabel(examLabel);
    if (!examKey || isSkipExamHeader(examKey) || isStudentHeader(examKey)) {
      continue;
    }
    const subject = findSubjectForHeader(filledSubjects[columnIndex], subjects);
    if (isCreditHeader(examKey)) {
      if (subject) {
        creditColumnBySubjectTermMappingId.set(subject.curriculumSubjectTermMappingId, columnIndex);
      }
      continue;
    }
    if (isAttemptHeader(examKey)) {
      if (subject) {
        attemptColumnBySubjectTermMappingId.set(subject.curriculumSubjectTermMappingId, columnIndex);
      }
      continue;
    }
    const examType = findExamType(subject, examLabel);
    if (!examType) {
      continue;
    }
    columns.push({
      columnIndex,
      subjectName: subject.subjectName,
      examName: examType.examName,
      curriculumSubjectTermMappingId: subject.curriculumSubjectTermMappingId,
      assessmentPlanComponentId: examType.assessmentPlanComponentId,
      maximumMarks: examType.maximumMarks,
    });
  }

  return {
    studentColumns,
    columns,
    creditColumnBySubjectTermMappingId,
    attemptColumnBySubjectTermMappingId,
    dataStartIndex: examHeaderIndex + 2,
  };
}

export async function uploadTermMarks(curriculumBatchTermMappingId, file, sessionId = null) {
  const fileMetadata = buildUploadFileMetadata(file);
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

  const tenantStore = getTenantStore();
  let uploadLog;
  try {
    uploadLog = await previousAcademicRepository.createUploadLog({
      curriculumBatchTermMappingId: Number(curriculumBatchTermMappingId),
      sessionId: sessionId ? Number(sessionId) : null,
      fileName: fileMetadata.fileName,
      mimeType: fileMetadata.mimeType,
      fileSize: fileMetadata.fileSize,
      fileData: fileMetadata.fileData,
      status,
      errorMessage,
      entriesCreated: created,
      entriesUpdated: updated,
      createdBy: tenantStore.userId,
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
    uploadLogId: Number(uploadLog.previousAcademicUploadLogId),
    status,
    fileName: fileMetadata.fileName,
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

  const uploadLogs = await previousAcademicRepository.findUploadLogsByTermMappingId(
    Number(curriculumBatchTermMappingId),
    sessionId,
  );

  const sessions = [];
  const seenSessionIds = new Set();
  const uploads = [];
  for (const uploadLog of uploadLogs) {
    const upload = mapUploadLog(uploadLog);
    if (upload.sessionId != null && !seenSessionIds.has(Number(upload.sessionId))) {
      seenSessionIds.add(Number(upload.sessionId));
      sessions.push({
        sessionId: Number(upload.sessionId),
        sessionName: upload.sessionName,
      });
    }
    uploads.push(upload);
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

function buildUploadFileMetadata(file) {
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

  const { studentColumns, columns, creditColumnBySubjectTermMappingId, attemptColumnBySubjectTermMappingId, dataStartIndex } = buildMarkColumns(
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
  const resultItems = [];
  let created = 0;
  let updated = 0;
  const errors = [];
  const attemptByStudentSubject = new Map();
  for (const resultItem of context.marksByKey.values()) {
    const subjectKey = `${resultItem.studentId}_${resultItem.curriculumSubjectTermMappingId}`;
    const existingAttempt = resultItem.attempt != null ? Number(resultItem.attempt) : 1;
    const currentAttempt = attemptByStudentSubject.get(subjectKey);
    if (currentAttempt == null || existingAttempt > currentAttempt) {
      attemptByStudentSubject.set(subjectKey, existingAttempt);
    }
  }

  for (let rowIndex = dataStartIndex; rowIndex < sheetRows.length; rowIndex++) {
    const row = sheetRows[rowIndex];
    if (!row) {
      continue;
    }
    const enrollmentNumber =
      studentColumns.enrollmentNumber != null ? cellText(row[studentColumns.enrollmentNumber]) : '';
    const fullName = studentColumns.fullName != null ? cellText(row[studentColumns.fullName]) : '';
    const studentIdText = studentColumns.studentId != null ? cellText(row[studentColumns.studentId]) : '';
    if (!enrollmentNumber && !fullName && !studentIdText) {
      continue;
    }

    const student = findUploadedStudent(row, studentColumns, lookup);
    if (!student) {
      errors.push(
        `Row ${rowIndex + 1}: student not found (${enrollmentNumber || fullName || studentIdText})`,
      );
      continue;
    }

    const creditBySubjectTermMappingId = new Map();
    for (const [curriculumSubjectTermMappingId, creditColumnIndex] of creditColumnBySubjectTermMappingId) {
      const creditValue = parseMoneyInput(row[creditColumnIndex]);
      if (creditValue == null || Number.isNaN(creditValue) || decimalGreaterThan(0, creditValue)) {
        creditBySubjectTermMappingId.set(curriculumSubjectTermMappingId, 0);
      } else {
        creditBySubjectTermMappingId.set(curriculumSubjectTermMappingId, creditValue);
      }
    }

    const attemptBySubjectTermMappingId = new Map();
    for (const [curriculumSubjectTermMappingId, attemptColumnIndex] of attemptColumnBySubjectTermMappingId) {
      const attemptValue = parseAttemptInput(row[attemptColumnIndex]);
      if (attemptValue == null) {
        continue;
      }
      if (Number.isNaN(attemptValue)) {
        errors.push(
          `Row ${rowIndex + 1}: invalid attempt for subject`,
        );
        continue;
      }
      attemptBySubjectTermMappingId.set(curriculumSubjectTermMappingId, attemptValue);
    }

    for (const column of columns) {
      const obtainedMarks = parseMoneyInput(row[column.columnIndex]);
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
      const subjectKey = `${student.studentId}_${column.curriculumSubjectTermMappingId}`;
      let attempt = attemptBySubjectTermMappingId.get(column.curriculumSubjectTermMappingId);
      if (attempt == null) {
        attempt = attemptByStudentSubject.get(subjectKey);
      }
      if (attempt == null) {
        attempt = 1;
      }
      attemptByStudentSubject.set(subjectKey, attempt);
      resultItems.push({
        studentId: student.studentId,
        curriculumSubjectTermMappingId: column.curriculumSubjectTermMappingId,
        assessmentPlanComponentId: column.assessmentPlanComponentId,
        maximumMarks: column.maximumMarks,
        obtainedMarks,
        creditEarned: creditBySubjectTermMappingId.get(column.curriculumSubjectTermMappingId) || 0,
        attempt,
      });
    }
  }

  if (errors.length > 0) {
    const error = new Error(errors[0]);
    error.statusCode = 400;
    error.details = errors;
    throw error;
  }
  if (resultItems.length === 0) {
    return {
      created: 0,
      updated: 0,
    };
  }

  const transaction = await sequelize.transaction();
  try {
    await previousAcademicRepository.upsertStudentResultItems(resultItems, transaction);
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
