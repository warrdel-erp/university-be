import * as examStructureScheduleRepository from "../repository/examStructureScheduleMappingRepository.js";

export async function addExamStructureSchedule(examScheduleDetail, createdBy, updatedBy,universityId,instituteId) {
    examScheduleDetail.createdBy = createdBy;
    examScheduleDetail.updatedBy = updatedBy;
    examScheduleDetail.universityId = universityId;
    examScheduleDetail.instituteId = instituteId;
    const result = await examStructureScheduleRepository.addExamStructureSchedule(examScheduleDetail);
    return result;
};

export async function getExamStructureSchedule(universityId, acedmicYearId, role, instituteId, examSetupTypeId,examStructureScheduleMapperId) {
  const data = await examStructureScheduleRepository.getExamStructureSchedule(
    universityId,
    acedmicYearId,
    role,
    instituteId,
    examSetupTypeId,
    examStructureScheduleMapperId
  );

  if (!data || !data.length) {
    console.log("No data found");
    return;
  }

  const firstScreenData = [];
  const secondScreenData = [];

  data.forEach(schedule => {
    const examStructureScheduleMapperId = schedule.examStructureScheduleMapperId;
    const examName = schedule.name;
    const examType = schedule.examSetupType?.examType;
    const examSetupTypeId = schedule.examSetupType?.examSetupTypeId;
    const startingDate = schedule.startingDate;
    const sessionName = schedule.sessionSchedule?.sessionName;
    const mapperSchedule = schedule.mapperSchedule || [];

    const subjects = schedule.examSetupType?.syllabusDetailsExam || [];
    const totalSubjects = subjects.length;

    // ----------- FIRST SCREEN DATA -----------
    const subjectNames = subjects.map(s => s.syllabusSubject?.subjectName);
    firstScreenData.push({
      examSetupTypeId,
      examName,
      examType,
      startingDate,
      totalSubjects,
      subjectNames,
      sessionName,
    });

    // ----------- SECOND SCREEN DATA -----------
    subjects.forEach(subDetail => {
      const subjectName = subDetail.syllabusSubject?.subjectName;
      const subjectId = subDetail.syllabusSubject?.subjectId;
      const subjectType = subDetail.subjectType;

      // Match schedule data by subjectId
      const matchedSchedule = mapperSchedule.find(ms => ms.subjectId === subjectId);

      subDetail.syllabusSubject?.subjects?.forEach(sub => {
        const semesterName = sub.semestermapping?.name;
        const semesterId = sub.semestermapping?.semesterId;
        const students = sub.semestermapping?.studentSemester || [];
        const studentCount = students.length;

        const studentList = students.map(stu => ({
          studentId: stu.studentId,
          studentName: stu.firstName,
          scholarNumber: stu.scholarNumber,
          enrollNumber: stu.enrollNumber,
        }));

        secondScreenData.push({
          examStructureScheduleMapperId,
          examSetupTypeId,
          subjectName,
          subjectId,
          semesterName,
          semesterId,
          studentCount,
          subjectType,
          // studentList
          // --- Matched schedule details ---
          examScheduleId: matchedSchedule?.examScheduleId || null,
          examDate: matchedSchedule?.examDate || null,
          examTime: matchedSchedule?.examTime || null,
          duration: matchedSchedule?.duration || null,
          type: matchedSchedule?.type || null,
        });
      });
    });
  });

  console.log(">>> First Screen Data:", JSON.stringify(firstScreenData, null, 2));
  console.log(">>> Second Screen Data:", JSON.stringify(secondScreenData, null, 2));

  return { firstScreenData, secondScreenData };
};

export async function publishExamSchedule(publishExamStructureSchedule) {
  const { examScheduleId } = publishExamStructureSchedule;
  const data = { isPublish: true };
  return await examStructureScheduleRepository.publishExamSchedule(examScheduleId,data);
};

export async function deleteExamSchedule(examScheduleId) {
    return await examStructureScheduleRepository.deleteExamSchedule(examScheduleId);
};

export async function updateExamSchedule(examScheduleId, examDetail, updatedBy) {
    examDetail.updatedBy = updatedBy;
    await examStructureScheduleRepository.updateExamSchedule(examScheduleId, examDetail);
};

export async function addExamSchedule(examDetail, createdBy, updatedBy,universityId,instituteId) {
    examDetail.createdBy = createdBy;
    examDetail.updatedBy = updatedBy;
    const result = await examStructureScheduleRepository.addExamSchedule(examDetail);
    return result;
};

export async function getDetailByExamType(examSetupTypeId) {
    return await examStructureScheduleRepository.getDetailByExamType(examSetupTypeId);
};

export async function getExamDetailByStudentId(studentId) {
  const data = await examStructureScheduleRepository.getExamDetailByStudentId(studentId);

  if (!data || !data.studentSemester) {
    return null;
  }

  const studentInfo = {
    studentId: data.studentId,
    studentName: data.firstName,
    semesterId: data.studentSemester.semesterId,
    semesterName: data.studentSemester.name,
    exams: data.studentSemester.examSchedules.map(exam => ({
      subjectId: exam.subjectId,
      subjectName: exam.subjectSchedule?.subjectName,
      subjectCode: exam.subjectSchedule?.subjectCode,
      subjectType: exam.subjectSchedule?.subjectType,
      type: exam.type,
      examDate: exam.examDate,
      examTime: exam.examTime,
      duration: exam.duration
    }))
  };

  return studentInfo;
};