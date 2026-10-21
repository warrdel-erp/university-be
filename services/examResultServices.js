import { Op, UniqueConstraintError } from "sequelize";
import crypto from "crypto";
import { mean, standardDeviation, zScore } from "simple-statistics";
import sequelize from "../database/sequelizeConfig.js";
import * as examResultRepository from "../repository/examResultRepository.js";
import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";
import {
  buildStudentGroupFromSchedule,
  lookupStudentCount,
} from "../utility/studentCount.js";
import { getStudentCountMapByGroups } from "./studentCountServices.js";
import { resolveSelectionCombinations } from "../utility/examScheduleSelection.js";
import {
  decimalAdd,
  decimalDivide,
  decimalMax,
  decimalMultiply,
  decimalSubtract,
  toMoneyNumber,
  toIntegerNumber,
} from "../utility/decimalMoney.js";

/**
 * Shared readiness from applicable exam schedules + this student's answer sheets.
 * sheetByExamScheduleId: Map(examScheduleId -> answerSheet plain row | undefined)
 */
export function calculateResultReadiness(
  applicableSchedules,
  sheetByExamScheduleId,
) {
  const exams = [];
  let submittedExams = 0;

  for (const schedule of applicableSchedules) {
    const plain = schedule.get ? schedule.get({ plain: true }) : schedule;
    const subject = plain.subjectSchedule;
    const examScheduleId = Number(plain.examScheduleId);
    const sheet = sheetByExamScheduleId.get(examScheduleId) || null;
    const isSubmitted = Boolean(sheet && sheet.markingStatus === "submit");

    if (isSubmitted) submittedExams = decimalAdd(submittedExams, 1);

    exams.push({
      examScheduleId,
      subjectId: Number(plain.subjectId),
      subjectName: subject.subjectName,
      subjectCode: subject.subjectCode,
      examDate: plain.examDate,
      answerSheetQrId: sheet ? sheet.id : null,
      answerSheetStatus: sheet ? sheet.markingStatus : null,
      isSubmitted,
      obtainedMarks:
        sheet == null || sheet.obtainedMarks == null
          ? null
          : toMoneyNumber(sheet.obtainedMarks),
      evaluatedAt: sheet ? sheet.evaluatedAt : null,
    });
  }

  const totalExams = exams.length;
  const pendingExams = decimalSubtract(totalExams, submittedExams);

  return {
    readiness: {
      status:
        totalExams > 0 && submittedExams === totalExams ? "READY" : "NOT_READY",
      totalExams,
      submittedExams,
      pendingExams,
    },
    exams,
  };
}

function schedulesForStudent(schedules, courseId, sessionId, term) {
  const applicable = [];
  for (const schedule of schedules) {
    const plain = schedule.get ? schedule.get({ plain: true }) : schedule;
    const rawCourseId = plain.subjectSchedule?.courseId || plain.courseId;
    const rawSessionId = plain.batch?.sessionId || plain.sessionId;
    if (rawCourseId != null && Number(rawCourseId) !== Number(courseId)) continue;
    if (rawSessionId != null && Number(rawSessionId) !== Number(sessionId)) continue;
    if (plain.term != null && Number(plain.term) !== Number(term)) continue;
    applicable.push(plain);
  }
  return applicable;
}

function sheetMapForStudent(sheets, studentId) {
  const map = new Map();
  for (const sheet of sheets) {
    if (Number(sheet.studentId) !== Number(studentId)) continue;
    map.set(Number(sheet.examScheduleId), sheet);
  }
  return map;
}

function toStudentSummary(row) {
  const plain = row.get({ plain: true });
  return {
    studentId: plain.studentId,
    studentName: plain.studentName || null,
    scholarNo: plain.scholarNumber,
    enrollNumber: plain.enrollNumber,
    admissionDate: plain.admisssionDate || null,
    courseId: plain.course.courseId,
    sessionId: plain.studentSession.sessionId,
    term: Number(plain.studentClassSectionTerm.term),
    course: plain.course,
    session: plain.studentSession,
  };
}

async function resolveGradingScheme({ gradingId, student, transaction }) {
  // 1. If explicit gradingId passed
  if (gradingId) {
    const scheme = await scoped(model.gradingModel).findOne({
      where: { gradingId: Number(gradingId) },
      include: [
        {
          model: model.gradingGradeModel,
          as: "grades",
          required: false,
        },
      ],
      order: [[{ model: model.gradingGradeModel, as: "grades" }, "sortOrder", "ASC"]],
      transaction,
    });
    if (scheme) return scheme;
  }

  // 2. Try resolving via Assessment Plan for student's course/batch
  if (student?.courseId) {
    const assessmentPlan = await scoped(model.assessmentPlanModel).findOne({
      where: {
        gradingId: { [Op.ne]: null },
      },
      include: [
        {
          model: model.gradingModel,
          as: "gradingScheme",
          include: [
            {
              model: model.gradingGradeModel,
              as: "grades",
              required: false,
            },
          ],
        },
      ],
      order: [["assessmentPlanId", "DESC"]],
      transaction,
    });
    if (assessmentPlan?.gradingScheme) {
      return assessmentPlan.gradingScheme;
    }
  }

  // 3. Fallback: Active published grading scheme in the institute
  const fallback = await scoped(model.gradingModel).findOne({
    where: { isActive: true },
    include: [
      {
        model: model.gradingGradeModel,
        as: "grades",
        required: false,
      },
    ],
    order: [
      ["gradingId", "DESC"],
      [{ model: model.gradingGradeModel, as: "grades" }, "sortOrder", "ASC"],
    ],
    transaction,
  });

  return fallback || null;
}

