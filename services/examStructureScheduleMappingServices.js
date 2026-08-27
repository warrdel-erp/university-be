import * as model from "../models/index.js";
import { Op } from "sequelize";
import { scoped } from "../utility/scoped.js";
import * as examStructureScheduleRepository from "../repository/examStructureScheduleMappingRepository.js";
import * as examinationSessionRepository from "../repository/examinationSessionRepository.js";
import { getTimeSlotRange } from "../utility/timeSlot.js";

const studentListFields = [
  "studentId",
  "name",
  "enrollNumber",
  "scholarNumber",
  "fatherName",
  "email",
  "phoneNumber",
  "mobileNumber",
  "courseName",
  "termName",
];

async function resolveSlotDetails(examDetail) {
  if (examDetail.examinationSessionSlotId) {
    const slot = await scoped(model.examinationSessionSlotModel).findOne({
      where: {
        examinationSessionSlotId: Number(examDetail.examinationSessionSlotId),
      },
      attributes: ["startTime", "durationMinutes", "examinationSessionId"],
      raw: true,
    });
    if (slot) {
      if (!examDetail.examTime && slot.startTime) {
        examDetail.examTime = slot.startTime;
      }
      if (!examDetail.examinationSessionId && slot.examinationSessionId) {
        examDetail.examinationSessionId = slot.examinationSessionId;
      }
    }
  }
}

async function resolveDurationFromAssessmentPlan(examDetail) {
  if (!examDetail.examinationSessionId) return;

  // 1. Fetch examinationSession → get examSetupTypeId (assessmentTypeId)
  const session =
    await examinationSessionRepository.findExaminationSessionAssessmentTypeById(
      examDetail.examinationSessionId,
    );

  if (!session) {
    const err = new Error("Examination session not found.");
    err.statusCode = 404;
    throw err;
  }

  if (!session.assessmentTypeId) {
    const err = new Error(
      "Assessment plan is not configured for this examination session.",
    );
    err.statusCode = 400;
    throw err;
  }

  // 2. Fetch assessment plan component duration and marks using examSetupTypeId
  const component =
    await examinationSessionRepository.findAssessmentPlanComponentDurationBySetupTypeId(
      session.assessmentTypeId,
    );

  if (!component) {
    const err = new Error(
      "Assessment plan component not found for this examination session type.",
    );
    err.statusCode = 400;
    throw err;
  }

  if (component.duration == null) {
    const err = new Error(
      "Duration is not configured in the assessment plan component.",
    );
    err.statusCode = 400;
    throw err;
  }

  // 3. Copy duration and maximumMarks as snapshot values
  examDetail.duration = String(component.duration);
  if (
    component.weightagePercentage !== undefined &&
    component.weightagePercentage !== null
  ) {
    examDetail.maximumMarks = Number(component.weightagePercentage);
  }
}

