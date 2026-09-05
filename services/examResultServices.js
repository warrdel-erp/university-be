import { UniqueConstraintError } from "sequelize";
import sequelize from "../database/sequelizeConfig.js";
import * as examResultRepository from "../repository/examResultRepository.js";
import { countWholeTermStudentsByTerms } from "../utility/studentCount.js";
import {
  decimalAdd,
  decimalDivide,
  decimalMax,
  decimalMultiply,
  decimalSubtract,
  toMoneyNumber,
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
    if (Number(plain.subjectSchedule.courseId) !== Number(courseId)) continue;
    if (Number(plain.sessionId) !== Number(sessionId)) continue;
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
    courseId: plain.course.courseId,
    sessionId: plain.studentSession.sessionId,
    term: Number(plain.studentClassSectionTerm.term),
    course: plain.course,
    session: plain.studentSession,
  };
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
    academicYearId: examSession.academicYearId,
    assessmentTypeId: examSession.assessmentTypeId,
    status: examSession.status,
  };

  let terms = [];
  for (const row of examSession.examinationSessionTerms) {
    terms.push(Number(row.term));
  }

  let classSectionOr = null;
  if (query.selections?.length) {
    const mappingIds = [];
    for (const selection of query.selections) {
      mappingIds.push(Number(selection.courseSessionMappingId));
    }

    const mappings =
      await examResultRepository.findSessionCourseMappingsByIds(mappingIds);
    const mappingById = new Map();
    for (const mapping of mappings) {
      mappingById.set(Number(mapping.sessionCourseMappingId), mapping);
    }

    classSectionOr = [];
    terms = [];
    const termSeen = new Set();

    for (const selection of query.selections) {
      const mapping = mappingById.get(Number(selection.courseSessionMappingId));
      if (!mapping) continue;

      classSectionOr.push({
        courseId: Number(mapping.courseId),
        sessionId: Number(mapping.sessionId),
      });

      for (const term of selection.terms) {
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

  if (examinationSession.academicYearId == null || !terms.length) {
    return { examinationSession, empty: true };
  }

  return { examinationSession, terms, classSectionOr, empty: false };
}

export async function listStudents(query) {
  const page = query.page;
  const limit = query.limit;
  const context = await resolveContext(query);

  if (context.empty) {
    return {
      data: { examinationSession: context.examinationSession, items: [] },
      pagination: { page, limit, total: 0, totalPages: 0 },
    };
  }

  const { rows, count } = await examResultRepository.findStudents({
    search: query.search,
    terms: context.terms,
    academicYearId: context.examinationSession.academicYearId,
    classSectionOr: context.classSectionOr,
    limit,
    offset: (page - 1) * limit,
  });

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

    const [schedules, sheets] = await Promise.all([
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
    ]);

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

      item.totalExams = readiness.totalExams;
      item.submittedExams = readiness.submittedExams;
      item.pendingExams = readiness.pendingExams;
      item.readinessStatus = readiness.status;

      delete item.course;
      delete item.session;
    }
  }

  return {
    data: { examinationSession: context.examinationSession, items },
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit) || 0,
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
    academicYearId: context.examinationSession.academicYearId,
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
      courseId: student.courseId,
      sessionId: student.sessionId,
      term: student.term,
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
  for (const row of examSession.examinationSessionTerms) {
    terms.push(Number(row.term));
  }

  const academicYearId = examSession.academicYearId;
  if (academicYearId == null || !terms.length) {
    return emptySku(examinationSessionId);
  }

  const [totalExams, sheetSku, totalStudents, scheduleRows] = await Promise.all(
    [
      examResultRepository.countExamSchedulesByExaminationSessionId(
        examinationSessionId,
      ),
      examResultRepository.countAnswerSheetSkuByExaminationSessionId(
        examinationSessionId,
      ),
      countWholeTermStudentsByTerms(terms, academicYearId),
      examResultRepository.findExamScheduleContextsByExaminationSessionId(
        examinationSessionId,
      ),
    ],
  );

  const studentTotal = Number(totalStudents) || 0;

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
    schedules.push({
      examScheduleId: Number(row.examScheduleId),
      courseId: Number(row.subjectSchedule.courseId),
      sessionId: Number(row.sessionId),
      term: row.term == null ? null : Number(row.term),
    });
  }

  const [studentRows, submitPairs] = await Promise.all([
    examResultRepository.findApplicableStudentContexts({
      academicYearId,
      terms,
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
      if (schedule.courseId !== courseId) continue;
      if (schedule.sessionId !== sessionId) continue;
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
 * Create student_result header for an examination session student.
 * Subject marks live on answerSheetQr (student_result_subject).
 * Requires readiness READY (every applicable schedule submitted).
 */
export async function createExaminationSessionResult(body) {
  const examinationSessionId = Number(body.examinationSessionId);
  const studentId = Number(body.studentId);

  const context = await resolveContext({ examinationSessionId });
  if (context.empty) {
    const err = new Error("Examination session has no applicable terms.");
    err.statusCode = 400;
    throw err;
  }

  const row = await examResultRepository.findOneStudent({
    studentId,
    terms: context.terms,
    academicYearId: context.examinationSession.academicYearId,
    classSectionOr: context.classSectionOr,
  });
  if (!row) {
    const err = new Error("Student not found for exam result.");
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
    const err = new Error("No applicable exams found for this student.");
    err.statusCode = 400;
    throw err;
  }

  if (readiness.status !== "READY") {
    const err = new Error(
      "Student result is not ready. All answer sheets must be submitted.",
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

  const transaction = await sequelize.transaction();

  try {
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
        "Student result already exists for this examination session.",
      );
      err.statusCode = 409;
      throw err;
    }

    const created = await examResultRepository.createStudentResult(
      {
        examinationSessionId,
        studentId: student.studentId,
        courseId: student.courseId,
        sessionId: student.sessionId,
        term: student.term,
        totalMarks,
        obtainedMarks,
        percentage,
        academicYearId: context.examinationSession.academicYearId,
      },
      transaction,
    );

    await transaction.commit();

    const plain = created.get({ plain: true });
    return {
      examinationSession: context.examinationSession,
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
        resultStatus: plain.resultStatus,
      },
      readiness,
      subjects: exams,
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
