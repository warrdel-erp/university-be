import * as examStructureScheduleRepository from "../repository/examStructureScheduleMappingRepository.js";

export async function addExamStructureSchedule(examScheduleDetail, createdBy, updatedBy,universityId,instituteId) {
    examScheduleDetail.createdBy = createdBy;
    examScheduleDetail.updatedBy = updatedBy;
    examScheduleDetail.universityId = universityId;
    examScheduleDetail.instituteId = instituteId;
    const result = await examStructureScheduleRepository.addExamStructureSchedule(examScheduleDetail);
    return result;
};

export async function getExamStructureSchedule(universityId, acedmicYearId, role, instituteId) {
  const data = await examStructureScheduleRepository.getExamStructureSchedule(
    universityId,
    acedmicYearId,
    role,
    instituteId
  );

  if (!data || !data.length) {
    console.log("No data found");
    return;
  }

  const firstScreenData = [];
  const secondScreenData = [];

  data.forEach(schedule => {
    const examName = schedule.name;
    const examType = schedule.examSetupType?.examType;
    const startingDate = schedule.startingDate;
    const sessionName = schedule.sessionSchedule?.sessionName;

    const subjects = schedule.examSetupType?.syllabusDetailsExam || [];
    const totalSubjects = subjects.length;

    //  Data for first screen
    const subjectNames = subjects.map(s => s.syllabusSubject?.subjectName);

    firstScreenData.push({
      examName,
      examType,
      startingDate,
      totalSubjects,
      subjectNames,
      sessionName,
    });

    //  Data for second screen
    subjects.forEach(subDetail => {
      const subjectName = subDetail.syllabusSubject?.subjectName;
      const subjectType = subDetail.subjectType;

      subDetail.syllabusSubject?.subjects?.forEach(sub => {
        const semesterName = sub.semestermapping?.name;
        const students = sub.semestermapping?.studentSemester || [];
        const studentCount = students.length;

        const studentList = students.map(stu => ({
          studentName: stu.firstName,
          scholarNumber: stu.scholarNumber,
          enrollNumber: stu.enrollNumber,
        }));

        secondScreenData.push({
          subjectName,
          semesterName,
          studentCount,
          subjectType,
          studentList,
        });
      });
    });
  });

  console.log(`>>>>>>>>>>>>>>1111`,JSON.stringify(firstScreenData, null, 2));

  console.log(`>>>>>>>>>>>>>>>>>>222`,JSON.stringify(secondScreenData, null, 2));

  return { firstScreenData, secondScreenData };
}


export async function getSingleExamStructureSchedule(courseId,sessionId, universityId) {
    return await examStructureScheduleRepository.getSingleExamStructureSchedule(courseId,sessionId, universityId);
};

export async function deleteExamStructureSchedule(examStructureScheduleId) {
    return await examStructureScheduleRepository.deleteExamStructureSchedule(examStructureScheduleId);
};

export async function updateExamStructureSchedule(examStructureScheduleId, examDetail, updatedBy) {
    examDetail.updatedBy = updatedBy;
    await examStructureScheduleRepository.updateExamStructureSchedule(examStructureScheduleId, examDetail);
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