async function resolveSessionId(examDetail) {
  let mappedSessionId = null;
  let mappedAcademicYearId = null;
  let mappedCourseId = examDetail.courseId ? Number(examDetail.courseId) : null;

  // 1. Resolve courseId, academicYearId, term from subjectModel if subjectId is passed
  if (!mappedCourseId && examDetail.subjectId) {
    const subject = await scoped(model.subjectModel).findOne({
      where: { subjectId: Number(examDetail.subjectId) },
      attributes: ["courseId", "academicYearId", "term"],
      raw: true,
    });
    if (subject) {
      mappedCourseId = subject.courseId;
      examDetail.courseId = subject.courseId;
      if (!examDetail.academicYearId && subject.academicYearId) {
        examDetail.academicYearId = subject.academicYearId;
      }
      if (!examDetail.term && subject.term != null) {
        examDetail.term = subject.term;
      }
    }
  }

  // 2. Match subjectId + courseId (+ candidate sessionId) in assessmentPlanSubjectMappingModel
  if (examDetail.subjectId) {
    const mappingWhere = { subjectId: Number(examDetail.subjectId) };
    if (mappedCourseId) {
      mappingWhere.courseId = mappedCourseId;
    }
    if (examDetail.sessionId) {
      mappingWhere.sessionId = Number(examDetail.sessionId);
    }

    let mapping = await scoped(model.assessmentPlanSubjectMappingModel).findOne(
      {
        where: mappingWhere,
        attributes: [
          "sessionId",
          "academicYearId",
          "courseId",
          "assessmentPlanId",
        ],
        raw: true,
      },
    );

    if (!mapping && examDetail.sessionId && mappedCourseId) {
      mapping = await scoped(model.assessmentPlanSubjectMappingModel).findOne({
        where: {
          subjectId: Number(examDetail.subjectId),
          courseId: mappedCourseId,
        },
        attributes: [
          "sessionId",
          "academicYearId",
          "courseId",
          "assessmentPlanId",
        ],
        raw: true,
      });
    }

    if (mapping) {
      if (mapping.sessionId) mappedSessionId = Number(mapping.sessionId);
      if (mapping.academicYearId)
        mappedAcademicYearId = Number(mapping.academicYearId);
      if (!examDetail.courseId && mapping.courseId)
        examDetail.courseId = mapping.courseId;
    }
  }

  // 3. Fallback to assessmentPlanModel matching (courseId + sessionId) if needed
  if (!mappedSessionId && mappedCourseId) {
    const planWhere = { courseId: mappedCourseId, isActive: true };
    if (examDetail.sessionId) {
      planWhere.sessionId = Number(examDetail.sessionId);
    }
    const plan = await scoped(model.assessmentPlanModel).findOne({
      where: planWhere,
      attributes: ["sessionId", "academicYearId"],
      raw: true,
    });
    if (plan) {
      if (plan.sessionId) mappedSessionId = Number(plan.sessionId);
      if (plan.academicYearId && !mappedAcademicYearId)
        mappedAcademicYearId = Number(plan.academicYearId);
    }
  }

  // 4. Validate candidate or mapped sessionId in sessionModel
  let candidateSessionId = examDetail.sessionId
    ? Number(examDetail.sessionId)
    : mappedSessionId;

  if (candidateSessionId) {
    const validSession = await scoped(model.sessionModel).findOne({
      where: { sessionId: candidateSessionId },
      attributes: ["sessionId", "academicYearId"],
      raw: true,
    });
    if (validSession) {
      examDetail.sessionId = validSession.sessionId;
      if (!examDetail.academicYearId && validSession.academicYearId) {
        examDetail.academicYearId = validSession.academicYearId;
      }
    } else if (mappedSessionId && mappedSessionId !== candidateSessionId) {
      const validMappedSession = await scoped(model.sessionModel).findOne({
        where: { sessionId: mappedSessionId },
        attributes: ["sessionId", "academicYearId"],
        raw: true,
      });
      if (validMappedSession) {
        examDetail.sessionId = validMappedSession.sessionId;
        if (!examDetail.academicYearId && validMappedSession.academicYearId) {
          examDetail.academicYearId = validMappedSession.academicYearId;
        }
      } else {
        examDetail.sessionId = null;
      }
    } else {
      examDetail.sessionId = null;
    }
  }

  if (mappedAcademicYearId && !examDetail.academicYearId) {
    examDetail.academicYearId = mappedAcademicYearId;
  }
}

async function resolveAcademicYearId(examDetail) {
  if (!examDetail.academicYearId && examDetail.subjectId) {
    const academicYearId =
      await examStructureScheduleRepository.findSubjectacademicYearId(
        examDetail.subjectId,
      );
    if (academicYearId) {
      examDetail.academicYearId = academicYearId;
    }
  }
}

async function resolveTermForExamDetail(examDetail) {
  if (examDetail.term != null) {
    return Number(examDetail.term);
  }
  if (examDetail.examSetupTypeTermId) {
    const termDetail =
      await examStructureScheduleRepository.getExamSetupTypeTermById(
        examDetail.examSetupTypeTermId,
      );
    if (termDetail?.term != null) {
      return Number(termDetail.term);
    }
  }
  if (examDetail.subjectId) {
    const subject = await scoped(model.subjectModel).findOne({
      where: { subjectId: Number(examDetail.subjectId) },
      attributes: ["term"],
      raw: true,
    });
    if (subject?.term != null) {
      return Number(subject.term);
    }
  }
  return null;
}

function subjectsToPlain(rows) {
  const subjects = [];
  for (const row of rows) {
    subjects.push(row.get({ plain: true }));
  }
  return subjects;
}

function buildRoomsByScheduleId(rows) {
  const roomsByScheduleId = new Map();

  for (const row of rows) {
    const scheduleId = row.examScheduleId;
    if (!roomsByScheduleId.has(scheduleId)) {
      roomsByScheduleId.set(scheduleId, []);
    }
    roomsByScheduleId.get(scheduleId).push({
      examScheduleRoomCapacityId: row.examScheduleRoomCapacityId,
      classRoomSectionId: row.classRoomSectionId,
      roomNumber: row.classRoom?.roomNumber ?? null,
      capacity: row.capacity,
      columns: row.columns,
      orderKey: row.orderKey,
    });
  }

  return roomsByScheduleId;
}

