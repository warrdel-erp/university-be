import * as examStructureScheduleRepository from "../repository/examStructureScheduleMappingRepository.js";
import { getCourseByCourseId, getSemestersByCourseId } from "../repository/courseRepository.js";

function normalizeTermName(name) {
  return String(name ?? "").trim().replace(/\s+/g, " ");
}

function buildTermName(termType, term) {
  return `${termType} ${term}`;
}

function termNamesMatch(left, right) {
  return normalizeTermName(left).toLowerCase() === normalizeTermName(right).toLowerCase();
}

function extractTermNumber(name) {
  const match = String(name ?? "").match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function resolveSemesterIdForTerm({
  term,
  termName,
  name,
  courseId,
  acedmicYearId = null,
  semesters = [],
}) {
  const semesterName = name ?? termName ?? null;
  const normalizedSemesterName = semesterName != null ? normalizeTermName(semesterName) : null;

  const courseSemesters = semesters.filter(
    (semester) => Number(semester.courseId) === Number(courseId),
  );

  const pickFromMatches = (matches) => {
    if (!matches.length) return null;
    if (acedmicYearId) {
      const inYear = matches.find(
        (semester) => Number(semester.acedmicYearId) === Number(acedmicYearId),
      );
      if (inYear) return inYear.semesterId;
    }
    return matches[0].semesterId;
  };

  if (term != null) {
    const byTermNumber = courseSemesters.filter(
      (semester) => extractTermNumber(semester.name) === Number(term),
    );
    const termNumberMatch = pickFromMatches(byTermNumber);
    if (termNumberMatch) {
      return termNumberMatch;
    }
  }

  if (normalizedSemesterName) {
    const byExactName = courseSemesters.filter((semester) =>
      termNamesMatch(semester.name, normalizedSemesterName),
    );
    const exactMatch = pickFromMatches(byExactName);
    if (exactMatch) {
      return exactMatch;
    }
  }

  const byTermIndex = courseSemesters[Number(term) - 1];
  return byTermIndex?.semesterId ?? null;
}

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

async function resolveAcedmicYearId(examDetail) {
  if (!examDetail.acedmicYearId && examDetail.subjectId) {
    const acedmicYearId = await examStructureScheduleRepository.findSubjectAcedmicYearId(examDetail.subjectId);
    if (acedmicYearId) {
      examDetail.acedmicYearId = acedmicYearId;
    }
  }
}

async function resolveSemesterIdForExamDetail(examDetail) {
  if (examDetail.semesterId != null) {
    return examDetail.semesterId;
  }
  if (!examDetail.examSetupTypeTermId) {
    return null;
  }

  const termDetail = await examStructureScheduleRepository.getExamSetupTypeTermById(
    examDetail.examSetupTypeTermId,
  );
  if (!termDetail) {
    return null;
  }

  const courseId = termDetail.courseId;
  const term = termDetail.term;
  const acedmicYearId = examDetail.acedmicYearId ?? termDetail.acedmicYearId ?? null;
  const course = await getCourseByCourseId(courseId);
  if (!course || term == null) {
    return null;
  }

  const termType = course.dataValues?.termType ?? course.termType;
  const termName = buildTermName(termType, term);
  const semesters = await getSemestersByCourseId(courseId);

  return resolveSemesterIdForTerm({
    term,
    termName,
    courseId,
    acedmicYearId,
    semesters,
  });
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
        const semesterName = sub.semestermapping?.name;
        const semesterId = sub.semestermapping?.semesterId;

        const students = sub.semestermapping?.studentSemester || [];
        const studentCount = students.length;

        const teachers = (sub.employeeSubject || []).map((ts) => ({
          teacherSubjectMappingId: ts.teacherSubjectMappingId,
          employeeId: ts.employeeId,
          employee: {
            employeeId: ts.teacherEmployeeData?.employeeId || null,
            employeeName: ts.teacherEmployeeData?.employeeName || null,
            employeeCode: ts.teacherEmployeeData?.employeeCode || null,
            department: ts.teacherEmployeeData?.department || null,
            employmentType: ts.teacherEmployeeData?.employmentType || null,
          },
        }));

        const allSchedules = (row.examSetupTypeTerms || []).flatMap((term) => term.examSchedules || []);

        const exam = allSchedules.find((ex) => ex.subjectId === subjectId && ex.semesterId === semesterId);

        secondScreenData.push({
          examSetupTypeId: row.examSetupTypeId,
          subjectName,
          subjectId,
          subjectType,
          semesterName,
          semesterId,
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

  const acedmicYearId = examDetail.acedmicYearId ?? termDetail.acedmicYearId;
  const { startMinutes, endMinutes } = getExamSlotMinutes(examDetail.examTime, examDetail.duration);

  const conflict = await examStructureScheduleRepository.findConflictingExamForStudentCohort({
    examDate: examDetail.examDate,
    startMinutes,
    endMinutes,
    sessionId: examDetail.sessionId,
    acedmicYearId,
    courseId: termDetail.courseId,
    term: termDetail.term,
    semesterId: examDetail.semesterId ?? null,
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

  await resolveAcedmicYearId(examDetail);
  const resolvedSemesterId = await resolveSemesterIdForExamDetail(examDetail);
  if (!resolvedSemesterId) {
    throw new Error('semesterId could not be resolved for exam schedule');
  }
  examDetail.semesterId = resolvedSemesterId;

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
  await resolveAcedmicYearId(examDetail);
  if (examDetail.semesterId == null && examDetail.examSetupTypeTermId) {
    const resolvedSemesterId = await resolveSemesterIdForExamDetail(examDetail);
    if (resolvedSemesterId) {
      examDetail.semesterId = resolvedSemesterId;
    }
  }
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

  if (!data || !data.studentSemester) {
    return null;
  }

  return {
    studentId: data.studentId,
    studentName: data.firstName,
    semesterId: data.studentSemester.semesterId,
    semesterName: data.studentSemester.name,
    exams: data.studentSemester.examSchedules.map((exam) => ({
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

export async function getSubjectsWithExamSchedule(examSetupTypeTermId, acedmicYearId, sessionId) {
  const termDetail = await examStructureScheduleRepository.getExamSetupTypeTermById(examSetupTypeTermId);
  if (!termDetail) {
    throw new Error("Exam setup type term not found");
  }

  const courseId = termDetail.courseId;
  const term = termDetail.term;
  const parsedExamSetupTypeTermId = parseInt(examSetupTypeTermId);
  const parsedAcedmicYearId = acedmicYearId ? parseInt(acedmicYearId) : null;
  const parsedSessionId = sessionId ? parseInt(sessionId) : null;

  const subjectRows = await examStructureScheduleRepository.findSubjectsWithSchedules(
    courseId,
    parsedAcedmicYearId,
    term,
    parsedExamSetupTypeTermId,
    parsedSessionId,
  );

  const subjectsRaw = subjectsToPlain(subjectRows);
  const examScheduleIds = collectExamScheduleIds(subjectsRaw);

  const [roomRows, studentRows] = await Promise.all([
    examStructureScheduleRepository.findRoomsByExamScheduleIds(examScheduleIds),
    examStructureScheduleRepository.findStudentsForTerm(courseId, parsedAcedmicYearId, term, parsedSessionId),
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
