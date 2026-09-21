import * as model from "../models/index.js";
import { Op } from "sequelize";
import { scoped } from "../utility/scoped.js";
import * as examStructureScheduleRepository from "../repository/examStructureScheduleMappingRepository.js";
import * as examinationSessionRepository from "../repository/examinationSessionRepository.js";
import { getTimeSlotRange } from "../utility/timeSlot.js";
import { withAuditEvent } from "../utility/audit/withAuditEvent.js";
import { AUDIT_EVENTS } from "../const/auditEvents.js";
import {
  applyCurriculumBatchTermToExamDetail,
} from "./curriculumBatchTermServices.js";
import {
  buildStudentGroupFromSchedule,
  lookupStudentCount,
} from "../utility/studentCount.js";
import { getStudentCountMapByGroups, countStudentsForExamGroup } from "./studentCountServices.js";

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
  const mappedCourseId = Number(examDetail.courseId);

  const mappingWhere = {
    subjectId: Number(examDetail.subjectId),
    courseId: mappedCourseId,
    curriculumBatchTermMappingId: Number(examDetail.curriculumBatchTermMappingId),
  };
  if (examDetail.sessionId) {
    mappingWhere.sessionId = Number(examDetail.sessionId);
  }

  const mapping = await scoped(model.assessmentPlanSubjectMappingModel).findOne({
    where: mappingWhere,
    attributes: ["sessionId", "academicYearId", "courseId"],
    raw: true,
  });

  let mappedSessionId = mapping?.sessionId ? Number(mapping.sessionId) : null;
  let mappedAcademicYearId = mapping?.academicYearId
    ? Number(mapping.academicYearId)
    : null;

  if (!mappedAcademicYearId && mappedCourseId) {
    const plan = await scoped(model.assessmentPlanModel).findOne({
      where: { courseId: mappedCourseId, isActive: true },
      attributes: ["academicYearId"],
      raw: true,
    });
    if (plan?.academicYearId) {
      mappedAcademicYearId = Number(plan.academicYearId);
    }
  }

  const candidateSessionId = examDetail.sessionId
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
    } else {
      examDetail.sessionId = mappedSessionId;
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

    const mappings = subject.curriculumTermMappings || [];
    const curriculumTerm =
      mappings.length > 0 && mappings[0].term != null
        ? Number(mappings[0].term)
        : null;

    result.push({
      ...subject,
      term: curriculumTerm,
      scheduleSubject: schedules,
    });
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

  const subjectIds = [];
  for (const row of schedules) {
    for (const subDetail of row.syllabusDetailsExam || []) {
      const subjectId = subDetail.syllabusSubject?.subjectId;
      if (subjectId != null) subjectIds.push(Number(subjectId));
    }
  }

  const examScheduleRows = subjectIds.length
    ? await scoped(model.examScheduleModel).findAll({
        where: { subjectId: { [Op.in]: [...new Set(subjectIds)] } },
        attributes: [
          "examScheduleId",
          "subjectId",
          "term",
          "sessionId",
          "academicYearId",
          "curriculumBatchTermMappingId",
          "examDate",
          "examTime",
          "duration",
          "type",
        ],
        include: [
          {
            model: model.subjectModel,
            as: "subjectSchedule",
            attributes: ["subjectId", "courseId"],
            required: true,
          },
          {
            model: model.curriculumBatchTermMappingModel,
            as: "curriculumBatchTermMapping",
            attributes: [
              "curriculumBatchTermMappingId",
              "term",
              "yearNumber",
              "year",
            ],
            required: false,
            include: [
              {
                model: model.curriculumBatchMappingModel,
                as: "batchMapping",
                attributes: [
                  "curriculumBatchMappingId",
                  "curriculumId",
                  "batch",
                ],
                required: true,
              },
            ],
          },
        ],
      })
    : [];

  const examsBySubjectTerm = new Map();
  for (const exam of examScheduleRows) {
    const plain = exam.get ? exam.get({ plain: true }) : exam;
    const key = `${plain.subjectId}_${plain.term}`;
    if (!examsBySubjectTerm.has(key)) {
      examsBySubjectTerm.set(key, plain);
    }
  }

  const secondScreenData = [];
  const studentGroups = [];

  for (const row of schedules) {
    const subjects = row.syllabusDetailsExam || [];

    for (const subDetail of subjects) {
      const subjectName = subDetail.syllabusSubject?.subjectName;
      const subjectId = subDetail.syllabusSubject?.subjectId;
      const subjectType = subDetail.subjectType;

      for (const sub of subDetail.syllabusSubject?.subjects || []) {
        const programTerm = subDetail.syllabusSubject?.term ?? null;
        const termName = programTerm != null ? `Term ${programTerm}` : null;

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

        const exam =
          subjectId != null && programTerm != null
            ? examsBySubjectTerm.get(`${subjectId}_${programTerm}`) || null
            : null;

        if (exam) {
          const group = buildStudentGroupFromSchedule(exam);
          if (group) studentGroups.push(group);
        }

        secondScreenData.push({
          examSetupTypeId: row.examSetupTypeId,
          subjectName,
          subjectId,
          subjectType,
          term: programTerm,
          termName,
          studentCount: 0,
          examScheduleId: exam?.examScheduleId || null,
          examDate: exam?.examDate || null,
          examTime: exam?.examTime || null,
          duration: exam?.duration || null,
          type: exam?.type || null,
          teachers,
          _exam: exam || null,
        });
      }
    }
  }

  const studentCountMap = studentGroups.length
    ? await getStudentCountMapByGroups(studentGroups)
    : new Map();

  for (const row of secondScreenData) {
    if (row._exam) {
      row.studentCount = lookupStudentCount(
        studentCountMap,
        buildStudentGroupFromSchedule(row._exam),
      );
    }
    delete row._exam;
  }

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

  const courseId = Number(examDetail.courseId);
  const term = Number(examDetail.term);

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
    throw new Error(
      `Cannot schedule exam: ${conflict.subjectSchedule.subjectName} is already scheduled at the same time for the same students`,
    );
  }
}