function attachRoomsToSubjects(subjects, roomsByScheduleId) {
  const result = [];

  for (const subject of subjects) {
    const schedules = [];
    for (const schedule of subject.scheduleSubject ?? []) {
      const rooms = roomsByScheduleId.get(schedule.examScheduleId) ?? [];
      const roomNames = [];
      for (const room of rooms) {
        if (room.roomNumber) {
          roomNames.push(room.roomNumber);
        }
      }
      schedules.push({
        ...schedule,
        isRoomAllocated: rooms.length > 0,
        roomNames,
        rooms,
      });
    }
    result.push({ ...subject, scheduleSubject: schedules });
  }

  return result;
}

function collectExamScheduleIds(subjects) {
  const examScheduleIds = [];
  for (const subject of subjects) {
    for (const schedule of subject.scheduleSubject ?? []) {
      if (schedule.examScheduleId) {
        examScheduleIds.push(schedule.examScheduleId);
      }
    }
  }
  return examScheduleIds;
}

function formatStudentList(rows) {
  const studentList = [];
  for (const row of rows) {
    const student = {};
    for (const field of studentListFields) {
      student[field] = row[field] ?? null;
    }
    studentList.push(student);
  }
  return studentList;
}

export async function addExamStructureSchedule(
  examScheduleDetail,
  createdBy,
  updatedBy,
) {
  examScheduleDetail.createdBy = createdBy;
  examScheduleDetail.updatedBy = updatedBy;
  return examStructureScheduleRepository.addExamStructureSchedule(
    examScheduleDetail,
  );
}

export async function getExamStructureSchedule(examSetupTypeId) {
  const schedules =
    await examStructureScheduleRepository.getExamStructureSchedule(
      examSetupTypeId,
    );

  const secondScreenData = [];

  schedules.forEach((row) => {
    const subjects = row.syllabusDetailsExam || [];

    subjects.forEach((subDetail) => {
      const subjectName = subDetail.syllabusSubject?.subjectName;
      const subjectId = subDetail.syllabusSubject?.subjectId;
      const subjectType = subDetail.subjectType;

      subDetail.syllabusSubject?.subjects?.forEach((sub) => {
        const programTerm = subDetail.syllabusSubject?.term ?? null;
        const termName = programTerm != null ? `Term ${programTerm}` : null;

        const students = [];
        const studentCount = 0;

        const teachers = (sub.employeeSubject || []).map((ts) => ({
          teacherSubjectMappingId: ts.teacherSubjectMappingId,
          userId: ts.userId,
          employee: {
            userId: ts.teacherEmployeeData?.userId || null,
            employeeName: ts.teacherEmployeeData?.employeeName || null,
            employeeCode: ts.teacherEmployeeData?.employeeCode || null,
            departmentId: ts.teacherEmployeeData?.departmentId || null,
            employmentType: ts.teacherEmployeeData?.employmentType || null,
          },
        }));

        const allSchedules = (row.examSetupTypeTerms || []).flatMap(
          (term) => term.examSchedules || [],
        );

        const exam = allSchedules.find(
          (ex) =>
            ex.subjectId === subjectId &&
            Number(ex.term) === Number(programTerm),
        );

        secondScreenData.push({
          examSetupTypeId: row.examSetupTypeId,
          subjectName,
          subjectId,
          subjectType,
          term: programTerm,
          termName,
          studentCount,
          examScheduleId: exam?.examScheduleId || null,
          examDate: exam?.examDate || null,
          examTime: exam?.examTime || null,
          duration: exam?.duration || null,
          type: exam?.type || null,
          teachers,
        });
      });
    });
  });

  return secondScreenData;
}

export async function publishExamSchedule(publishExamStructureSchedule) {
  const { examSetupTypeId } = publishExamStructureSchedule;
  const data = { isPublish: true };
  return await examStructureScheduleRepository.publishExamSchedule(
    examSetupTypeId,
    data,
  );
}
function getExamSlotMinutes(examTime, duration) {
  const range = getTimeSlotRange({ startTime: examTime, duration });
  if (!range) {
    throw new Error("Invalid exam duration");
  }
  return range;
}

