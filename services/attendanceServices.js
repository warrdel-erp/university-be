import * as attendanceService  from "../repository/attendanceRepository.js";
import moment from "moment";

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

/* ----------------  Parse student string ---------------- */
function parseStudentString(studentString) {
  if (!studentString) return null;
  try {
    const [namePart, idsPart] = studentString.split("$");
    const [studentId, classSectionsId, timeTableMappingId] = idsPart
      .replace(/\s+/g, "")
      .split(/[%&]/);

    return {
      studentName: namePart,
      studentId: Number(studentId),
      classSectionsId: Number(classSectionsId),
      timeTableMappingId: Number(timeTableMappingId),
    };
  } catch (error) {
    console.error(" Error parsing student string:", studentString, error);
    return null;
  }
}

/* ----------------  Parse date column correctly ---------------- */
function parseExcelDate(dateString) {
  try {
    const parsed = moment(dateString, "D MMMM YYYY", true);
    if (!parsed.isValid()) return null;
    return parsed.format("YYYY-MM-DD"); //remove timee
  } catch {
    return null;
  }
}

/* ----------------  Validate required fields ---------------- */
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
    "date",
  ];

  for (const field of requiredFields) {
    if (!attendance[field]) {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}

/* ----------------  Main Import Function ---------------- */
export async function importAttendanceData(excelData, commonData) {
  try {
    const dateColumns = Object.keys(excelData[0]).filter(
      (key) => key !== "Name" && key !== "Scholar No"
    );

    const dataRows = excelData.slice(1);
    let totalEntries = 0;

    for (const [index, row] of dataRows.entries()) {
      const parsedStudent = parseStudentString(row.Name);
      if (!parsedStudent) {
        throw new Error(`Row ${index + 2}: Invalid student name format`);
      }

      for (const dateCol of dateColumns) {
        const status = String(row[dateCol]).trim();

        if (!status) continue; 

        if (status.toLowerCase() === 'undefined') {
             console.log(` Skipping entry where status is 'undefined' for date: ${dateCol}`);
            continue; 
        }

        const date = parseExcelDate(dateCol);
        if (!date && !status) continue;

        const attendanceEntry = {
          studentId: parsedStudent.studentId,
          classSectionsId: parsedStudent.classSectionsId,
          timeTableMappingId: parsedStudent.timeTableMappingId,
          date,
          attentenceStatus: status,
          ...commonData,
        };

        const error = validateAttendanceRow(attendanceEntry);
        if (error) {
          throw new Error(
            `Row ${index + 2} (${parsedStudent.studentName}) — ${error}`
          );
        }
        await attendanceService.addImportAttendance(attendanceEntry);
        totalEntries++;
      }
    }

    return {
      success: true,
      message: `Attendance imported successfully. Total entries: ${totalEntries}`,
    };
  } catch (error) {
    console.error(" Error importing attendance data:", error.message);
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
            attendanceId : att.attendanceId,
            firstName: att.studentAttendance?.firstName || '',
            scholarNumber: att.studentAttendance?.scholarNumber || '',
            enrollNumber: att.studentAttendance?.enrollNumber || '',
            attentenceStatus: att.attentenceStatus || '',
            notes: att.notes || ''
        });
    });

    return {
        // originalData: data,
        groupedData: Object.values(grouped)
    };
}