export function applyGradingToStudents(evaluatedStudents, gradingScheme) {
  if (!gradingScheme || !gradingScheme.grades || !gradingScheme.grades.length) {
    return evaluatedStudents.map((item) => ({
      ...item,
      zScore: null,
      grade: null,
      gradePoint: null,
      gradingId: gradingScheme?.gradingId ? Number(gradingScheme.gradingId) : null,
    }));
  }

  const isRelative = gradingScheme.gradingMethod === "RELATIVE";
  const grades = [...gradingScheme.grades].sort(
    (a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0),
  );

  if (!isRelative) {
    // ── ABSOLUTE GRADING ────────────────────────────────────────────────────
    return evaluatedStudents.map((item) => {
      let finalGrade = null;
      let finalGradePoint = null;
      const pct = item.percentage != null ? Number(item.percentage) : 0;

      for (const band of grades) {
        const minP = band.minPercentage != null ? Number(band.minPercentage) : -Infinity;
        const maxP = band.maxPercentage != null ? Number(band.maxPercentage) : Infinity;

        if (pct >= minP && pct <= maxP) {
          finalGrade = band.grade;
          finalGradePoint = band.gradePoint != null ? Number(band.gradePoint) : null;
          break;
        }
      }

      return {
        ...item,
        zScore: null,
        grade: finalGrade,
        gradePoint: finalGradePoint,
        gradingId: Number(gradingScheme.gradingId),
      };
    });
  }

  // ── RELATIVE GRADING (Z-SCORE) ──────────────────────────────────────────
  const failConfig = gradingScheme.relativeConfig?.failGradeAssignment;
  const minRawMarks =
    failConfig?.minRawMarks != null ? Number(failConfig.minRawMarks) : null;

  // 1. Separate students eligible for relative bell curve calculation
  const eligiblePercentages = [];
  for (const item of evaluatedStudents) {
    const pct = item.percentage != null ? Number(item.percentage) : 0;
    if (minRawMarks != null && pct < minRawMarks) {
      continue; // Fails directly by threshold, excluded from relative distribution
    }
    eligiblePercentages.push(pct);
  }

  // 2. Compute Mean and Standard Deviation using simple-statistics
  let classMean = 0;
  let classStdDev = 0;

  if (eligiblePercentages.length > 0) {
    classMean = mean(eligiblePercentages);
    classStdDev = eligiblePercentages.length > 1 ? standardDeviation(eligiblePercentages) : 0;
  }

  // 3. Find Rule-based fail band or fallback to last band
  const failBand =
    grades.find((b) => b.isRuleBased || b.isPass === false) ||
    grades[grades.length - 1];

  // 4. Assign Z-Score and map to grade bands
  return evaluatedStudents.map((item) => {
    const pct = item.percentage != null ? Number(item.percentage) : 0;

    // Check if student failed the minimum raw threshold
    if (minRawMarks != null && pct < minRawMarks) {
      const calculatedZ =
        classStdDev === 0
          ? 0
          : Number(zScore(pct, classMean, classStdDev).toFixed(4));

      return {
        ...item,
        zScore: calculatedZ,
        grade: failBand ? failBand.grade : "F",
        gradePoint: failBand?.gradePoint != null ? Number(failBand.gradePoint) : 0,
        gradingId: Number(gradingScheme.gradingId),
      };
    }

    // Normal Z-Score calculation
    const calculatedZ =
      classStdDev === 0
        ? 0
        : Number(zScore(pct, classMean, classStdDev).toFixed(4));

    let finalGrade = null;
    let finalGradePoint = null;

    // Match with lowerBound and upperBound
    for (const band of grades) {
      if (band.isRuleBased) continue; // Skip rule-based fail bands for eligible students

      const lower = band.lowerBound != null ? Number(band.lowerBound) : -Infinity;
      const upper = band.upperBound != null ? Number(band.upperBound) : Infinity;

      if (calculatedZ >= lower && (band.upperBound == null || calculatedZ < upper)) {
        finalGrade = band.grade;
        finalGradePoint = band.gradePoint != null ? Number(band.gradePoint) : null;
        break;
      }
    }

    // Fallback if boundary wasn't hit
    if (!finalGrade && grades.length > 0) {
      const fallbackBand = calculatedZ < 0 ? grades[grades.length - 1] : grades[0];
      finalGrade = fallbackBand.grade;
      finalGradePoint = fallbackBand.gradePoint != null ? Number(fallbackBand.gradePoint) : null;
    }

    return {
      ...item,
      zScore: calculatedZ,
      grade: finalGrade,
      gradePoint: finalGradePoint,
      gradingId: Number(gradingScheme.gradingId),
    };
  });
}

async function resolveContext(query) {
  const examSession = await examResultRepository.findExaminationSession(
    query.examinationSessionId,
  );
  if (!examSession) {
    const err = new Error("Examination session not found.");
    err.statusCode = 404;
    throw err;
  }

  const examinationSession = {
    examinationSessionId: examSession.examinationSessionId,
    sessionName: examSession.sessionName,
    assessmentTypeId: examSession.assessmentTypeId,
    status: examSession.status,
  };

  let terms = [];
  for (const row of examSession.examinationSessionTerms || []) {
    terms.push(Number(row.term));
  }

  let classSectionOr = null;
  if (query.selections?.length) {
    const filterCombinations = await resolveSelectionCombinations(query.selections);
    classSectionOr = [];
    terms = [];
    const termSeen = new Set();

    for (const comb of filterCombinations) {
      if (comb.courseId != null && comb.sessionId != null) {
        classSectionOr.push({
          courseId: Number(comb.courseId),
          sessionId: Number(comb.sessionId),
        });
      }

      for (const term of comb.terms || []) {
        const termNumber = Number(term);
        if (termSeen.has(termNumber)) continue;
        termSeen.add(termNumber);
        terms.push(termNumber);
      }
    }

    if (!classSectionOr.length || !terms.length) {
      return { examinationSession, empty: true };
    }
  }

  if (!terms.length) {
    return { examinationSession, empty: true };
  }

  return { examinationSession, terms, classSectionOr, empty: false };
}