async function assertNoStudentExamTimeConflict(
  examDetail,
  excludeExamScheduleId,
) {
  if (!examDetail.examTime || !examDetail.duration) {
    return;
  }

  let courseId = null;
  let term = examDetail.term != null ? Number(examDetail.term) : null;

  if (examDetail.examSetupTypeTermId) {
    const termDetail =
      await examStructureScheduleRepository.getExamSetupTypeTermById(
        examDetail.examSetupTypeTermId,
      );
    if (termDetail) {
      courseId = termDetail.courseId;
      if (term == null) term = termDetail.term;
    }
  }

  if (!courseId && examDetail.subjectId) {
    const subject = await scoped(model.subjectModel).findOne({
      where: { subjectId: Number(examDetail.subjectId) },
      attributes: ["courseId", "term"],
      raw: true,
    });
    if (subject) {
      courseId = subject.courseId;
      if (term == null) term = subject.term;
    }
  }

  if (!courseId || term == null) {
    return;
  }

  const { startMinutes, endMinutes } = getExamSlotMinutes(
    examDetail.examTime,
    examDetail.duration,
  );

  const conflict =
    await examStructureScheduleRepository.findConflictingExamForStudentCohort({
      examDate: examDetail.examDate,
      startMinutes,
      endMinutes,
      sessionId: examDetail.sessionId,
      academicYearId: examDetail.academicYearId,
      courseId,
      term,
      excludeExamScheduleId,
    });

  if (conflict) {
    const subjectName =
      conflict.subjectSchedule?.subjectName ?? "another subject";
    throw new Error(
      `Cannot schedule exam: ${subjectName} is already scheduled at the same time for the same students`,
    );
  }
}

async function assertUniqueExamScheduleMapping(
  examDetail,
  excludeExamScheduleId,
) {
  if (!examDetail.courseId || !examDetail.sessionId || !examDetail.subjectId) {
    return;
  }

  let examinationSessionId = examDetail.examinationSessionId;
  if (
    !examinationSessionId &&
    examDetail.examSetupTypeId &&
    examDetail.examDate
  ) {
    const sessionWhere = {
      assessmentTypeId: Number(examDetail.examSetupTypeId),
      examStartDate: { [Op.lte]: examDetail.examDate },
      examEndDate: { [Op.gte]: examDetail.examDate },
    };
    const examinationSession = await scoped(
      model.examinationSessionModel,
    ).findOne({
      where: sessionWhere,
      attributes: ["examinationSessionId"],
    });
    if (examinationSession) {
      examinationSessionId = examinationSession.examinationSessionId;
    }
  }

  if (examinationSessionId && examDetail.subjectId) {
    const directConflict = await scoped(model.examScheduleModel).findOne({
      where: {
        examinationSessionId: Number(examinationSessionId),
        subjectId: Number(examDetail.subjectId),
        ...(excludeExamScheduleId && {
          examScheduleId: { [Op.ne]: excludeExamScheduleId },
        }),
      },
      attributes: ["examScheduleId"],
      raw: true,
    });
    if (directConflict) {
      throw new Error(
        "An exam schedule is already scheduled for this subject.",
      );
    }
  }

  const whereClause = {
    sessionId: examDetail.sessionId,
    examinationSessionId: examinationSessionId,
    subjectId: examDetail.subjectId,
  };

  if (excludeExamScheduleId) {
    whereClause.examScheduleId = { [Op.ne]: excludeExamScheduleId };
  }

  const conflict = await scoped(model.examScheduleModel).findOne({
    where: whereClause,
    include: [
      {
        model: model.subjectModel,
        as: "subjectSchedule",
        where: { courseId: examDetail.courseId },
        required: true,
      },
    ],
    raw: true,
  });

  if (conflict) {
    throw new Error(
      "A schedule with the same Course, Session, Examination Session, and Subject ",
    );
  }

  const conflictBySubject = await scoped(model.examScheduleModel).findOne({
    where: whereClause,
    include: [
      {
        model: model.subjectModel,
        as: "subjectSchedule",
        where: { courseId: examDetail.courseId },
        required: true,
      },
    ],
    raw: true,
  });

  if (conflictBySubject) {
    throw new Error("Cannot add duplicate exam schedule.");
  }
}

