import * as examResultRepository from "../repository/examResultRepository.js";

/**
 * Shared readiness from applicable exam schedules + this student's answer sheets.
 * sheetByExamScheduleId: Map(examScheduleId -> answerSheet plain row | undefined)
 */
export function calculateResultReadiness(applicableSchedules, sheetByExamScheduleId) {
  const exams = [];
  let submittedExams = 0;

  for (const schedule of applicableSchedules) {
    const plain = schedule.get ? schedule.get({ plain: true }) : schedule;
    const subject = plain.subjectSchedule;
    const examScheduleId = Number(plain.examScheduleId);
    const sheet = sheetByExamScheduleId.get(examScheduleId) || null;
    const isSubmitted = Boolean(sheet && sheet.markingStatus === "submit");

    if (isSubmitted) submittedExams += 1;

    exams.push({
      examScheduleId,
      subjectId: Number(plain.subjectId),
      subjectName: subject.subjectName,
      subjectCode: subject.subjectCode,
      examDate: plain.examDate,
      answerSheetQrId: sheet ? sheet.id : null,
      answerSheetStatus: sheet ? sheet.markingStatus : null,
      isSubmitted,
      obtainedMarks: sheet ? sheet.obtainedMarks : null,
      evaluatedAt: sheet ? sheet.evaluatedAt : null,
    });
  }

  const totalExams = exams.length;
  const pendingExams = totalExams - submittedExams;

  return {
    readiness: {
      status: totalExams > 0 && submittedExams === totalExams ? "READY" : "NOT_READY",
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
    const examinationSessionId = context.examinationSession.examinationSessionId;

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