export async function listStudents(query) {
  const page = query.page;
  const limit = query.limit;
  const filterStatus = query.filterStatus;
  const context = await resolveContext(query);

  if (context.empty) {
    return {
      data: { examinationSession: context.examinationSession, items: [] },
      pagination: { page, limit, total: 0, totalPages: 0 },
    };
  }

  const studentQuery = {
    search: query.search,
    terms: context.terms,
    examinationSessionId: context.examinationSession.examinationSessionId,
    classSectionOr: context.classSectionOr,
  };

  // Status filter needs readiness + published flags before paging
  if (!filterStatus) {
    studentQuery.limit = limit;
    studentQuery.offset = (page - 1) * limit;
  }

  const { rows, count } = await examResultRepository.findStudents(studentQuery);

  const items = [];
  const studentIds = [];
  const courseIds = new Set();
  const sessionIds = new Set();
  const termSet = new Set();

  for (const row of rows) {
    const student = toStudentSummary(row);
    items.push(student);
    studentIds.push(student.studentId);
    courseIds.add(student.courseId);
    sessionIds.add(student.sessionId);
    termSet.add(student.term);
  }

  if (items.length) {
    const examinationSessionId =
      context.examinationSession.examinationSessionId;

    const [schedules, sheets, publishedRows] = await Promise.all([
      examResultRepository.findExamSchedulesByExaminationSessionId(
        examinationSessionId,
        {
          courseIds: [...courseIds],
          sessionIds: [...sessionIds],
          terms: [...termSet],
        },
      ),
      examResultRepository.findAnswerSheetsByStudentsAndExaminationSession(
        studentIds,
        examinationSessionId,
      ),
      examResultRepository.findStudentResultsByExaminationSessionAndStudentIds(
        examinationSessionId,
        studentIds,
      ),
    ]);

    const publishedByKey = new Map();
    for (const result of publishedRows) {
      const plain = result.get ? result.get({ plain: true }) : result;
      const key = `${Number(plain.studentId)}_${Number(plain.courseId)}_${Number(plain.sessionId)}_${Number(plain.term)}`;
      publishedByKey.set(key, plain);
    }

    for (const item of items) {
      const applicable = schedulesForStudent(
        schedules,
        item.courseId,
        item.sessionId,
        item.term,
      );
      const { readiness } = calculateResultReadiness(
        applicable,
        sheetMapForStudent(sheets, item.studentId),
      );

      const published = publishedByKey.get(
        `${Number(item.studentId)}_${Number(item.courseId)}_${Number(item.sessionId)}_${Number(item.term)}`,
      );
      item.totalExams = readiness.totalExams;
      item.submittedExams = readiness.submittedExams;
      item.pendingExams = readiness.pendingExams;
      item.readinessStatus = readiness.status;
      item.isPublished = Boolean(published);
      item.studentResultId = published
        ? Number(published.studentResultId)
        : null;
      item.percentage =
        published && published.percentage != null
          ? toMoneyNumber(published.percentage)
          : null;
      item.grade = published ? published.grade || null : null;
      item.gradePoint =
        published && published.gradePoint != null
          ? toMoneyNumber(published.gradePoint)
          : null;
      item.zScore =
        published && published.zScore != null
          ? Number(published.zScore)
          : null;

      // Published wins; otherwise use answer-sheet readiness
      if (published) {
        item.filterStatus = published.resultStatus === "Generated" ? "Generated" : "Published";
      } else if (readiness.status === "READY") {
        item.filterStatus = "Ready";
      } else {
        item.filterStatus = "NotReady";
      }

      delete item.course;
      delete item.session;
    }
  }

  let filteredItems = items;
  let total = count;

  if (filterStatus) {
    filteredItems = [];
    for (const item of items) {
      if (item.filterStatus !== filterStatus) continue;
      filteredItems.push(item);
    }
    total = filteredItems.length;
    const offset = (page - 1) * limit;
    filteredItems = filteredItems.slice(offset, offset + limit);
  }

  return {
    data: {
      examinationSession: context.examinationSession,
      items: filteredItems,
    },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    },
  };
}

export async function getStudentById(studentId, query) {
  const context = await resolveContext(query);
  if (context.empty) {
    const err = new Error("Student not found for exam result.");
    err.statusCode = 404;
    throw err;
  }

  const row = await examResultRepository.findOneStudent({
    studentId,
    terms: context.terms,
    classSectionOr: context.classSectionOr,
  });
  if (!row) {
    const err = new Error("Student not found for exam result.");
    err.statusCode = 404;
    throw err;
  }

  const student = toStudentSummary(row);
  const examinationSessionId = context.examinationSession.examinationSessionId;

  const [schedules, sheets] = await Promise.all([
    examResultRepository.findExamSchedulesByExaminationSessionId(
      examinationSessionId,
      {
        courseIds: [student.courseId],
        sessionIds: [student.sessionId],
        terms: [student.term],
      },
    ),
    examResultRepository.findAnswerSheetsByStudentsAndExaminationSession(
      [student.studentId],
      examinationSessionId,
    ),
  ]);

  const applicable = schedulesForStudent(
    schedules,
    student.courseId,
    student.sessionId,
    student.term,
  );
  const { readiness, exams } = calculateResultReadiness(
    applicable,
    sheetMapForStudent(sheets, student.studentId),
  );

  return {
    examinationSession: context.examinationSession,
    student: {
      studentId: student.studentId,
      studentName: student.studentName,
      scholarNo: student.scholarNo,
      enrollNumber: student.enrollNumber,
      admissionDate: student.admissionDate,
      courseId: student.courseId,
      sessionId: student.sessionId,
      term: student.term,
      course: student.course,
      session: student.session,
    },
    readiness,
    exams,
  };
}

function emptySku(examinationSessionId) {
  return {
    examinationSessionId: Number(examinationSessionId),
    totalExams: 0,
    totalStudents: 0,
    totalAnswerSheets: 0,
    checked: 0,
    notChecked: 0,
    ready: 0,
    notReady: 0,
  };
}

/**
 * Flat SKU card for an examination session.
 * totalStudents = same whole-term count as examination session list
 * checked = answerSheetQr.markingStatus submit
 * ready = student has every applicable schedule submitted
 */
