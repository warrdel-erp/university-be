import * as attendanceService  from "../repository/attendanceRepository.js";

export async function addAttendance(attendanceData, createdBy, updatedBy) {
    
    try {
        const attendanceRecords = attendanceData.attendance.map(attendance => ({
            ...attendance,
            classSectionsId: attendanceData.classSectionsId,
            timeTableMappingId: attendanceData.timeTableMappingId,
            date :attendanceData.date,
            createdBy,
            updatedBy,
        }));

        const addedAttendance = await attendanceService.addAttendance(attendanceRecords);
        return addedAttendance;
    } catch (error) {
        console.error('Error adding Attendance:', error);
        throw new Error('Unable to add Attendance');
    }
};

// export async function getAttendanceDetails(universityId,acedmicYearId,role,instituteId) {
//     return await attendanceService.getAttendanceDetails(universityId,acedmicYearId,role,instituteId);
// }

export async function getAttendanceDetails(universityId, acedmicYearId, role, instituteId) {
  const result = await attendanceService.getAttendanceDetails(universityId, acedmicYearId, role, instituteId);

  const groupedData = {};

  for (const record of result) {
    const {
      timeTableMapping,
      classAttendance,
      studentAttendance,
      studentId,
      attendenceStatus,
      date,
      description,
      notes
    } = record;

    const subjectId = timeTableMapping.subjectId;
    const employeeId = timeTableMapping?.timeTableTeacherSubject?.employeeId;
    const subjectName = timeTableMapping?.timeTableSubject?.subjectName;
    const subjectCode = timeTableMapping?.timeTableSubject?.subjectCode;
    const classSectionsId = classAttendance.classSectionsId;
    const sectionName = classAttendance.section;

    const groupKey = `${subjectId}_${employeeId}_${classSectionsId}`;

    if (!groupedData[groupKey]) {
      groupedData[groupKey] = {
        subjectId,
        subjectName,
        subjectCode,
        employeeId,
        classSectionId: classSectionsId,
        sectionName,
        students: []
      };
    }

    groupedData[groupKey].students.push({
      studentId,
      scholarNumber: studentAttendance.scholarNumber,
      fullName: [studentAttendance.firstName, studentAttendance.middleName, studentAttendance.lastName]
        .filter(Boolean)
        .join(" "),
      attendanceStatus: attendenceStatus,
      date,
      description,
      notes
    });
  }

  return {
    original: result,
    grouped: Object.values(groupedData)
  };
}


// export async function getAttendanceDetails(universityId, acedmicYearId, role, instituteId) {
//   const result = await attendanceService.getAttendanceDetails(universityId, acedmicYearId, role, instituteId);

//   const groupedData = {};

//   for (const record of result) {
//     const {
//       timeTableMapping: {
//         subjectId,
//         employeeId
//       },
//       classAttendance: {
//         classSectionsId,
//         section
//       },
//       studentAttendance: {
//         firstName,
//         middleName,
//         lastName,
//         scholarNumber
//       },
//       studentId,
//       attendenceStatus,
//       date,
//       description,
//       notes
//     } = record;

//     const groupKey = `${subjectId}_${employeeId}_${classSectionsId}`;

//     if (!groupedData[groupKey]) {
//       groupedData[groupKey] = {
//         subjectId,
//         employeeId,
//         classSectionId: classSectionsId,
//         sectionName: section,
//         students: []
//       };
//     }

//     groupedData[groupKey].students.push({
//       studentId,
//       scholarNumber,
//       fullName: [firstName, middleName, lastName].filter(Boolean).join(" "),
//       attendanceStatus: attendenceStatus,
//       date,
//       description,
//       notes
//     });
//   }

//   return Object.values(groupedData);
// };

export async function updateAttendance(attendanceId, record, updatedBy) {    
    try {
        
       
        record.updatedBy = updatedBy;
        const result = await attendanceService.updateAttendance(attendanceId, record);
        return result;
    } catch (error) {
        console.error(`Error updating Attendance:`, error);
        throw error;
    }
};