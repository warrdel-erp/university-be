import * as previousAcademicRepository from '../repository/previousAcademicRepository.js';
import { resolveTotalTerms } from '../utility/courseTerms.js';
import { resolveActiveAcademicYearContext } from '../utility/curriculumSubjectsByActiveYear.js';
import sequelize from '../database/sequelizeConfig.js';
import xlsx from 'xlsx';
import {
  decimalGreaterThan,
  parseMoneyInput,
  toMoneyNumber,
} from '../utility/decimalMoney.js';

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
  if (termMappings.length < totalTerms) {
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
      curriculum: `${termMappings.length}/${totalTerms} semesters configured`,
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
        });
      }
    }
    students.push({
      studentId: student.studentId,
      firstName: student.firstName,
      fullName: studentFullName(student),
      enrollment: student.enrollNumber,
      scholarNo: student.scholarNumber,
      batch: student.batchYear,
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

export async function getTermStudents(curriculumBatchTermMappingId, sessionId = null) {
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

export async function downloadTermMarksTemplate(curriculumBatchTermMappingId, sessionId = null) {
  const context = await loadTermMarksContext(curriculumBatchTermMappingId, sessionId);

  const subjectHeader = ['', '', ''];
  const columnHeader = ['studentId', 'Scholar No', 'Student Name'];
  const mapRows = [];
  const merges = [];

  for (const subject of context.subjects) {
    const startCol = columnHeader.length;
    for (const examType of subject.examSetupTypes) {
      if (columnHeader.length === startCol) {
        subjectHeader.push(`${subject.subjectCode} - ${subject.subjectName}`);
      } else {
        subjectHeader.push('');
      }
      columnHeader.push(examType.examName);
      mapRows.push({
        col: columnHeader.length - 1,
        subjectId: subject.subjectId,
        subjectCode: subject.subjectCode,
        curriculumSubjectTermMappingId: subject.curriculumSubjectTermMappingId,
        assessmentPlanComponentId: examType.assessmentPlanComponentId,
        examSetupTypeId: examType.examSetupTypeId,
        examName: examType.examName,
        maximumMarks: examType.maximumMarks,
      });
    }
    const endCol = columnHeader.length - 1;
    if (endCol > startCol) {
      merges.push({ s: { r: 2, c: startCol }, e: { r: 2, c: endCol } });
    }
  }

  const aoa = [
    [`Term ${context.term} · ${context.courseName} · Batch ${context.batch}`],
    [],
    subjectHeader,
    columnHeader,
  ];
  for (const student of context.students) {
    const row = [student.studentId, student.scholarNo || student.enrollment, student.fullName];
    for (const mark of student.marks) {
      row.push(mark.obtainedMarks == null ? '' : mark.obtainedMarks);
    }
    aoa.push(row);
  }

  const workbook = xlsx.utils.book_new();
  const marksSheet = xlsx.utils.aoa_to_sheet(aoa);
  if (merges.length > 0) {
    marksSheet['!merges'] = merges;
  }
  xlsx.utils.book_append_sheet(workbook, marksSheet, 'Marks');
  xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(mapRows), '_map');
  workbook.Workbook = { Sheets: [{ Hidden: 0 }, { Hidden: 1 }] };

  return {
    buffer: xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' }),
    fileName: `term-${context.term}-batch-${context.batch}-marks.xlsx`,
  };
}

export async function uploadTermMarks(curriculumBatchTermMappingId, file, sessionId = null) {
  if (!file?.data && !file?.buffer) {
    const error = new Error('Excel file is required (form-data field: marks)');
    error.statusCode = 400;
    throw error;
  }

  const context = await loadTermMarksContext(curriculumBatchTermMappingId, sessionId);
  const fileBuffer = file.data || file.buffer;
  const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
  const mapSheet = workbook.Sheets._map;
  const marksSheet = workbook.Sheets.Marks || workbook.Sheets[workbook.SheetNames[0]];
  if (!mapSheet || !marksSheet) {
    const error = new Error('Upload the downloaded marks template. Mapping sheet is missing.');
    error.statusCode = 400;
    throw error;
  }

  const mapRows = xlsx.utils.sheet_to_json(mapSheet, { defval: '' });
  const sheetRows = xlsx.utils.sheet_to_json(marksSheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  const studentsById = new Map();
  const studentsByEnrollment = new Map();
  const studentsByScholar = new Map();
  for (const student of context.students) {
    studentsById.set(Number(student.studentId), student);
    if (student.enrollment) {
      studentsByEnrollment.set(String(student.enrollment).trim(), student);
    }
    if (student.scholarNo) {
      studentsByScholar.set(String(student.scholarNo).trim(), student);
    }
  }

  const validComponentKeys = new Set();
  const componentMeta = new Map();
  for (const subject of context.subjects) {
    for (const examType of subject.examSetupTypes) {
      const key = `${subject.curriculumSubjectTermMappingId}_${examType.assessmentPlanComponentId}`;
      validComponentKeys.add(key);
      componentMeta.set(key, {
        curriculumSubjectTermMappingId: subject.curriculumSubjectTermMappingId,
        assessmentPlanComponentId: examType.assessmentPlanComponentId,
        maximumMarks: examType.maximumMarks,
        subjectCode: subject.subjectCode,
        examName: examType.examName,
      });
    }
  }

  const columns = [];
  for (const mapRow of mapRows) {
    const cstmId = Number(mapRow.curriculumSubjectTermMappingId);
    const componentId = Number(mapRow.assessmentPlanComponentId);
    const key = `${cstmId}_${componentId}`;
    if (!validComponentKeys.has(key)) {
      continue;
    }
    columns.push({
      col: Number(mapRow.col),
      ...componentMeta.get(key),
    });
  }

  if (columns.length === 0) {
    const error = new Error('No valid assessment components found in the uploaded sheet.');
    error.statusCode = 400;
    throw error;
  }

  const toCreate = [];
  const toUpdate = [];
  const errors = [];

  for (let rowIndex = 4; rowIndex < sheetRows.length; rowIndex++) {
    const row = sheetRows[rowIndex];
    if (!row) {
      continue;
    }
    const studentIdCell = row[0];
    const scholarOrEnrollment = row[1] != null ? String(row[1]).trim() : '';
    if (!studentIdCell && !scholarOrEnrollment) {
      continue;
    }

    let student = null;
    if (studentIdCell) {
      student = studentsById.get(Number(studentIdCell));
    }
    if (!student && scholarOrEnrollment) {
      student =
        studentsByScholar.get(scholarOrEnrollment) ||
        studentsByEnrollment.get(scholarOrEnrollment);
    }
    if (!student) {
      errors.push(`Row ${rowIndex + 1}: student not found (${scholarOrEnrollment || studentIdCell})`);
      continue;
    }

    for (const column of columns) {
      const rawValue = row[column.col];
      const obtainedMarks = parseMoneyInput(rawValue);
      if (obtainedMarks == null) {
        continue;
      }
      if (Number.isNaN(obtainedMarks) || decimalGreaterThan(0, obtainedMarks)) {
        errors.push(
          `Row ${rowIndex + 1}: invalid marks for ${column.subjectCode} ${column.examName}`,
        );
        continue;
      }
      if (decimalGreaterThan(obtainedMarks, column.maximumMarks)) {
        errors.push(
          `Row ${rowIndex + 1}: ${column.subjectCode} ${column.examName} exceeds maximum ${column.maximumMarks}`,
        );
        continue;
      }

      const existingKey = `${student.studentId}_${column.curriculumSubjectTermMappingId}_${column.assessmentPlanComponentId}`;
      const existing = context.marksByKey.get(existingKey);
      const payload = {
        studentId: student.studentId,
        curriculumSubjectTermMappingId: column.curriculumSubjectTermMappingId,
        assessmentPlanComponentId: column.assessmentPlanComponentId,
        maximumMarks: column.maximumMarks,
        obtainedMarks,
      };
      if (existing) {
        toUpdate.push({
          studentResultItemId: existing.studentResultItemId,
          payload,
        });
      } else {
        toCreate.push(payload);
      }
    }
  }

  if (errors.length > 0) {
    const error = new Error(errors[0]);
    error.statusCode = 400;
    error.details = errors;
    throw error;
  }

  if (toCreate.length === 0 && toUpdate.length === 0) {
    const error = new Error('No obtained marks found in the uploaded sheet.');
    error.statusCode = 400;
    throw error;
  }

  const transaction = await sequelize.transaction();
  try {
    if (toCreate.length > 0) {
      await previousAcademicRepository.createStudentResultItems(toCreate, transaction);
    }
    for (const item of toUpdate) {
      await previousAcademicRepository.updateStudentResultItem(
        item.studentResultItemId,
        item.payload,
        transaction,
      );
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  return {
    created: toCreate.length,
    updated: toUpdate.length,
  };
}