export async function getSku(query) {
  const examinationSessionId = Number(query.examinationSessionId);

  const examSession =
    await examResultRepository.findExaminationSession(examinationSessionId);
  if (!examSession) {
    const err = new Error("Examination session not found.");
    err.statusCode = 404;
    throw err;
  }

  const terms = [];
  const courseSessionCombos = [];
  for (const row of examSession.examinationSessionTerms || []) {
    if (row.term != null) terms.push(Number(row.term));
    if (row.courseId != null && row.sessionId != null) {
      courseSessionCombos.push({
        courseId: Number(row.courseId),
        sessionId: Number(row.sessionId),
      });
    }
  }

  if (!terms.length) {
    return emptySku(examinationSessionId);
  }

  const [totalExams, sheetSku, scheduleRows] = await Promise.all([
    examResultRepository.countExamSchedulesByExaminationSessionId(
      examinationSessionId,
    ),
    examResultRepository.countAnswerSheetSkuByExaminationSessionId(
      examinationSessionId,
    ),
    examResultRepository.findExamScheduleContextsByExaminationSessionId(
      examinationSessionId,
    ),
  ]);

  const studentGroups = [];
  for (const row of scheduleRows) {
    const group = buildStudentGroupFromSchedule(row);
    if (group) studentGroups.push(group);
  }
  const studentCountMap = studentGroups.length
    ? await getStudentCountMapByGroups(studentGroups)
    : new Map();

  let studentTotal = 0;
  const seenGroupKeys = new Set();
  for (const group of studentGroups) {
    const key = [
      group.sessionId,
      group.courseId,
      group.term,
      group.batchId,
    ].join("_");
    if (seenGroupKeys.has(key)) continue;
    seenGroupKeys.add(key);
    studentTotal = toIntegerNumber(
      decimalAdd(studentTotal, lookupStudentCount(studentCountMap, group)),
    );
  }

  if (!totalExams || !scheduleRows.length) {
    return {
      examinationSessionId,
      totalExams: Number(totalExams) || 0,
      totalStudents: studentTotal,
      totalAnswerSheets: sheetSku.totalAnswerSheets,
      checked: sheetSku.checked,
      notChecked: sheetSku.notChecked,
      ready: 0,
      notReady: studentTotal,
    };
  }

  const schedules = [];
  for (const row of scheduleRows) {
    const plain = row.get ? row.get({ plain: true }) : row;
    const rawSessionId = plain.batch?.sessionId || plain.sessionId;
    const rawCourseId = plain.subjectSchedule?.courseId || plain.courseId;
    schedules.push({
      examScheduleId: Number(plain.examScheduleId),
      courseId: rawCourseId != null ? Number(rawCourseId) : null,
      sessionId: rawSessionId != null ? Number(rawSessionId) : null,
      term: plain.term == null ? null : Number(plain.term),
    });
  }

  const [studentRows, submitPairs] = await Promise.all([
    examResultRepository.findApplicableStudentContexts({
      terms,
      courseSessionCombos,
      examinationSessionId,
    }),
    examResultRepository.findSubmittedAnswerSheetPairsByExaminationSessionId(
      examinationSessionId,
    ),
  ]);

  const submitSet = new Set();
  for (const pair of submitPairs) {
    submitSet.add(`${Number(pair.studentId)}-${Number(pair.examScheduleId)}`);
  }

  let ready = 0;
  const studentSeen = new Set();

  for (const row of studentRows) {
    const studentId = Number(row.studentId);
    if (studentSeen.has(studentId)) continue;
    studentSeen.add(studentId);

    const courseId = Number(row.courseId);
    const sessionId = Number(row.sessionId);
    const term = Number(row.studentClassSectionTerm.term);

    const applicable = [];
    for (const schedule of schedules) {
      if (schedule.courseId != null && schedule.courseId !== courseId) continue;
      if (schedule.sessionId != null && schedule.sessionId !== sessionId) continue;
      if (schedule.term != null && schedule.term !== term) continue;
      applicable.push(schedule);
    }

    // No applicable exams => NOT_READY (same as list/detail readiness)
    if (!applicable.length) continue;

    let isReady = true;
    for (const schedule of applicable) {
      if (!submitSet.has(`${studentId}-${schedule.examScheduleId}`)) {
        isReady = false;
        break;
      }
    }
    if (isReady) ready = decimalAdd(ready, 1);
  }

  return {
    examinationSessionId,
    totalExams: Number(totalExams) || 0,
    totalStudents: studentTotal,
    totalAnswerSheets: sheetSku.totalAnswerSheets,
    checked: sheetSku.checked,
    notChecked: sheetSku.notChecked,
    ready,
    notReady: decimalMax(0, decimalSubtract(studentTotal, ready)),
  };
}

/**
 * Create student_result headers for one or more students in an examination session.
 * Subject marks live on answerSheetQr (student_result_subject).
 * Requires readiness READY (every applicable schedule submitted).
 */
