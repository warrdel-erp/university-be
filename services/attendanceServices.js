import * as attendanceService from "../repository/attendanceRepository.js";
import moment from "moment";
import * as helper from "../utility/helper.js";

export async function addAttendance(attendanceData, createdBy, updatedBy) {
  try {
    const isExists = await attendanceService.checkAttendanceExists(attendanceData.timeTableMappingId, attendanceData.date);
    if (isExists) {
      throw new Error(`Attendance already marked for this date and period`);
    }

    const attendanceRecords = attendanceData.attendance.map(attendance => ({
      ...attendance,
      classSectionsId: attendanceData.classSectionsId,
      timeTableMappingId: attendanceData.timeTableMappingId,
      date: attendanceData.date,
      createdBy,
      updatedBy,
    }));

    const addedAttendance = await attendanceService.addAttendance(attendanceRecords);
    return addedAttendance;
  } catch (error) {
    console.error('Error adding Attendance:', error);
    throw error;
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
      firstName: studentAttendance?.firstName,
      middleName: studentAttendance?.middleName,
      lastName: studentAttendance?.lastName,
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


export async function getAttendanceByDate(date, classSectionsId, employeeId) {
  const data = await attendanceService.getAttendanceByDate(date, classSectionsId, employeeId);

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
      attendanceId: att.attendanceId,
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

// export async function getPreviousClasses(employeeId, req) {
//   const mappings = await attendanceService.getTeacherMappings(employeeId);

//   // Guard against null or empty mappings
//   if (!Array.isArray(mappings) || !mappings.length) {
//     return { data: [] };
//   }

//   // ===== DATE RANGE =====
//   const startDates = mappings
//     .map(m => m.timeTablecreate?.startingDate)
//     .filter(d => d && moment(d).isValid())
//     .map(d => moment(d));

//   const endDates = mappings
//     .map(m => m.timeTablecreate?.endingDate)
//     .filter(d => d && moment(d).isValid())
//     .map(d => moment(d));

//   // Ensure we have valid dates to calculate min/max
//   if (!startDates.length || !endDates.length) {
//     return { data: [] };
//   }

//   const startDate = moment.min(startDates);
//   const endDate = moment.min(
//     moment.max(endDates),
//     moment().subtract(1, "day")
//   );

//   if (endDate.isBefore(startDate)) {
//     return { data: [] };
//   }

//   // ===== WEEK OFF (FIXED) =====
//   // This handles if weekOff is an Object, Array, or Null
//   const rawWeekOff = mappings[0]?.timeTablecreation?.weekOff || [];
//   console.log(`>>>>>>>rawWeekOff>>>`,JSON.stringify(rawWeekOff));

//   const weekOffArray = Array.isArray(rawWeekOff) 
//     ? rawWeekOff 
//     : (rawWeekOff && typeof rawWeekOff === 'object' ? Object.values(rawWeekOff) : []);
//   console.log(`>>>>>>>weekOffArray>>>`,JSON.stringify(weekOffArray));

//   const weekOff = weekOffArray.map(d => String(d).toLowerCase());
//   console.log(`>>>>>>>weekOff>>>`,JSON.stringify(weekOff));
//   // ===== ATTENDANCE MAP =====
//   const attendanceMap = (await attendanceService.getAttendanceMap(
//     mappings.map(m => m.timeTableMappingId),
//     startDate.format("YYYY-MM-DD"),
//     endDate.format("YYYY-MM-DD")
//   )) || {};

//   const studentCountCache = {};
//   const flatData = []; 

//   // ===== MAIN LOOP =====
//   for (const map of mappings) {
//     let date = startDate.clone();
//     const sectionId = map.timeTablecreate?.classSectionsId;
//     if (!sectionId) continue;

//     if (!studentCountCache[sectionId]) {
//       studentCountCache[sectionId] = await attendanceService.getStudentCount(sectionId);
//     }

//     const totalStudents = studentCountCache[sectionId] || 0;

//     while (date.isSameOrBefore(endDate)) {
//       const dayName = date.format("dddd");
//       const dateStr = date.format("YYYY-MM-DD");

//       // Check if this mapping applies to this day and is NOT a week off
//       if (
//         map.day === dayName &&
//         !weekOff.includes(dayName.toLowerCase())
//       ) {
//         const key = `${map.timeTableMappingId}_${dateStr}`;
//         const presentCount = attendanceMap[key] ?? 0;

//         flatData.push({
//           date: dateStr,
//           day: dayName,
//           period: map.period,
//           subject: map.timeTableSubject?.subjectName || map.timeTableTeacherSubject?.subject?.subjectName || null,       
//           class: map.timeTablecreate?.timeTableClassSection?.classGroup?.className || null,
//           section: map.timeTablecreate?.timeTableClassSection?.section || null,
//           classSectionsId: sectionId,
//           attendance: `${presentCount} / ${totalStudents}`,
//           status: attendanceMap[key] !== undefined ? "MARKED" : "PENDING",
//           timeTableMappingId: map.timeTableMappingId
//         });
//       }
//       date.add(1, "day");
//     }
//   }

//   // ===== SORT BY DATE DESCENDING, THEN BY PERIOD ASCENDING =====
//   flatData.sort((a, b) => {
//     const dateDiff = new Date(b.date) - new Date(a.date);
//     if (dateDiff !== 0) return dateDiff;
//     return (Number(a.period) || 0) - (Number(b.period) || 0);
//   });

//   return {
//     fromDate: startDate.format("YYYY-MM-DD"),
//     toDate: endDate.format("YYYY-MM-DD"),
//     data: flatData
//   };
// };

export async function getPreviousClasses(employeeId, req) {
  const mappings = await attendanceService.getTeacherMappings(employeeId);

  if (!Array.isArray(mappings) || !mappings.length) {
    return { data: [] };
  }

  // Use the first mapping's configuration for dates and week-offs
  const config = mappings[0].timeTablecreate || mappings[0].timeTablecreation;

  const startDates = mappings
    .map(m => (m.timeTablecreate?.startingDate || m.timeTablecreation?.startingDate))
    .filter(d => d && moment(d).isValid())
    .map(d => moment(d));

  const endDates = mappings
    .map(m => (m.timeTablecreate?.endingDate || m.timeTablecreation?.endingDate))
    .filter(d => d && moment(d).isValid())
    .map(d => moment(d));

  if (!startDates.length || !endDates.length) {
    return { data: [] };
  }

  const startDate = moment.min(startDates);
  // Cap the search at yesterday to avoid showing today's incomplete data or future dates
  const endDate = moment.min(
    moment.max(endDates),
    moment().subtract(1, "day")
  );

  if (endDate.isBefore(startDate)) {
    return { data: [] };
  }

  // Improved Week Off handling to match property names in your includes
  const rawWeekOff = config?.weekOff || [];
  const weekOffArray = Array.isArray(rawWeekOff)
    ? rawWeekOff
    : (rawWeekOff && typeof rawWeekOff === 'object' ? Object.values(rawWeekOff) : []);
  const weekOff = weekOffArray.map(d => String(d).toLowerCase());

  const attendanceMap = (await attendanceService.getAttendanceMap(
    mappings.map(m => m.timeTableMappingId),
    startDate.format("YYYY-MM-DD"),
    endDate.format("YYYY-MM-DD")
  )) || {};

  const studentCountCache = {};
  const flatData = [];

  for (const map of mappings) {
    let date = startDate.clone();
    const sectionId = map.timeTablecreate?.classSectionsId;
    if (!sectionId) continue;

    if (!studentCountCache[sectionId]) {
      studentCountCache[sectionId] = await attendanceService.getStudentCount(sectionId);
    }

    const totalStudents = studentCountCache[sectionId] || 0;

    while (date.isSameOrBefore(endDate)) {
      const dayName = date.format("dddd");
      const dateStr = date.format("YYYY-MM-DD");

      if (map.day === dayName && !weekOff.includes(dayName.toLowerCase())) {
        const key = `${map.timeTableMappingId}_${dateStr}`;
        const presentCount = attendanceMap[key]; // Do not use ?? 0 yet to check for undefined

        flatData.push({
          date: dateStr,
          day: dayName,
          period: map.period,
          // Check primary subject mapping first, then check teacher-subject mapping
          subject: map.timeTableSubject?.subjectName ||
            map.timeTableTeacherSubject?.subject?.subjectName ||
            "N/A",
          class: map.timeTablecreate?.timeTableClassSection?.classGroup?.className || null,
          section: map.timeTablecreate?.timeTableClassSection?.section || null,
          classSectionsId: sectionId,
          attendance: `${presentCount ?? 0} / ${totalStudents}`,
          status: presentCount !== undefined ? "MARKED" : "PENDING",
          timeTableMappingId: map.timeTableMappingId
        });
      }
      date.add(1, "day");
    }
  }

  flatData.sort((a, b) => {
    const dateDiff = new Date(b.date) - new Date(a.date);
    if (dateDiff !== 0) return dateDiff;
    return (Number(a.period) || 0) - (Number(b.period) || 0);
  });

  return {
    fromDate: startDate.format("YYYY-MM-DD"),
    toDate: endDate.format("YYYY-MM-DD"),
    data: flatData
  };
};

export async function getStudentAttendanceReport(classSectionsId, subjectId, employeeId) {
  const students = await attendanceService.getStudentAttendanceReport(classSectionsId, subjectId, employeeId);

  return students;

};

export async function getEmployeeClassDates(classSectionId, subjectId, employeeId) {
  const scheduleItems = await attendanceService.getEmployeeScheduleWithRoutine(classSectionId, subjectId, employeeId);

  const dateMap = {};

  for (const item of scheduleItems) {
    const routine = item.timeTablecreate;
    if (!routine || !routine.startingDate || !routine.endingDate) continue;

    const targetDay = item.day.toLowerCase();
    const specificDates = helper.getDatesForDayInRange(routine.startingDate, routine.endingDate, targetDay);

    specificDates.forEach(date => {
      const dateKey = date.toISOString().split('T')[0];
      if (!dateMap[dateKey]) {
        dateMap[dateKey] = {
          date: dateKey,
          day: item.day,
          timeTableRoutineId: routine.timeTableRoutineId,
          periods: []
        };
      }
      dateMap[dateKey].periods.push({
        timeTableMappingId: item.timeTableMappingId,
        timeTableCreationId: item.timeTablecreation?.timeTableCreationId,
        periodName: item.timeTablecreation?.periodName,
        startTime: item.timeTablecreation?.startTime,
        endTime: item.timeTablecreation?.endTime
      });
    });
  }

  // Convert map to array and sort
  const result = Object.values(dateMap).map(dayData => {
    // Sort periods within the day by start time
    dayData.periods.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    return dayData;
  });

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

export async function getStudentsBatchAttendance(classSectionsId, filters) {
  const students = await attendanceService.getStudentsBatchAttendance(classSectionsId, filters);

  return students
  // return students.map(student => {
  //   const studentObj = student.get({ plain: true });
  //   const attendances = (studentObj.studentAttendance || []).map(att => ({
  //     attendanceId: att.attendanceId,
  //     date: att.date ? moment(att.date).format("YYYY-MM-DD") : null,
  //     attendanceStatus: att.attendanceStatus,
  //     timeTableMappingId: att.timeTableMappingId
  //   }));

  //   delete studentObj.studentAttendance;
  //   return {
  //     ...studentObj,
  //     attendances
  //   };
  // });
}