export async function addExamSchedule(examDetail, createdBy, updatedBy) {
  examDetail.createdBy = createdBy;
  examDetail.updatedBy = updatedBy;

  // Do NOT accept duration from frontend — always resolve from assessment plan
  delete examDetail.duration;

  // Set examSetupTypeTermId to null explicitly
  examDetail.examSetupTypeTermId = null;

  await resolveSlotDetails(examDetail);
  await resolveSessionId(examDetail);
  await resolveAcademicYearId(examDetail);

  // Resolve duration and assessmentPlanComponentId from assessmentPlanComponent
  await resolveDurationFromAssessmentPlan(examDetail);

  const resolvedTerm = await resolveTermForExamDetail(examDetail);
  if (resolvedTerm != null) {
    examDetail.term = resolvedTerm;
  }
  delete examDetail.semesterId;

  await assertNoStudentExamTimeConflict(examDetail);
  await assertUniqueExamScheduleMapping(examDetail);

  return await examStructureScheduleRepository.addExamSchedule(examDetail);
}

export async function updateExamSchedule(
  examScheduleId,
  examDetail,
  updatedBy,
) {
  examDetail.updatedBy = updatedBy;

  await resolveSlotDetails(examDetail);
  await resolveSessionId(examDetail);
  await resolveAcademicYearId(examDetail);

  const resolvedTerm = await resolveTermForExamDetail(examDetail);
  if (resolvedTerm != null) {
    examDetail.term = resolvedTerm;
  }
  delete examDetail.semesterId;

  await assertNoStudentExamTimeConflict(examDetail, examScheduleId);
  await assertUniqueExamScheduleMapping(examDetail, examScheduleId);

  await examStructureScheduleRepository.updateExamSchedule(
    examScheduleId,
    examDetail,
  );
}

export async function deleteExamSchedule(examScheduleId) {
  return await examStructureScheduleRepository.deleteExamSchedule(
    examScheduleId,
  );
}

export async function getDetailByExamType(examSetupTypeId) {
  return examStructureScheduleRepository.getDetailByExamType(examSetupTypeId);
}

export async function getExamDetailByStudentId(studentId) {
  const data =
    await examStructureScheduleRepository.getExamDetailByStudentId(studentId);

  if (!data || !data.studentClassSectionTerm) {
    return null;
  }

  const termRow = data.studentClassSectionTerm;
  return {
    studentId: data.studentId,
    studentName: data.firstName,
    term: termRow.term,
    termName: termRow.term != null ? `Term ${termRow.term}` : null,
    classSectionTermId: termRow.classSectionTermId,
    exams: (termRow.examSchedules || []).map((exam) => ({
      subjectId: exam.subjectId,
      subjectName: exam.subjectSchedule?.subjectName,
      subjectCode: exam.subjectSchedule?.subjectCode,
      subjectType: exam.subjectSchedule?.subjectType,
      type: exam.type,
      examDate: exam.examDate,
      examTime: exam.examTime,
      duration: exam.duration,
    })),
  };
}

export async function getExamScheduleById(examScheduleId) {
  return examStructureScheduleRepository.getExamScheduleById(examScheduleId);
}

export async function getSubjectsWithExamSchedule(
  examSetupTypeTermId,
  academicYearId,
  sessionId,
) {
  const termDetail =
    await examStructureScheduleRepository.getExamSetupTypeTermById(
      examSetupTypeTermId,
    );
  if (!termDetail) {
    throw new Error("Exam setup type term not found");
  }

  const courseId = termDetail.courseId;
  const term = termDetail.term;
  const parsedExamSetupTypeTermId = parseInt(examSetupTypeTermId);
  const parsedacademicYearId = academicYearId ? parseInt(academicYearId) : null;
  const parsedSessionId = sessionId ? parseInt(sessionId) : null;

  const subjectRows =
    await examStructureScheduleRepository.findSubjectsWithSchedules(
      courseId,
      parsedacademicYearId,
      term,
      parsedExamSetupTypeTermId,
      parsedSessionId,
    );

  const subjectsRaw = subjectsToPlain(subjectRows);
  const examScheduleIds = collectExamScheduleIds(subjectsRaw);

  const [roomRows, studentRows] = await Promise.all([
    examStructureScheduleRepository.findRoomsByExamScheduleIds(examScheduleIds),
    examStructureScheduleRepository.findStudentsForTerm(
      courseId,
      parsedacademicYearId,
      term,
      parsedSessionId,
    ),
  ]);

  const studentList = formatStudentList(studentRows);
  const roomsByScheduleId = buildRoomsByScheduleId(roomRows);
  const subjects = attachRoomsToSubjects(subjectsRaw, roomsByScheduleId);

  return {
    studentCount: studentList.length,
    studentList,
    subjects,
  };
}