export async function createExaminationSessionResult(body) {
  const examinationSessionId = Number(body.examinationSessionId);
  const requestedGradingId = body.gradingId != null ? Number(body.gradingId) : null;
  const studentIds = [];
  const studentIdSeen = new Set();
  for (const studentId of body.studentIds) {
    const id = Number(studentId);
    if (studentIdSeen.has(id)) continue;
    studentIdSeen.add(id);
    studentIds.push(id);
  }

  const context = await resolveContext({ examinationSessionId });
  if (context.empty) {
    const err = new Error("Examination session has no applicable terms.");
    err.statusCode = 400;
    throw err;
  }

  const transaction = await sequelize.transaction();

  try {
    // -------------------------------------------------------------
    // PASS 1: Validate readiness and collect marks for all students
    // -------------------------------------------------------------
    const evaluatedStudents = [];

    for (const studentId of studentIds) {
      const row = await examResultRepository.findOneStudent({
        studentId,
        terms: context.terms,
        classSectionOr: context.classSectionOr,
      });
      if (!row) {
        const err = new Error(
          `Student not found for exam result. studentId=${studentId}`,
        );
        err.statusCode = 404;
        throw err;
      }

      const student = toStudentSummary(row);

      const [schedules, sheets] = await Promise.all([
        examResultRepository.findExamSchedulesByExaminationSessionId(
          examinationSessionId,
          {
            courseIds: [student.courseId],
            sessionIds: [student.sessionId],
            terms: [student.term],
          },
        ),
        examResultRepository.findAnswerSheetsByStudentsAndExaminationSession(
          [student.studentId],
          examinationSessionId,
        ),
      ]);

      const applicable = schedulesForStudent(
        schedules,
        student.courseId,
        student.sessionId,
        student.term,
      );
      const { readiness, exams } = calculateResultReadiness(
        applicable,
        sheetMapForStudent(sheets, student.studentId),
      );

      if (!applicable.length) {
        const err = new Error(
          `No applicable exams found for this student. studentId=${studentId}`,
        );
        err.statusCode = 400;
        throw err;
      }

      if (readiness.status !== "READY") {
        const err = new Error(
          `Student result is not ready. All answer sheets must be submitted. studentId=${studentId}`,
        );
        err.statusCode = 400;
        throw err;
      }

      const existing = await examResultRepository.findStudentResult(
        {
          examinationSessionId,
          studentId: student.studentId,
          courseId: student.courseId,
          sessionId: student.sessionId,
          term: student.term,
        },
        transaction,
      );
      if (existing) {
        const err = new Error(
          `Student result already exists for this examination session. studentId=${studentId}`,
        );
        err.statusCode = 409;
        throw err;
      }

      const maximumByScheduleId = new Map();
      for (const schedule of applicable) {
        maximumByScheduleId.set(
          Number(schedule.examScheduleId),
          toMoneyNumber(schedule.maximumMarks),
        );
      }

      let totalMarks = 0;
      let obtainedMarks = 0;
      for (const exam of exams) {
        totalMarks = decimalAdd(
          totalMarks,
          maximumByScheduleId.get(exam.examScheduleId) || 0,
        );
        obtainedMarks = decimalAdd(
          obtainedMarks,
          toMoneyNumber(exam.obtainedMarks),
        );
      }

      const percentage =
        totalMarks === 0
          ? null
          : decimalMultiply(decimalDivide(obtainedMarks, totalMarks), 100);

      evaluatedStudents.push({
        student,
        applicable,
        readiness,
        exams,
        totalMarks,
        obtainedMarks,
        percentage: percentage == null ? null : toMoneyNumber(percentage),
      });
    }

    // -------------------------------------------------------------
    // RESOLVE GRADING SCHEME (Absolute vs Relative)
    // -------------------------------------------------------------
    const sampleStudent = evaluatedStudents[0]?.student;
    const gradingScheme = await resolveGradingScheme({
      gradingId: requestedGradingId,
      student: sampleStudent,
      transaction,
    });

    // -------------------------------------------------------------
    // APPLY GRADING (Handles both ABSOLUTE and RELATIVE Z-score)
    // -------------------------------------------------------------
    const gradedStudents = applyGradingToStudents(evaluatedStudents, gradingScheme);

    // -------------------------------------------------------------
    // PASS 2: Save results to database
    // -------------------------------------------------------------
    const createdResults = [];

    for (const item of gradedStudents) {
      const created = await examResultRepository.createStudentResult(
        {
          examinationSessionId,
          studentId: item.student.studentId,
          courseId: item.student.courseId,
          sessionId: item.student.sessionId,
          term: item.student.term,
          totalMarks: item.totalMarks,
          obtainedMarks: item.obtainedMarks,
          percentage: item.percentage,
          zScore: item.zScore,
          grade: item.grade,
          gradePoint: item.gradePoint,
          gradingId: item.gradingId,
          resultStatus: "Generated",
        },
        transaction,
      );

      const plain = created.get({ plain: true });
      createdResults.push({
        studentResult: {
          studentResultId: Number(plain.studentResultId),
          examinationSessionId: Number(plain.examinationSessionId),
          studentId: Number(plain.studentId),
          courseId: Number(plain.courseId),
          sessionId: Number(plain.sessionId),
          term: Number(plain.term),
          totalMarks: toMoneyNumber(plain.totalMarks),
          obtainedMarks: toMoneyNumber(plain.obtainedMarks),
          percentage:
            plain.percentage == null ? null : toMoneyNumber(plain.percentage),
          zScore: plain.zScore == null ? null : Number(plain.zScore),
          grade: plain.grade || null,
          gradePoint:
            plain.gradePoint == null ? null : toMoneyNumber(plain.gradePoint),
          gradingId: plain.gradingId ? Number(plain.gradingId) : null,
          resultStatus: plain.resultStatus,
        },
        readiness: item.readiness,
        subjects: item.exams,
      });
    }

    await transaction.commit();

    return {
      examinationSession: context.examinationSession,
      items: createdResults,
    };
  } catch (error) {
    await transaction.rollback();
    if (error instanceof UniqueConstraintError) {
      const err = new Error(
        "Student result already exists for this examination session.",
      );
      err.statusCode = 409;
      throw err;
    }
    throw error;
  }
}

