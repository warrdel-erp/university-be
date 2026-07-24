import * as examStructureScheduleRepository from "../repository/examStructureScheduleMappingRepository.js";

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

async function resolveAcademicYearId(examDetail) {
  if (!examDetail.academicYearId && examDetail.subjectId) {
    const academicYearId = await examStructureScheduleRepository.findSubjectacademicYearId(examDetail.subjectId);
    if (academicYearId) {
      examDetail.academicYearId = academicYearId;
    }
  }
}

async function resolveTermForExamDetail(examDetail) {
  if (examDetail.term != null) {
    return Number(examDetail.term);
  }
  if (!examDetail.examSetupTypeTermId) {
    return null;
  }

  const termDetail = await examStructureScheduleRepository.getExamSetupTypeTermById(
    examDetail.examSetupTypeTermId,
  );
  return termDetail?.term != null ? Number(termDetail.term) : null;
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

export async function addExamStructureSchedule(examScheduleDetail, createdBy, updatedBy) {
  examScheduleDetail.createdBy = createdBy;
  examScheduleDetail.updatedBy = updatedBy;
  return examStructureScheduleRepository.addExamStructureSchedule(examScheduleDetail);
}

export async function getExamStructureSchedule(examSetupTypeId) {
  const schedules = await examStructureScheduleRepository.getExamStructureSchedule(examSetupTypeId);

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

        const allSchedules = (row.examSetupTypeTerms || []).flatMap((term) => term.examSchedules || []);

        const exam = allSchedules.find(
          (ex) => ex.subjectId === subjectId && Number(ex.term) === Number(programTerm),
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
  return await examStructureScheduleRepository.publishExamSchedule(examSetupTypeId, data);
}

function getExamSlotMinutes(examTime, duration) {
  const [h = 0, m = 0] = String(examTime).split(":").map(Number);
  const startMinutes = h * 60 + m;
  const durationMinutes = Number(duration);
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    throw new Error("Invalid exam duration");
  }
  return { startMinutes, endMinutes: startMinutes + durationMinutes };
}

async function assertNoStudentExamTimeConflict(examDetail, excludeExamScheduleId) {
  const termDetail = await examStructureScheduleRepository.getExamSetupTypeTermById(examDetail.examSetupTypeTermId);
  if (!termDetail) {
    throw new Error("Exam setup type term not found");
  }

  const academicYearId = examDetail.academicYearId ?? termDetail.academicYearId;
  const { startMinutes, endMinutes } = getExamSlotMinutes(examDetail.examTime, examDetail.duration);

  const conflict = await examStructureScheduleRepository.findConflictingExamForStudentCohort({
    examDate: examDetail.examDate,
    startMinutes,
    endMinutes,
    sessionId: examDetail.sessionId,
    academicYearId,
    courseId: termDetail.courseId,
    term: termDetail.term,
    excludeExamScheduleId,
  });

  if (conflict) {
    const subjectName = conflict.subjectSchedule?.subjectName ?? "another subject";
    throw new Error(`Cannot schedule exam: ${subjectName} is already scheduled at the same time for the same students`);
  }
}

export async function addExamSchedule(examDetail, createdBy, updatedBy) {
  examDetail.createdBy = createdBy;
  examDetail.updatedBy = updatedBy;

  await resolveAcademicYearId(examDetail);
  const resolvedTerm = await resolveTermForExamDetail(examDetail);
  if (resolvedTerm == null) {
    throw new Error('term could not be resolved for exam schedule');
  }
  examDetail.term = resolvedTerm;
  delete examDetail.semesterId;

  await assertNoStudentExamTimeConflict(examDetail);

  return await examStructureScheduleRepository.addExamSchedule(examDetail);
}

// export async function getDetailByExamType(examSetupTypeId) {
//   return await examStructureScheduleRepository.getDetailByExamType(examSetupTypeId);
// }

// export async function getExamDetailByStudentId(studentId) {
//   const data = await examStructureScheduleRepository.getExamDetailByStudentId(studentId);

//   if (!data || !data.studentSemester) {
//     return null;
//   }

//   const studentInfo = {
//     studentId: data.studentId,
//     studentName: data.firstName,
//     semesterId: data.studentSemester.semesterId,
//     semesterName: data.studentSemester.name,
//     exams: data.studentSemester.examSchedules.map((exam) => ({
//       subjectId: exam.subjectId,
//       subjectName: exam.subjectSchedule?.subjectName,
//       subjectCode: exam.subjectSchedule?.subjectCode,
//       subjectType: exam.subjectSchedule?.subjectType,
//       type: exam.type,
//       examDate: exam.examDate,
//       examTime: exam.examTime,
//       duration: exam.duration,
//     })),
//   };

//   return studentInfo;
// }

// export async function getExamScheduleById(examScheduleId) {
//   return await examStructureScheduleRepository.getExamScheduleById(examScheduleId);
// }

export async function updateExamSchedule(examScheduleId, examDetail, updatedBy) {
  examDetail.updatedBy = updatedBy;
  await resolveAcademicYearId(examDetail);
  const resolvedTerm = await resolveTermForExamDetail(examDetail);
  if (resolvedTerm != null) {
    examDetail.term = resolvedTerm;
  }
  delete examDetail.semesterId;

  await assertNoStudentExamTimeConflict(examDetail, examScheduleId);
  await examStructureScheduleRepository.updateExamSchedule(examScheduleId, examDetail);
}

export async function deleteExamSchedule(examScheduleId) {
  return await examStructureScheduleRepository.deleteExamSchedule(examScheduleId);
}

export async function getDetailByExamType(examSetupTypeId) {
  return examStructureScheduleRepository.getDetailByExamType(examSetupTypeId);
}

export async function getExamDetailByStudentId(studentId) {
  const data = await examStructureScheduleRepository.getExamDetailByStudentId(studentId);

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

export async function getSubjectsWithExamSchedule(examSetupTypeTermId, academicYearId, sessionId) {
  const termDetail = await examStructureScheduleRepository.getExamSetupTypeTermById(examSetupTypeTermId);
  if (!termDetail) {
    throw new Error("Exam setup type term not found");
  }

  const courseId = termDetail.courseId;
  const term = termDetail.term;
  const parsedExamSetupTypeTermId = parseInt(examSetupTypeTermId);
  const parsedacademicYearId = academicYearId ? parseInt(academicYearId) : null;
  const parsedSessionId = sessionId ? parseInt(sessionId) : null;

  const subjectRows = await examStructureScheduleRepository.findSubjectsWithSchedules(
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
    examStructureScheduleRepository.findStudentsForTerm(courseId, parsedacademicYearId, term, parsedSessionId),
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