async function assertUniqueExamScheduleMapping(
  examDetail,
  excludeExamScheduleId,
) {
  let examinationSessionId = examDetail.examinationSessionId;
  if (
    !examinationSessionId &&
    examDetail.examSetupTypeId &&
    examDetail.examDate
  ) {
    const examinationSession = await scoped(
      model.examinationSessionModel,
    ).findOne({
      where: {
        assessmentTypeId: Number(examDetail.examSetupTypeId),
        examStartDate: { [Op.lte]: examDetail.examDate },
        examEndDate: { [Op.gte]: examDetail.examDate },
      },
      attributes: ["examinationSessionId"],
    });
    if (examinationSession) {
      examinationSessionId = examinationSession.examinationSessionId;
    }
  }

  if (examinationSessionId) {
    const directConflict = await scoped(model.examScheduleModel).findOne({
      where: {
        examinationSessionId: Number(examinationSessionId),
        subjectId: Number(examDetail.subjectId),
        curriculumBatchTermMappingId: Number(
          examDetail.curriculumBatchTermMappingId,
        ),
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
    curriculumBatchTermMappingId: Number(
      examDetail.curriculumBatchTermMappingId,
    ),
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
  return withAuditEvent(AUDIT_EVENTS.EXAM_SCHEDULE_CREATE, async ({ transaction }) => {
    examDetail.createdBy = createdBy;
    examDetail.updatedBy = updatedBy;

    // Do NOT accept duration from frontend — always resolve from assessment plan
    delete examDetail.duration;

    // Set examSetupTypeTermId to null explicitly
    examDetail.examSetupTypeTermId = null;

    // subjectId + curriculumBatchTermMappingId are canonical; term always from CBTM
    await applyCurriculumBatchTermToExamDetail(examDetail, { transaction });

    await resolveSlotDetails(examDetail);
    await resolveSessionId(examDetail);
    await resolveAcademicYearId(examDetail);

    // Resolve duration and assessmentPlanComponentId from assessmentPlanComponent
    await resolveDurationFromAssessmentPlan(examDetail);

    delete examDetail.semesterId;

    await assertNoStudentExamTimeConflict(examDetail);
    await assertUniqueExamScheduleMapping(examDetail);

    return await examStructureScheduleRepository.addExamSchedule(examDetail, {
      transaction,
    });
  });
}

export async function updateExamSchedule(
  examScheduleId,
  examDetail,
  updatedBy,
) {
  return withAuditEvent(AUDIT_EVENTS.EXAM_SCHEDULE_UPDATE, async ({ transaction }) => {
    const id = Number(examScheduleId);
    const requestedDate = examDetail.examDate;
    const requestedSlotId = examDetail.examinationSessionSlotId;

    const existing =
      await examStructureScheduleRepository.findScopedExamScheduleById(id, {
        transaction,
      });
    if (!existing) {
      const error = new Error("Exam schedule not found");
      error.statusCode = 404;
      throw error;
    }

    if (existing.published) {
      const error = new Error(
        "Cannot edit exam schedule because it is already published.",
      );
      error.statusCode = 400;
      throw error;
    }

    const isDateChanging =
      requestedDate !== undefined &&
      requestedDate !== null &&
      String(requestedDate) !== String(existing.examDate);
    const isSlotChanging =
      requestedSlotId !== undefined &&
      requestedSlotId !== null &&
      Number(requestedSlotId) !== Number(existing.examinationSessionSlotId);

    if (isDateChanging || isSlotChanging) {
      const roomAssignmentCount =
        await examStructureScheduleRepository.countRoomAssignmentsByExamScheduleId(
          id,
          { transaction },
        );
      const allocatedSeatCount =
        await examStructureScheduleRepository.countAllocatedSeatsByExamScheduleId(
          id,
          { transaction },
        );

      if (roomAssignmentCount > 0 || allocatedSeatCount > 0) {
        const error = new Error(
          "Cannot change exam date or slot until room allocation is removed and all allocated seats are deleted.",
        );
        error.statusCode = 400;
        throw error;
      }
    }

    examDetail.updatedBy = updatedBy;

    await applyCurriculumBatchTermToExamDetail(examDetail, { transaction });

    await resolveSlotDetails(examDetail);
    await resolveSessionId(examDetail);
    await resolveAcademicYearId(examDetail);

    delete examDetail.semesterId;

    await assertNoStudentExamTimeConflict(examDetail, id);
    await assertUniqueExamScheduleMapping(examDetail, id);

    await examStructureScheduleRepository.updateExamSchedule(id, examDetail, {
      transaction,
    });
  });
}

export async function deleteExamSchedule(examScheduleId) {
  return withAuditEvent(AUDIT_EVENTS.EXAM_SCHEDULE_DELETE, async ({ transaction }) => {
    const id = Number(examScheduleId);

    const existing = await examStructureScheduleRepository.findScopedExamScheduleById(
      id,
      { transaction },
    );
    if (!existing) {
      const error = new Error("Exam schedule not found");
      error.statusCode = 404;
      throw error;
    }

    const allocatedSeatCount =
      await examStructureScheduleRepository.countAllocatedSeatsByExamScheduleId(
        id,
        { transaction },
      );
    if (allocatedSeatCount > 0) {
      const error = new Error(
        "Cannot delete exam schedule because seats have already been allocated.",
      );
      error.statusCode = 400;
      throw error;
    }

    const roomAssignmentCount =
      await examStructureScheduleRepository.countRoomAssignmentsByExamScheduleId(
        id,
        { transaction },
      );
    if (roomAssignmentCount > 0) {
      const error = new Error(
        "Cannot delete exam schedule because room assignment has already been done.",
      );
      error.statusCode = 400;
      throw error;
    }

    await examStructureScheduleRepository.deleteExamSchedule(id, { transaction });
    return true;
  });
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

  const [roomRows, studentCount] = await Promise.all([
    examStructureScheduleRepository.findRoomsByExamScheduleIds(examScheduleIds),
    parsedSessionId != null && parsedacademicYearId != null
      ? countStudentsForExamGroup(
          parsedSessionId,
          courseId,
          term,
          parsedacademicYearId,
        )
      : Promise.resolve(0),
  ]);

  const studentRows =
    await examStructureScheduleRepository.findStudentsForTerm(
      courseId,
      parsedacademicYearId,
      term,
      parsedSessionId,
    );

  const studentList = formatStudentList(studentRows);
  const roomsByScheduleId = buildRoomsByScheduleId(roomRows);
  const subjects = attachRoomsToSubjects(subjectsRaw, roomsByScheduleId);

  return {
    studentCount: studentCount || studentList.length,
    studentList,
    subjects,
  };
}