export async function getStudentResultDetails(query) {
  const examinationSessionId = Number(query.examinationSessionId);
  const studentId = Number(query.studentId);

  const examSession =
    await examResultRepository.findExaminationSession(examinationSessionId);
  if (!examSession) {
    const err = new Error("Examination session not found.");
    err.statusCode = 404;
    throw err;
  }

  const result = await examResultRepository.findStudentResult({
    studentId,
    examinationSessionId,
  });
  if (!result) {
    const err = new Error("Student result not found.");
    err.statusCode = 404;
    throw err;
  }

  const plainResult = result.get({ plain: true });

  const studentRow = await examResultRepository.findOneStudent({
    studentId,
    terms: [Number(plainResult.term)],
    examinationSessionId,
    classSectionOr: [
      {
        courseId: Number(plainResult.courseId),
        sessionId: Number(plainResult.sessionId),
      },
    ],
  });

  const [schedules, sheets] = await Promise.all([
    examResultRepository.findExamSchedulesByExaminationSessionId(
      examinationSessionId,
      {
        courseIds: [Number(plainResult.courseId)],
        sessionIds: [Number(plainResult.sessionId)],
        terms: [Number(plainResult.term)],
      },
    ),
    examResultRepository.findAnswerSheetsByStudentsAndExaminationSession(
      [studentId],
      examinationSessionId,
    ),
  ]);

  const applicable = schedulesForStudent(
    schedules,
    plainResult.courseId,
    plainResult.sessionId,
    plainResult.term,
  );
  const { readiness, exams } = calculateResultReadiness(
    applicable,
    sheetMapForStudent(sheets, studentId),
  );

  const student = studentRow
    ? toStudentSummary(studentRow)
    : {
        studentId,
        studentName: null,
        scholarNo: null,
        enrollNumber: null,
        admissionDate: null,
        courseId: Number(plainResult.courseId),
        sessionId: Number(plainResult.sessionId),
        term: Number(plainResult.term),
        course: null,
        session: null,
      };

  return {
    examinationSession: {
      examinationSessionId: examSession.examinationSessionId,
      sessionName: examSession.sessionName,
      assessmentTypeId: examSession.assessmentTypeId,
      status: examSession.status,
    },
    student: {
      studentId: student.studentId,
      studentName: student.studentName,
      scholarNo: student.scholarNo,
      enrollNumber: student.enrollNumber,
      admissionDate: student.admissionDate,
      courseId: student.courseId,
      sessionId: student.sessionId,
      term: student.term,
      course: student.course,
      session: student.session,
    },
    studentResult: {
      studentResultId: Number(plainResult.studentResultId),
      examinationSessionId: Number(plainResult.examinationSessionId),
      studentId: Number(plainResult.studentId),
      courseId: Number(plainResult.courseId),
      sessionId: Number(plainResult.sessionId),
      term: Number(plainResult.term),
      totalMarks:
        plainResult.totalMarks == null
          ? null
          : toMoneyNumber(plainResult.totalMarks),
      obtainedMarks:
        plainResult.obtainedMarks == null
          ? null
          : toMoneyNumber(plainResult.obtainedMarks),
      percentage:
        plainResult.percentage == null
          ? null
          : toMoneyNumber(plainResult.percentage),
      zScore: plainResult.zScore == null ? null : Number(plainResult.zScore),
      grade: plainResult.grade || null,
      gradePoint:
        plainResult.gradePoint == null ? null : toMoneyNumber(plainResult.gradePoint),
      gradingId: plainResult.gradingId ? Number(plainResult.gradingId) : null,
      sgpa: plainResult.sgpa == null ? null : toMoneyNumber(plainResult.sgpa),
      cgpa: plainResult.cgpa == null ? null : toMoneyNumber(plainResult.cgpa),
      resultStatus: plainResult.resultStatus,
    },
    readiness,
    exams,
  };
}

