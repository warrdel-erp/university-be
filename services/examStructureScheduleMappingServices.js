import * as examStructureScheduleRepository from "../repository/examStructureScheduleMappingRepository.js";

export async function addExamStructureSchedule(examScheduleDetail, createdBy, updatedBy, universityId, instituteId) {
  examScheduleDetail.createdBy = createdBy;
  examScheduleDetail.updatedBy = updatedBy;
  examScheduleDetail.universityId = universityId;
  examScheduleDetail.instituteId = instituteId;
  const result = await examStructureScheduleRepository.addExamStructureSchedule(examScheduleDetail);
  return result;
};

// export async function getExamStructureSchedule(universityId, acedmicYearId, role, instituteId, examSetupTypeId) {

//   const schedules = await examStructureScheduleRepository.getExamStructureSchedule(
//     universityId, acedmicYearId, role, instituteId, examSetupTypeId
//   );  

//   const secondScreenData = [];

//   schedules.forEach(row => {
//     const subjects = row.syllabusDetailsExam || [];

//     subjects.forEach(subDetail => {
//       const subjectName = subDetail.syllabusSubject?.subjectName;
//       const subjectId = subDetail.syllabusSubject?.subjectId;
//       const subjectType = subDetail.subjectType;

//       subDetail.syllabusSubject?.subjects?.forEach(sub => {
//         const semesterName = sub.semestermapping?.name;
//         const semesterId = sub.semestermapping?.semesterId;

//         const students = sub.semestermapping?.studentSemester || [];
//         const studentCount = students.length;

//         // matched exam schedule
//         const exam = row.examSchedulesTypes?.find(
//           ex => ex.subjectId === subjectId && ex.semesterId === semesterId
//         );

//         secondScreenData.push({
//           examSetupTypeId: row.examSetupTypeId,
//           subjectName,
//           subjectId,
//           semesterName,
//           semesterId,
//           studentCount,
//           subjectType,
//           examScheduleId: exam?.examScheduleId || null,
//           examDate: exam?.examDate || null,
//           examTime: exam?.examTime || null,
//           duration: exam?.duration || null,
//           type: exam?.type || null
//         });
//       });
//     });
//   });

//   return secondScreenData;
// };

export async function getExamStructureSchedule(universityId, acedmicYearId, role, instituteId, examSetupTypeId) {
  const schedules = await examStructureScheduleRepository.getExamStructureSchedule(universityId, acedmicYearId, role, instituteId, examSetupTypeId);

  const secondScreenData = [];

  schedules.forEach(row => {
    const subjects = row.syllabusDetailsExam || [];

    subjects.forEach(subDetail => {
      const subjectName = subDetail.syllabusSubject?.subjectName;
      const subjectId = subDetail.syllabusSubject?.subjectId;
      const subjectType = subDetail.subjectType;

      subDetail.syllabusSubject?.subjects?.forEach(sub => {
        const semesterName = sub.semestermapping?.name;
        const semesterId = sub.semestermapping?.semesterId;

        const students = sub.semestermapping?.studentSemester || [];
        const studentCount = students.length;

        const teachers = (sub.employeeSubject || []).map(ts => ({
          teacherSubjectMappingId: ts.teacherSubjectMappingId,
          employeeId: ts.employeeId,
          employee: {
            employeeId: ts.teacherEmployeeData?.employeeId || null,
            employeeName: ts.teacherEmployeeData?.employeeName || null,
            employeeCode: ts.teacherEmployeeData?.employeeCode || null,
            department: ts.teacherEmployeeData?.department || null,
            employmentType: ts.teacherEmployeeData?.employmentType || null
          },
          // teacherSection: ts.teacherSection || null
        }));

        // flatten all schedules across all terms for this exam setup type
        const allSchedules = (row.examSetupTypeTerms || []).flatMap(term => term.examSchedules || []);

        const exam = allSchedules.find(
          ex => ex.subjectId === subjectId && ex.semesterId === semesterId
        );

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
};

export async function deleteExamSchedule(examScheduleId) {
  return await examStructureScheduleRepository.deleteExamSchedule(examScheduleId);
};

export async function updateExamSchedule(examScheduleId, examDetail, updatedBy) {
  examDetail.updatedBy = updatedBy;
  await examStructureScheduleRepository.updateExamSchedule(examScheduleId, examDetail);
};

export async function addExamSchedule(examDetail, createdBy, updatedBy, universityId, instituteId) {
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

export async function getExamScheduleById(examScheduleId) {
  return await examStructureScheduleRepository.getExamScheduleById(examScheduleId);
}

export async function getSubjectsWithExamSchedule(courseId, acedmicYearId, term, examSetupTypeTermId) {
  return await examStructureScheduleRepository.getSubjectsWithExamSchedule(
    courseId ? parseInt(courseId) : null,
    acedmicYearId ? parseInt(acedmicYearId) : null,
    term ? parseInt(term) : null,
    examSetupTypeTermId ? parseInt(examSetupTypeTermId) : null
  );
}