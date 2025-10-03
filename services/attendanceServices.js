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

export async function getAttendanceDetails(universityId, acedmicYearId, role, instituteId) {
  const result = await attendanceService.getAttendanceDetails(universityId, acedmicYearId, role, instituteId);
  const groupedData = {};
  for (const record of result) {
    const {
      attendanceId,
      timeTableMapping,
      classAttendance,
      studentAttendance,
      studentId,
      attentenceStatus,
      date,
      description,
      notes
    } = record;
    const recordDate = new Date(date).toISOString().split('T')[0];
    const subjectId = timeTableMapping?.isSameTeacher
      ? timeTableMapping?.timeTableTeacherSubject?.employeeSubject?.subjects?.subjectId
      : timeTableMapping?.subjectId;
    const subjectName = timeTableMapping?.isSameTeacher
      ? timeTableMapping?.timeTableTeacherSubject?.employeeSubject?.subjects?.subjectName
      : timeTableMapping?.timeTableSubject?.subjectName;
    const subjectCode = timeTableMapping?.isSameTeacher
      ? timeTableMapping?.timeTableTeacherSubject?.employeeSubject?.subjects?.subjectCode
      : timeTableMapping?.timeTableSubject?.subjectCode;
    const employeeId = timeTableMapping?.isSameTeacher
      ? timeTableMapping?.timeTableTeacherSubject?.employeeId
      : timeTableMapping.employeeId;
    const classSectionsId = classAttendance?.classSectionsId;
    const sectionName = classAttendance?.section;
    const groupKey = `${subjectId}_${employeeId}_${classSectionsId}_${recordDate}`;
    if (!groupedData[groupKey]) {
      groupedData[groupKey] = {
        subjectId,
        subjectName,
        subjectCode,
        employeeId,
        classSectionId: classSectionsId,
        sectionName,
        date: recordDate,
        students: []
      };
    }
    groupedData[groupKey].students.push({
      studentId,
      attendanceId,
      scholarNumber: studentAttendance?.scholarNumber,
      fullName: [studentAttendance?.firstName, studentAttendance?.middleName, studentAttendance?.lastName]
        .filter(Boolean)
        .join(" "),
      firstName:studentAttendance?.firstName,
      middleName:studentAttendance?.middleName,
      lastName:studentAttendance?.lastName,
      attentenceStatus,
      date: recordDate,
      description,
      notes
    });
  }
  return {
    original: result,
    grouped: Object.values(groupedData)
  };
}

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

function validateAttendanceRow(attendance) {
  const requiredFields = [
    "studentId",
    "classSectionsId",
    "timeTableMappingId",
    "instituteId",
    "universityId",
    "createdBy",
    "updatedBy",
    "attentenceStatus",
    "date"
  ];

  for (const field of requiredFields) {
    if (!attendance[field] || attendance[field] === "") {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}

 function excelDateToJSDate(value) {
  if (!value) return null;

  // If already a Date object
  if (value instanceof Date) return value;

  // If it's a number → treat as Excel serial date
  if (!isNaN(value)) {
    try {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30)); 
      return new Date(excelEpoch.getTime() + value * 86400000);
    } catch (error) {
      console.error("Error converting excel serial date:", value, error);
      return null;
    }
  }

  // If it's a string → try parsing directly
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    } else {
      console.error("Invalid date string:", value);
      return null;
    }
  }

  return null;
};

 function parseStudentString(studentString) {
  if (!studentString) return null;

  try {
    const [namePart, idsPart] = studentString.split("$");
    const [studentId, classSectionsId, timeTableMappingId] = idsPart
      .replace(/\s+/g, "") 
      .split(/[%&]/);

    return {
      studentName: namePart,
      studentId: parseInt(studentId, 10),
      classSectionsId: parseInt(classSectionsId, 10),
      timeTableMappingId: parseInt(timeTableMappingId, 10),
    };
  } catch (error) {
    console.error("Error parsing student string:", studentString, error);
    return null;
  }
};

export async function importAttendanceData(excelData, commonData) {

  try {
    for (const [index, row] of excelData.entries()) {
      const parsedStudent = parseStudentString(row.studentName);
      if (!parsedStudent) {
        throw new Error(`Row ${index + 1}: Invalid studentName format`);
      }

      const convertedDate = excelDateToJSDate(row.date);

      const convertedData = {
        ...row,
        ...commonData,
        studentId: parsedStudent.studentId,
        classSectionsId: parsedStudent.classSectionsId,
        timeTableMappingId: parsedStudent.timeTableMappingId,
        date: convertedDate, 
      };

      const error = validateAttendanceRow(convertedData);
      if (error) {
        throw new Error(`Row ${index + 1} (${parsedStudent.studentName}): ${error}`);
      }

      await attendanceService.addImportAttendance(convertedData);
    } 

    return { success: true, message: "Attendance imported successfully" };
  } catch (error) {
    console.error("Error in importing attendance data:", error.message);
    return { success: false, error: error.message };
  }
};

export async function getAttendanceByDate(date, classSectionsId,employeeId) {
    const data = await attendanceService.getAttendanceByDate(date, classSectionsId,employeeId);

    const { attendanceDetails = [], subjectDetail = {} } = data;

    const grouped = {};

    attendanceDetails.forEach(att => {
        const classAtt = att.classAttendance;
        if (!classAtt) return;

        const courseName = classAtt.courseSection?.courseName || '';
        const className = classAtt.class || '';
        const sectionName = classAtt.section || '';
        const dateStr = att.date?.toISOString().split('T')[0] || '';

        //  Subject comes from subjectDetail, not courseSection
        const subjectName = subjectDetail?.employeeSubject?.subjects?.subjectName || '';
        
        const key = `${courseName}-${className}-${sectionName}-${subjectName}-${dateStr}`;

        if (!grouped[key]) {
            grouped[key] = {
                course: courseName,
                class: className,
                section: sectionName,
                subject: subjectName,
                date: dateStr,
                students: []
            };
        }

        // Add student
        grouped[key].students.push({
            firstName: att.studentAttendance?.firstName || '',
            scholarNumber: att.studentAttendance?.scholarNumber || '',
            enrollNumber: att.studentAttendance?.enrollNumber || '',
            attendenceStatus: att.attentenceStatus || '',
            notes: att.notes || ''
        });
    });

    return {
        // originalData: data,
        groupedData: Object.values(grouped)
    };
}