export async function publishExaminationSessionResults(body) {
  const examinationSessionId = Number(body.examinationSessionId);
  const studentIds = [];
  const studentIdSeen = new Set();
  for (const studentId of body.studentIds) {
    const id = Number(studentId);
    if (studentIdSeen.has(id)) continue;
    studentIdSeen.add(id);
    studentIds.push(id);
  }

  if (!studentIds.length) {
    const err = new Error("No valid student IDs provided.");
    err.statusCode = 400;
    throw err;
  }

  const transaction = await sequelize.transaction();
  try {
    const results = await examResultRepository.findStudentResultsByExaminationSessionAndStudentIds(
      examinationSessionId,
      studentIds,
      transaction,
    );

    if (results.length !== studentIds.length) {
      const err = new Error("Some student results are not generated yet.");
      err.statusCode = 400;
      throw err;
    }

    for (const result of results) {
      if (result.resultStatus === "Published") {
        const err = new Error(`Student result already published for studentId=${result.studentId}`);
        err.statusCode = 400;
        throw err;
      }
    }

    const publishBatchId = crypto.randomUUID();
    const publishedAt = new Date();

    await examResultRepository.updateStudentResults(
      {
        examinationSessionId,
        studentId: studentIds,
      },
      {
        resultStatus: "Published",
        publishedAt,
        publishBatchId,
      },
      transaction,
    );

    await transaction.commit();

    return {
      message: "Results published successfully.",
      publishBatchId,
      publishedCount: results.length,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function getPublishHistory(query) {
  const examinationSessionId = Number(query.examinationSessionId);
  const batches = await examResultRepository.findPublishBatches(examinationSessionId);
  return batches;
}

export async function getPublishHistoryByBatchId(publishBatchId) {
  const results = await examResultRepository.findStudentResultsByBatchId(publishBatchId);
  return results;
}

/**
 * Returns complete step-by-step calculation breakdown for relative (Z-Score) or absolute grading.
 * Designed for frontend stepper, worked example table, and cohort summary cards.
 * Read-only / dry-run (no DB writes).
 */
export async function getCalculationBreakdown(body) {
  const examinationSessionId = Number(body.examinationSessionId);
  const requestedGradingId = body.gradingId != null ? Number(body.gradingId) : null;
  const studentIds = [];
  const studentIdSeen = new Set();
  for (const studentId of body.studentIds) {
    const id = Number(studentId);
    if (studentIdSeen.has(id)) continue;
    studentIdSeen.add(id);
    studentIds.push(id);
  }

  const context = await resolveContext({ examinationSessionId });
  if (context.empty) {
    const err = new Error("Examination session has no applicable terms.");
    err.statusCode = 400;
    throw err;
  }

  const evaluatedStudents = [];

  for (const studentId of studentIds) {
    const row = await examResultRepository.findOneStudent({
      studentId,
      terms: context.terms,
      classSectionOr: context.classSectionOr,
    });
    if (!row) {
      const err = new Error(
        `Student not found for exam result. studentId=${studentId}`,
      );
      err.statusCode = 404;
      throw err;
    }

    const student = toStudentSummary(row);

    const [schedules, sheets] = await Promise.all([
      examResultRepository.findExamSchedulesByExaminationSessionId(
        examinationSessionId,
        {
          courseIds: [student.courseId],
          sessionIds: [student.sessionId],
          terms: [student.term],
        },
      ),
      examResultRepository.findAnswerSheetsByStudentsAndExaminationSession(
        [student.studentId],
        examinationSessionId,
      ),
    ]);

    const applicable = schedulesForStudent(
      schedules,
      student.courseId,
      student.sessionId,
      student.term,
    );
    const { readiness, exams } = calculateResultReadiness(
      applicable,
      sheetMapForStudent(sheets, student.studentId),
    );

    if (!applicable.length) {
      const err = new Error(
        `No applicable exams found for this student. studentId=${studentId}`,
      );
      err.statusCode = 400;
      throw err;
    }

    if (readiness.status !== "READY") {
      const err = new Error(
        `Student result is not ready. All answer sheets must be submitted. studentId=${studentId}`,
      );
      err.statusCode = 400;
      throw err;
    }

    const maximumByScheduleId = new Map();
    for (const schedule of applicable) {
      maximumByScheduleId.set(
        Number(schedule.examScheduleId),
        toMoneyNumber(schedule.maximumMarks),
      );
    }

    let totalMarks = 0;
    let obtainedMarks = 0;
    for (const exam of exams) {
      totalMarks = decimalAdd(
        totalMarks,
        maximumByScheduleId.get(exam.examScheduleId) || 0,
      );
      obtainedMarks = decimalAdd(
        obtainedMarks,
        toMoneyNumber(exam.obtainedMarks),
      );
    }

    const percentage =
      totalMarks === 0
        ? null
        : decimalMultiply(decimalDivide(obtainedMarks, totalMarks), 100);

    evaluatedStudents.push({
      student,
      applicable,
      readiness,
      exams,
      totalMarks,
      obtainedMarks,
      percentage: percentage == null ? null : toMoneyNumber(percentage),
    });
  }

  // Resolve grading scheme
  const sampleStudent = evaluatedStudents[0]?.student;
  const gradingScheme = await resolveGradingScheme({
    gradingId: requestedGradingId,
    student: sampleStudent,
  });

  if (!gradingScheme) {
    const err = new Error("No grading scheme found for this examination session.");
    err.statusCode = 400;
    throw err;
  }

  const isRelative = gradingScheme.gradingMethod === "RELATIVE";
  const grades = gradingScheme.grades
    ? [...gradingScheme.grades].sort(
        (a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0),
      )
    : [];

  const failBand =
    grades.find((b) => b.isRuleBased || b.isPass === false) ||
    grades[grades.length - 1];

  const failConfig = gradingScheme.relativeConfig?.failGradeAssignment;
  const minRawMarks =
    failConfig?.minRawMarks != null ? Number(failConfig.minRawMarks) : null;

  // Grade Bands formatted according to developer specification
  const gradeBands = grades.map((b) => {
    let zRange = "N/A";
    if (b.isRuleBased) {
      zRange = minRawMarks != null ? `Score < ${minRawMarks} (Rule-based)` : "Rule-based";
    } else if (b.lowerBound != null && b.upperBound != null) {
      const lower = Number(b.lowerBound);
      const upper = Number(b.upperBound);
      zRange = `${lower >= 0 ? "+" : ""}${lower.toFixed(2)} <= z < ${upper >= 0 ? "+" : ""}${upper.toFixed(2)}`;
    } else if (b.lowerBound != null) {
      const lower = Number(b.lowerBound);
      zRange = `z >= ${lower >= 0 ? "+" : ""}${lower.toFixed(2)}`;
    } else if (b.upperBound != null) {
      const upper = Number(b.upperBound);
      zRange = `z < ${upper >= 0 ? "+" : ""}${upper.toFixed(2)}`;
    }

    return {
      grade: b.grade,
      gradePoint: b.gradePoint != null ? toMoneyNumber(b.gradePoint) : null,
      zRange,
      minPercentage: b.minPercentage != null ? toMoneyNumber(b.minPercentage) : null,
      maxPercentage: b.maxPercentage != null ? toMoneyNumber(b.maxPercentage) : null,
      lowerBound: b.lowerBound != null ? Number(b.lowerBound) : null,
      upperBound: b.upperBound != null ? Number(b.upperBound) : null,
      isRuleBased: Boolean(b.isRuleBased),
      developerTreatment: "Policy data - not hard-coded",
    };
  });

  // Calculate cohort statistics
  const eligibleStudents = [];
  const directFailStudents = [];

  for (const item of evaluatedStudents) {
    const pct = item.percentage != null ? Number(item.percentage) : 0;
    if (isRelative && minRawMarks != null && pct < minRawMarks) {
      directFailStudents.push(item);
    } else {
      eligibleStudents.push(item);
    }
  }

  const eligibleScores = eligibleStudents.map((s) => Number(s.percentage) || 0);
  const N = eligibleScores.length;
  const totalScore = eligibleScores.reduce((acc, score) => acc + score, 0);
  const classMean = N > 0 ? totalScore / N : 0;

  // Deviations & Sum of Squared Deviations
  let sumSquaredDeviations = 0;
  const deviationsByStudentId = new Map();

  for (const item of eligibleStudents) {
    const score = Number(item.percentage) || 0;
    const deviation = score - classMean;
    const devSquared = deviation * deviation;
    sumSquaredDeviations += devSquared;
    deviationsByStudentId.set(item.student.studentId, {
      deviation,
      devSquared,
    });
  }

  // Population Variance & Standard Deviation (Image Step 3.5 & 3.6)
  const populationVariance = N > 0 ? sumSquaredDeviations / N : 0;
  const standardDev = Math.sqrt(populationVariance);

  // Build Students Worked Example Table (Image Section 4)
  const studentsTable = evaluatedStudents.map((item) => {
    const pct = item.percentage != null ? Number(item.percentage) : 0;
    const isDirectFail = isRelative && minRawMarks != null && pct < minRawMarks;

    if (isDirectFail) {
      const dev = pct - classMean;
      const devSq = dev * dev;
      const calculatedZ =
        standardDev === 0 ? 0 : Number(zScore(pct, classMean, standardDev).toFixed(4));

      return {
        studentId: item.student.studentId,
        studentName: item.student.studentName,
        scholarNo: item.student.scholarNo,
        enrollNumber: item.student.enrollNumber,
        finalScore: pct,
        deviation: dev >= 0 ? `+${dev.toFixed(2)}` : dev.toFixed(2),
        deviationRaw: Number(dev.toFixed(4)),
        deviationSquared: Number(devSq.toFixed(4)),
        calculationFormula: `(${pct} - ${classMean.toFixed(2)}) / ${standardDev.toFixed(4)}`,
        zScore: calculatedZ >= 0 ? `+${calculatedZ.toFixed(4)}` : calculatedZ.toFixed(4),
        zScoreRaw: calculatedZ,
        grade: failBand ? failBand.grade : "F",
        gradePoint: failBand?.gradePoint != null ? toMoneyNumber(failBand.gradePoint) : 0,
        isDirectFail: true,
        directFailReason: `Score ${pct}% < Minimum ${minRawMarks}% threshold (Direct Fail)`,
      };
    }

    if (!isRelative) {
      let finalGrade = null;
      let finalGradePoint = null;
      for (const band of grades) {
        const minP = band.minPercentage != null ? Number(band.minPercentage) : -Infinity;
        const maxP = band.maxPercentage != null ? Number(band.maxPercentage) : Infinity;
        if (pct >= minP && pct <= maxP) {
          finalGrade = band.grade;
          finalGradePoint = band.gradePoint != null ? toMoneyNumber(band.gradePoint) : null;
          break;
        }
      }

      return {
        studentId: item.student.studentId,
        studentName: item.student.studentName,
        scholarNo: item.student.scholarNo,
        enrollNumber: item.student.enrollNumber,
        finalScore: pct,
        deviation: null,
        deviationRaw: null,
        deviationSquared: null,
        calculationFormula: "Absolute Percentage Match",
        zScore: null,
        zScoreRaw: null,
        grade: finalGrade,
        gradePoint: finalGradePoint,
        isDirectFail: false,
      };
    }

    const devData = deviationsByStudentId.get(item.student.studentId) || {
      deviation: pct - classMean,
      devSquared: (pct - classMean) * (pct - classMean),
    };
    const calculatedZ =
      standardDev === 0 ? 0 : Number(zScore(pct, classMean, standardDev).toFixed(4));

    let finalGrade = null;
    let finalGradePoint = null;

    for (const band of grades) {
      if (band.isRuleBased) continue;
      const lower = band.lowerBound != null ? Number(band.lowerBound) : -Infinity;
      const upper = band.upperBound != null ? Number(band.upperBound) : Infinity;

      if (calculatedZ >= lower && (band.upperBound == null || calculatedZ < upper)) {
        finalGrade = band.grade;
        finalGradePoint = band.gradePoint != null ? toMoneyNumber(band.gradePoint) : null;
        break;
      }
    }

    if (!finalGrade && grades.length > 0) {
      const fallbackBand = calculatedZ < 0 ? grades[grades.length - 1] : grades[0];
      finalGrade = fallbackBand.grade;
      finalGradePoint = fallbackBand.gradePoint != null ? toMoneyNumber(fallbackBand.gradePoint) : null;
    }

    return {
      studentId: item.student.studentId,
      studentName: item.student.studentName,
      scholarNo: item.student.scholarNo,
      enrollNumber: item.student.enrollNumber,
      finalScore: pct,
      deviation: devData.deviation >= 0 ? `+${devData.deviation.toFixed(2)}` : devData.deviation.toFixed(2),
      deviationRaw: Number(devData.deviation.toFixed(4)),
      deviationSquared: Number(devData.devSquared.toFixed(4)),
      calculationFormula: `(${pct} - ${classMean.toFixed(2)}) / ${standardDev.toFixed(4)}`,
      zScore: calculatedZ >= 0 ? `+${calculatedZ.toFixed(4)}` : calculatedZ.toFixed(4),
      zScoreRaw: calculatedZ,
      grade: finalGrade,
      gradePoint: finalGradePoint,
      isDirectFail: false,
    };
  });

  const cohortStatistics = {
    includedStudents: N,
    excludedDirectFails: directFailStudents.length,
    totalStudents: evaluatedStudents.length,
    totalScore: Number(totalScore.toFixed(2)),
    mean: Number(classMean.toFixed(4)),
    sumSquaredDeviations: Number(sumSquaredDeviations.toFixed(4)),
    populationVariance: Number(populationVariance.toFixed(4)),
    standardDeviation: Number(standardDev.toFixed(6)),
    standardDeviationDisplay: Number(standardDev.toFixed(4)),
  };

  const steps = [
    {
      step: "3.1",
      title: "Step 1 - Total & Count",
      formula: "N = Count of eligible students, Sum = Σ(Score)",
      summary: `N = ${N}; Total Score = ${totalScore.toFixed(2)}`,
    },
    {
      step: "3.2",
      title: "Step 2 - Calculate Mean (μ)",
      formula: "μ = Σ(Score) / N",
      summary: `μ = ${totalScore.toFixed(2)} / ${N} = ${classMean.toFixed(4)}`,
    },
    {
      step: "3.3",
      title: "Step 3 - Calculate each deviation",
      formula: "Deviation = x - μ",
      summary: "Shows how far each student's score is from the cohort mean.",
    },
    {
      step: "3.4",
      title: "Step 4 - Square each deviation",
      formula: "Deviation² = (x - μ)²",
      summary: `Sum of squared deviations = ${sumSquaredDeviations.toFixed(4)}`,
    },
    {
      step: "3.5",
      title: "Step 5 - Calculate population variance",
      formula: "σ² = Σ(x - μ)² / N",
      summary: `σ² = ${sumSquaredDeviations.toFixed(4)} / ${N} = ${populationVariance.toFixed(4)}`,
    },
    {
      step: "3.6",
      title: "Step 6 - Calculate standard deviation (σ)",
      formula: "σ = √variance",
      summary: `σ = √${populationVariance.toFixed(4)} = ${standardDev.toFixed(6)}`,
    },
    {
      step: "3.7",
      title: "Step 7 - Calculate each student's Z-score",
      formula: "z = (x - μ) / σ",
      summary: "Evaluates standard deviation units from the cohort mean.",
    },
    {
      step: "3.8",
      title: "Step 8 - Map Z-score to configured grade band",
      formula: "Policy grade bands matching",
      summary: "Maps calculated Z-score to active grading policy grades.",
    },
  ];

  return {
    schemeDetails: {
      gradingId: Number(gradingScheme.gradingId),
      gradingName: gradingScheme.gradingName,
      gradingMethod: gradingScheme.gradingMethod,
      distributionType: gradingScheme.distributionType || null,
      isRelative,
    },
    cohortStatistics,
    studentsTable,
    gradeBands,
    steps,
  };
}
