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
};

export async function getPreviousClasses(employeeId, req) {

  const mappings = await attendanceService.getTeacherMappings(employeeId);

  if (!mappings.length) {
    return { data: [] };
  }

  // ===== DATE RANGE  =====
  const startDates = mappings
    .map(m => m.timeTablecreate?.startingDate)
    .filter(d => d && moment(d).isValid())
    .map(d => moment(d));

  const endDates = mappings
    .map(m => m.timeTablecreate?.endingDate)
    .filter(d => d && moment(d).isValid())
    .map(d => moment(d));

  const startDate = moment.min(startDates);
  const endDate = moment.min(
    moment.max(endDates),
    moment().subtract(1, "day")
  );

  if (endDate.isBefore(startDate)) {
    return { data: [] };
  }

  // ===== WEEK OFF =====
  const weekOff = (mappings[0].timeTablecreation?.weekOff || [])
    .map(d => d.toLowerCase());

  // ===== ATTENDANCE MAP =====
  const attendanceMap = await attendanceService.getAttendanceMap(
    mappings.map(m => m.timeTableMappingId),
    startDate.format("YYYY-MM-DD"),
    endDate.format("YYYY-MM-DD")
  );

  // ===== STUDENT COUNT CACHE =====
  const studentCountCache = {};

  // ===== FINAL GROUPED RESULT =====
  const dateMap = {};

  // ===== MAIN LOOP =====
  for (const map of mappings) {
    let date = startDate.clone();

    const sectionId = map.timeTablecreate?.classSectionsId;
    if (!sectionId) continue;

    if (!studentCountCache[sectionId]) {
      studentCountCache[sectionId] =
        await attendanceService.getStudentCount(sectionId);
    }

    const totalStudents = studentCountCache[sectionId];

    while (date.isSameOrBefore(endDate)) {

      const dayName = date.format("dddd");
      const dateStr = date.format("YYYY-MM-DD");

      if (
        map.day === dayName &&
        !weekOff.includes(dayName.toLowerCase())
      ) {

        const key = `${map.timeTableMappingId}_${dateStr}`;
        const presentCount = attendanceMap[key] ?? 0;

        if (!dateMap[dateStr]) {
          dateMap[dateStr] = {
            date: dateStr,
            day: dayName,
            classes: []
          };
        }

        dateMap[dateStr].classes.push({
          period: map.period,

          subject:
            map.timeTableSubject?.subjectName ||
            null,

          class:
            map.timeTablecreate?.timeTableClassSection?.classGroup?.className || null,

          section:
            map.timeTablecreate?.timeTableClassSection?.section || null,

          classSectionsId: sectionId,

          attendance: `${presentCount} / ${totalStudents}`,

          status:
            attendanceMap[key] !== undefined ? "MARKED" : "PENDING",

          timeTableMappingId: map.timeTableMappingId
        });
      }

      date.add(1, "day");
    }
  }

  // ===== SORT DATES =====
  const finalData = Object.values(dateMap)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    fromDate: startDate.format("YYYY-MM-DD"),
    toDate: endDate.format("YYYY-MM-DD"),
    data: finalData
  };
};


// export async function getPreviousClasses(employeeId, req) {
//   const { instituteId, universityId } = req.user;

//    Get teacher mappings
//   const mappings = await attendanceService.getTeacherMappings(employeeId);

//   if (!mappings.length) {
//     return {
//       employeeId,
//       data: []
//     };
//   }

//   //  SAFELY CALCULATE START DATE
//   const validStartDates = mappings
//     .map(m => m.timeTablecreate?.startingDate)
//     .filter(d => d && moment(d).isValid())
//     .map(d => moment(d));

//   if (!validStartDates.length) {
//     throw new Error("No valid timetable start date found");
//   }

//   const startDate = moment.min(validStartDates);

//   //  SAFELY CALCULATE END DATE (exclude today)
//   const validEndDates = mappings
//     .map(m => m.timeTablecreate?.endingDate)
//     .filter(d => d && moment(d).isValid())
//     .map(d => moment(d));

//   if (!validEndDates.length) {
//     throw new Error("No valid timetable end date found");
//   }

//   const endDate = moment.min(
//     moment.max(validEndDates),
//     moment().subtract(1, "day")
//   );

//   //  FINAL DATE GUARDS
//   if (!startDate.isValid() || !endDate.isValid()) {
//     throw new Error("Invalid timetable date range");
//   }

//   if (endDate.isBefore(startDate)) {
//     return {
//       fromDate: startDate.format("YYYY-MM-DD"),
//       toDate: endDate.format("YYYY-MM-DD"),
//       data: []
//     };
//   }

//   //  WEEK OFF (normalized)
//   const weekOff = (mappings[0].timeTablecreation?.weekOff || [])
//     .map(d => d.toLowerCase());

//   const studentCountCache = {};
//   const result = [];

//   //  ATTENDANCE MAP
//   const attendanceMap = await attendanceService.getAttendanceMap(
//     mappings.map(m => m.timeTableMappingId),
//     startDate.format("YYYY-MM-DD"),
//     endDate.format("YYYY-MM-DD")
//   );

//   //  MAIN LOGIC
//   for (const map of mappings) {
//     let date = startDate.clone();

//     const sectionId = map.timeTablecreate?.classSectionsId;
//     if (!sectionId) continue;

//     if (!studentCountCache[sectionId]) {
//       studentCountCache[sectionId] =
//         await attendanceService.getStudentCount(sectionId);
//     }

//     while (date.isSameOrBefore(endDate)) {
//       const dayName = date.format("dddd");

//       if (
//         map.day === dayName &&
//         !weekOff.includes(dayName.toLowerCase())
//       ) {
//         const key = `${map.timeTableMappingId}_${date.format("YYYY-MM-DD")}`;
//         const presentCount = attendanceMap[key];

//         result.push({
//           date: date.format("YYYY-MM-DD"),
//           day: dayName,
//           period: map.period,

//           subjectName:
//             map.timeTableSubject?.subjectName ||
//             map.timeTableTeacherSubject?.employeeSubject?.subjects?.subjectName ||
//             null,

//           subjectId: map.timeTableSubject?.subjectId || null,

//           section:
//             map.timeTablecreate?.timeTableClassSection?.section || null,

//           class:
//             map.timeTablecreate?.timeTableClassSection?.classGroup?.className || null,

//           classSectionsId:
//             map.timeTablecreate?.timeTableClassSection?.classSectionsId || null,

//           attendance:
//             presentCount !== undefined
//               ? `${presentCount}/${studentCountCache[sectionId]}`
//               : "Attendance Not Marked",

//           status:
//             presentCount !== undefined ? "MARKED" : "PENDING",

//           timeTableMappingId: map.timeTableMappingId
//         });
//       }

//       date.add(1, "day");
//     }
//   }

//   //  SORT FOR UI
//   result.sort((a, b) => {
//     if (a.date === b.date) return a.period - b.period;
//     return new Date(a.date) - new Date(b.date);
//   });

//   return {
//     fromDate: startDate.format("YYYY-MM-DD"),
//     toDate: endDate.format("YYYY-MM-DD"),
//     data: result
//   };
// }