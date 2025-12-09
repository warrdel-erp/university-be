import * as timeTableCreateRepository from '../repository/timeTablecreateRepository.js';
import { getSingleTimeTableById } from '../repository/timeTableRepository.js';
import { getTeacherDetailsByTeacherSubjectId } from '../repository/teacherSubjectMappingRepository.js';
import { getSingleFaculityLoadDetails, updateFaculityLoad,updateFaculityLoadByEmployeeId } from '../repository/faculityLoadRepository.js';
import sequelize from '../database/sequelizeConfig.js'; 
import { getHolidayStartEndDate } from '../repository/holidayRepository.js';

export async function addtimeTableCreate(data, createdBy, updatedBy) {    
    const transaction = await sequelize.transaction();

    try {
        data.createdBy = createdBy;
        data.updatedBy = updatedBy;

       const result =  await timeTableCreateRepository.addTimeTableCreate(data, transaction);

        await transaction.commit();
        return result
    } catch (error) {
        await transaction.rollback();
        throw error; 
    }
};

export async function gettimeTableCreateDetails(universityId){
    return await timeTableCreateRepository.getTimeTableCreateDetails(universityId)
};

export async function getSingletimeTableCreateDetails(courseId,universityId){
    return await timeTableCreateRepository.getSingleTimeTableCreateDetails(courseId,universityId)
};

export async function updateTimeTableCreate(TimeTableCreateId,info,updatedBy) {
    try {
        info.updatedBy = updatedBy;
        const data = await timeTableCreateRepository.updateTimeTableCreate(TimeTableCreateId, info);
        return data; 
    } catch (error) {
        console.error('Error updating faculity load:', error);
        throw new Error('Failed to update time table'); 
    }
};

export async function deleteTimeTableCreate(TimeTableCreateId){
    return await timeTableCreateRepository.deleteTimeTableCreate(TimeTableCreateId)
};


export async function deletetimeTableMapping(timeTableMappingId){
    return await timeTableCreateRepository.deletetimeTableMapping(timeTableMappingId)
};

export async function addtimeTableMapping(data, createdBy, updatedBy) {
    const transaction = await sequelize.transaction();
    let teacherSubjectData = null;

    try {
        const {
            timeTableNameId,
            timeTableCreateId,
            timeTableCreationId,
            employeeId,
            teacherSubjectMappingId,
            isSameTeacher,
            day,
            period
        } = data;


        // Fetch time table data
        const timeTableData = await getSingleTimeTableById(timeTableCreationId);
        if (!timeTableData || !timeTableData[0]) {
            throw new Error(`No timetable found for ID ${timeTableCreationId}`);
        }

        const periodLength = timeTableData[0]?.dataValues?.periodLength || 0;

        if (teacherSubjectMappingId) {
            teacherSubjectData = await getTeacherDetailsByTeacherSubjectId(teacherSubjectMappingId);
            if (!teacherSubjectData || !teacherSubjectData[0]) {
                throw new Error(`No teacher-subject mapping found for ID ${teacherSubjectMappingId}`);
            }
        }

        const employeeIdData = teacherSubjectData
            ? teacherSubjectData[0].dataValues?.employeeId
            : employeeId;

        if (!employeeIdData) {
            throw new Error(`Employee ID is missing or invalid.`);
        }


        // Fetch faculty load details
        const faculityLoad = await getSingleFaculityLoadDetails(employeeIdData);

        if (!faculityLoad || !faculityLoad[0]) {
            throw new Error(`No faculty load record found for employee ID ${employeeIdData}`);
        }

        const faculityCurrentLoad = faculityLoad[0].dataValues?.currentLoad || 0;

        const currentLoad = parseInt(faculityCurrentLoad) + periodLength || 0;

        // Update faculty load
        await updateFaculityLoadByEmployeeId(
            employeeIdData,
            { currentLoad },
            transaction
        );

        data.createdBy = createdBy;
        data.updatedBy = updatedBy;

        const result = await timeTableCreateRepository.addtimeTableMapping(data, transaction);

        await transaction.commit();
        return result;

    } catch (error) {
        await transaction.rollback();

        console.error(" Error in addtimeTableMapping:", error);

        throw new Error(`Failed to add timetable mapping: ${error.message}`);
    }
};

// export async function addtimeTableMapping(data, createdBy, updatedBy) {
//   const transaction = await sequelize.transaction();
//   let teacherSubjectData = null;

//   try {
//     const {
//       timeTableCreateId,
//       timeTableCreationId,
//       employeeId,
//       teacherSubjectMappingId,
//       day
//     } = data;

    
//     const periodInfo = await getPeriodInfoRepository(timeTableCreationId);

//     if (!periodInfo) {
//       throw new Error("Invalid timeTableCreationId");
//     }

//     const { startTime, endTime, periodLength } = periodInfo;

    
//     if (teacherSubjectMappingId) {
//       teacherSubjectData = await getTeacherDetailsByTeacherSubjectId(teacherSubjectMappingId);

//       if (!teacherSubjectData?.[0])
//         throw new Error("Invalid teacherSubjectMappingId");

//       data.employeeId = teacherSubjectData[0].employeeId;
//     }

//     const teacherId = data.employeeId;
//     if (!teacherId) throw new Error("employeeId is required");

//     const conflict = await checkTeacherConflictRepository(
//       teacherId,
//       day,
//       startTime,
//       endTime
//     );

//     if (conflict) {
//       throw new Error(
//         `Teacher Conflict: Teacher already has class on ${day} at ${startTime}-${endTime}`
//       );
//     }

    
//     const facultyLoad = await getSingleFaculityLoadDetails(teacherId);

//     const currentLoad =
//       (facultyLoad?.[0]?.currentLoad || 0) + (periodLength || 0);

//     await updateFaculityLoadByEmployeeId(
//       teacherId,
//       { currentLoad },
//       transaction
//     );

   
//     data.createdBy = createdBy;
//     data.updatedBy = updatedBy;

//     const result = await addMapRepo(data, transaction);

//     await transaction.commit();
//     return result;

//   } catch (error) {
//     await transaction.rollback();
//     console.error("Error in addtimeTableMapping:", error);
//     throw new Error(error.message);
//   }
// }


export async function updatetimeTableCreate(timeTableMappingId,timeTableType,updatedBy) {    
    try {
        const data = {timeTableType,updatedBy}
       const result =  await timeTableCreateRepository.updatetimeTableCreate(timeTableMappingId, data);
        return result
    } catch (error) {
        throw error; 
    }
};

export async function updateSimpleTeacherMapping(mappingArray, createdBy, updatedBy) {
  const transaction = await sequelize.transaction();

  try {
    if (!Array.isArray(mappingArray) || mappingArray.length === 0) {
      throw new Error("Request body must be a non-empty array");
    }

    // Base row = first entry (existing mapping)
    const base = mappingArray[0];

    if (!base.timeTableMappingId) {
      throw new Error("Base row must contain timeTableMappingId");
    }

    // Fetch base mapping row from DB & convert to plain object
    let baseRow = await timeTableCreateRepository.findMappingById(base.timeTableMappingId);
    if (!baseRow) {
      throw new Error(`Base mapping ${base.timeTableMappingId} not found`);
    }

    baseRow = baseRow.get({ plain: true });  // IMPORTANT FIX

    // Fetch timetable creation info (period length)
    const ttCreationData = await getSingleTimeTableById(baseRow.timeTableCreationId);
    if (!ttCreationData || !ttCreationData[0]) {
      throw new Error(`No timetable found for ID ${baseRow.timeTableCreationId}`);
    }

    const periodLength = ttCreationData[0].dataValues.periodLength || 0;

    // PROCESS EACH ITEM IN THE REQUEST ARRAY
    for (const item of mappingArray) {

      // CASE 1: UPDATE EXISTING MAPPING
      if (item.timeTableMappingId) {

        const dbRow = await timeTableCreateRepository.findMappingById(item.timeTableMappingId);
        if (!dbRow) {
          throw new Error(`Mapping ID ${item.timeTableMappingId} not found`);
        }

        const noChange =
          dbRow.isTeacher === item.isTeacher &&
          dbRow.isAttendence === item.isAttendence;

        if (!noChange) {
          await timeTableCreateRepository.updateMapping(
            item.timeTableMappingId,
            {
              isTeacher: item.isTeacher,
              isAttendence: item.isAttendence,
              updatedBy
            },
            transaction
          );
        }

      }

      // CASE 2: ADD NEW TEACHER
      else if (item.isNew === true) {

        if (!item.employeeId) {
          throw new Error("employeeId is required for new teacher entry");
        }

        //  FACULTY LOAD LOGIC — ADD PERIOD LENGTH
        const facLoad = await getSingleFaculityLoadDetails(item.employeeId);
        if (!facLoad || !facLoad[0]) {
          throw new Error(`Faculty load not found for employee ${item.employeeId}`);
        }

        const currentLoad = Number(facLoad[0].dataValues.currentLoad || 0);
        const newLoad = currentLoad + periodLength;

        await updateFaculityLoadByEmployeeId(
          item.employeeId,
          { currentLoad: newLoad },
          transaction
        );

        //  CREATE NEW ROW using base row values + new teacher values
        const newRow = {
          timeTableNameId: baseRow.timeTableNameId,
          timeTableCreateId: baseRow.timeTableCreateId,
          timeTableCreationId: baseRow.timeTableCreationId,

          // Copy subject & mapping info
          subjectId: baseRow.subjectId,
          electiveSubjectId: baseRow.electiveSubjectId,   // FIX APPLIED
          teacherSubjectMappingId: baseRow.teacherSubjectMappingId,

          // Class & timing fields
          classRoomSectionId: baseRow.classRoomSectionId,
          day: baseRow.day,
          period: baseRow.period,

          // Other flags
          isSameTeacher: baseRow.isSameTeacher,
          timeTableType: baseRow.timeTableType,

          // NEW TEACHER VALUES
          employeeId: item.employeeId,
          isTeacher: item.isTeacher,
          isAttendence: item.isAttendence,

          createdBy,
          updatedBy
        };

        await timeTableCreateRepository.addtimeTableMapping(newRow, transaction);
      }
    }

    await transaction.commit();
    return { success: true, message: "Teacher mapping updated successfully" };

  } catch (err) {
    await transaction.rollback();
    console.error("Error in updateSimpleTeacherMapping:", err);
    throw err;
  }
};

export async function getTimeTableMappingDetail(universityId, instituteId, role) {
  const rawResult = await timeTableCreateRepository.getTimeTableMappingDetail(universityId, instituteId, role);

  if (!Array.isArray(rawResult) || rawResult.length === 0) {
    return [];
  }

  // Helper: Parse "YYYY-MM-DD" to JS Date object
  function parseISODate(dateStr) {
    if (typeof dateStr !== 'string') return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    const [year, month, day] = parts.map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  }

  // Helper: Get array of all dates between two dates
  function getDatesBetween(startDate, endDate) {
    const dates = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  }

  // Helper: Get weekday name from date
  function getWeekdayName(date) {
    return date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  }

  const result = [];

  for (const rawItem of rawResult) {
    const item = rawItem.toJSON ? rawItem.toJSON() : rawItem;
    const timeTableCreate = item?.timeTablecreate;

    const classSectionsId = timeTableCreate?.classSectionsId;
    const startingDateStr = timeTableCreate?.startingDate;
    const endingDateStr = timeTableCreate?.endingDate;

    if (!classSectionsId || !startingDateStr || !endingDateStr) {
      item.totalClasses = 0;
      result.push(item);
      continue;
    }

    const startingDate = parseISODate(startingDateStr);
    const endingDate = parseISODate(endingDateStr);

    if (!startingDate || !endingDate || startingDate > endingDate) {
      item.totalClasses = 0;
      result.push(item);
      continue;
    }

    const allDates = getDatesBetween(startingDate, endingDate);

    // Week-off days from timetable
    const weekOffDaysSet = new Set();
    const timeTableNameList = timeTableCreate?.timeTableCreateName?.timeTableName || [];

    for (let i = 0; i < timeTableNameList.length; i++) {
      const entry = timeTableNameList[i];
      let weekOff = entry?.weekOff;

      if (!Array.isArray(weekOff)) {
        console.warn('Unexpected weekOff format:', weekOff);
        weekOff = [];
      }

      for (let j = 0; j < weekOff.length; j++) {
        const day = weekOff[j];
        if (typeof day === 'string') {
          weekOffDaysSet.add(day.toLowerCase());
        }
      }
    }

    const workingDays = allDates.filter(date => !weekOffDaysSet.has(getWeekdayName(date)));

    // Holidays
    let holidays = [];
    try {
      holidays = await getHolidayStartEndDate(startingDateStr, endingDateStr);
    } catch (e) {
      console.error('Failed to get holidays:', e);
      holidays = [];
    }

    const holidayDatesSet = new Set();
    if (Array.isArray(holidays)) {
      for (let i = 0; i < holidays.length; i++) {
        const h = holidays[i];
        let holidayDate = null;

        if (h?.date instanceof Date) {
          holidayDate = new Date(h.date.getFullYear(), h.date.getMonth(), h.date.getDate());
        } else if (typeof h?.date === 'string') {
          holidayDate = parseISODate(h.date);
        }

        if (holidayDate) {
          holidayDatesSet.add(holidayDate.getTime());
        }
      }
    }

    const finalClassDays = workingDays.filter(date => !holidayDatesSet.has(date.getTime()));
    item.totalClasses = finalClassDays.length;

    result.push(item);
  }

  return result;
};

export async function getSingletimeTableMappingDetail(courseId,universityId){
    return await timeTableCreateRepository.getSingleTimeTableCreateDetails(courseId,universityId)
};

//---------------night

export async function getTimeTableElective(courseId, classSectionsId, universityId, instituteId, role) {
  const allData = await timeTableCreateRepository.getTimeTableCellData(
    courseId,
    classSectionsId,
    universityId,
    instituteId,
    role
  );

  //  Separate normal and elective
  // const normal = allData.filter(
  //   item =>
  //     item.timeTableType === "normal" &&
  //     item.classSectionsId === Number(classSectionsId)
  // );

  const elective = allData.filter(
    item =>
      item.timeTableType === "elective" &&
      item.courseId === Number(courseId)
  );

  // const combined = [...normal, ...elective];
    const combined = [...elective];


  //  Format final output
  const formatted = combined.map(item => {
    const course = item.timeTableCourse || {};
    const classSection = item.timeTableClassSection || {};

    //  Build sectionRountine only for elective type
    const sectionRoutine = (item?.timeTablecreate || []).reduce((acc, curr) => {
      let dayObj = acc.find(d => d.day === curr.day);
      if (!dayObj) {
        dayObj = { day: curr.day, period: [] };
        acc.push(dayObj);
      }
      const sameTeacher = curr?.isSameTeacher;
      const subject = sameTeacher
        ? curr?.timeTableTeacherSubject?.employeeSubject?.subjects?.subjectName
        : curr?.timeTableSubject?.subjectName;

      const teacherName = sameTeacher
        ? curr?.timeTableTeacherSubject?.teacherEmployeeData?.employeeName
        : curr?.employeeDetails?.employeeName;

      const subjectCode = sameTeacher
        ? curr?.timeTableTeacherSubject?.employeeSubject?.subjects?.subjectCode
        : curr?.timeTableSubject?.subjectCode;

      const employeeCode = sameTeacher
        ? curr?.timeTableTeacherSubject?.teacherEmployeeData?.employeeCode
        : curr?.employeeDetails?.employeeCode;

      const subjectId = sameTeacher
        ? curr?.timeTableTeacherSubject?.employeeSubject?.subjects?.subjectId
        : curr?.timeTableSubject?.subjectId;

      const employeeId = sameTeacher
        ? curr?.timeTableTeacherSubject?.teacherEmployeeData?.employeeId
        : curr?.employeeDetails?.employeeId;

      const pickColor = sameTeacher
        ? curr?.timeTableTeacherSubject?.teacherEmployeeData?.pickColor
        : curr?.employeeDetails?.pickColor;

      //  Find or create the period within the day
      let existPeriod = dayObj.period.find(
        d => d.timeTableCreationId === curr?.timeTableCreationId
      );

      //  Common mapping data
      const mappingEntry = {
        timeTableMappingId: curr?.timeTableMappingId,
        employeeName: teacherName || "N/A",
        employeeCode: employeeCode || "",
        pickColor: pickColor || "",
        employeeId: employeeId || null,
        timeTableType:curr?.timeTableType,
        subject: curr?.timeTableElective
          ? {
            subjectId: curr?.timeTableElective?.electiveSubjectId,
            Name: curr?.timeTableElective?.electiveSubjectName,
            Code: curr?.timeTableElective?.electiveSubjectCode,
          }
          : {
            subjectId: subjectId,
            Name: subject,
            Code: subjectCode,
          },
      };

      //  Add new or merge existing period
      if (!existPeriod) {
        dayObj.period.push({
          timeTableCreationId: curr?.timeTableCreationId,
          periodName: curr?.timeTablecreation?.periodName,
          isBreak: curr?.timeTablecreation?.isBreak,
          periodLength: curr?.timeTablecreation?.periodLength,
          periodGap: curr?.timeTablecreation?.periodGap,
          startTime: curr?.timeTablecreation?.startTime,
          endTime: curr?.timeTablecreation?.endTime,
          mappingData: [mappingEntry],
        });
      } else {
        existPeriod.mappingData.push(mappingEntry);
      }

      return acc;
    }, []);


    return {
      courseName: course.courseName || "",
      courseCode: course.courseCode || "",
      courseId: item.courseId || "",
      section: classSection.section || "",
      class: classSection.class || "",
      timeTableType: item.timeTableType,
      classSectionsId: item.classSectionsId || null,
      startingDate: item.startingDate || null,
      endingDate: item.endingDate || null,
      sectionRoutine,
    };
  });

  return { formatted };
};

// --------------------- day
// export async function getTimeTableCellData(courseId, classSectionsId, universityId, instituteId, role) {
//   const allData = await timeTableCreateRepository.getTimeTableCellData(
//     courseId,
//     classSectionsId,
//     universityId,
//     instituteId,
//     role
//   );

//   // Separate normal and elective
//   const normal = allData.filter(
//     item =>
//       item.timeTableType === "normal" &&
//       item.classSectionsId === Number(classSectionsId)
//   );

//   const elective = allData.filter(
//     item =>
//       item.timeTableType === "elective" &&
//       item.courseId === Number(courseId)
//   );

//   const combined = [...normal, ...elective];

//   // Format final output
//   const formatted = combined.map(item => {
//     const course = item.timeTableCourse || {};
//     const classSection = item.timeTableClassSection || {};

//     // Build sectionRoutine only for elective type
//     const sectionRoutine = (item?.timeTablecreate || []).reduce((acc, curr) => {
//       const {
//         day,
//         isSameTeacher,
//         timeTableMappingId,
//         timeTableCreationId,
//         timeTableType,
//         timeTablecreation,
//         timeTableSubject,
//         employeeDetails,
//         timeTableTeacherSubject,
//         timeTableElective
//       } = curr || {};

//       // Find or create day object
//       let dayObj = acc.find(d => d.day === day);
//       if (!dayObj) {
//         dayObj = { day, period: [] };
//         acc.push(dayObj);
//       }

//       // Extract subject and teacher details
//       const sameTeacher = isSameTeacher;
//       const subjectData = sameTeacher
//         ? timeTableTeacherSubject?.employeeSubject?.subjects
//         : timeTableSubject;

//       const teacherData = sameTeacher
//         ? timeTableTeacherSubject?.teacherEmployeeData
//         : employeeDetails;

//       const mappingEntry = {
//         timeTableMappingId,
//         employeeName: teacherData?.employeeName || "N/A",
//         employeeCode: teacherData?.employeeCode || "",
//         pickColor: teacherData?.pickColor || "",
//         employeeId: teacherData?.employeeId || null,
//         timeTableType,
//         subject: timeTableElective
//           ? {
//               subjectId: timeTableElective?.electiveSubjectId,
//               Name: timeTableElective?.electiveSubjectName,
//               Code: timeTableElective?.electiveSubjectCode,
//             }
//           : {
//               subjectId: subjectData?.subjectId,
//               Name: subjectData?.subjectName,
//               Code: subjectData?.subjectCode,
//             },
//       };

//       // Find or create period within day
//       let existPeriod = dayObj.period.find(
//         p => p.timeTableCreationId === timeTableCreationId
//       );

//       if (!existPeriod) {
//         const {
//           periodName,
//           isBreak,
//           periodLength,
//           periodGap,
//           startTime,
//           endTime,
//         } = timeTablecreation || {};

//         dayObj.period.push({
//           timeTableCreationId,
//           periodName,
//           isBreak,
//           periodLength,
//           periodGap,
//           startTime,
//           endTime,
//           mappingData: [mappingEntry],
//         });
//       } else {
//         existPeriod.mappingData.push(mappingEntry);
//       }

//       return acc;
//     }, []);

//     return {
//       courseName: course.courseName || "",
//       courseCode: course.courseCode || "",
//       courseId: item.courseId || "",
//       section: classSection.section || "",
//       class: classSection.class || "",
//       timeTableType: item.timeTableType,
//       classSectionsId: item.classSectionsId || null,
//       startingDate: item.startingDate || null,
//       endingDate: item.endingDate || null,
//       sectionRoutine,
//     };
//   });

//   return { formatted };
// }

//----------&&----------

export async function getTimeTableCellData(courseId, classSectionsId, universityId, instituteId, role) {
  const allData = await timeTableCreateRepository.getTimeTableCellData(
    courseId,
    classSectionsId,
    universityId,
    instituteId,
    role
  );
  console.log(`>>>>>>>>>>>>>>>allData`,JSON.stringify(allData));
  

  // 1. Separate normal and elective to get base metadata
  const normalItemBase = allData.find(
    item =>
      item.timeTableType === "normal" &&
      item.classSectionsId === Number(classSectionsId)
  );
  const electiveItemBase = allData.find(
    item =>
      item.timeTableType === "elective" &&
      item.courseId === Number(courseId)
  );

  // 2. Flatten all period mappings from both normal and elective base items
  const allMappings = [];
  const itemsToProcess = [normalItemBase, electiveItemBase].filter(Boolean);

  for (const item of itemsToProcess) {
    const course = item.timeTableCourse || {};
    const classSection = item.timeTableClassSection || {};

    (item?.timeTablecreate || []).forEach(curr => {
      const {
        day,
        isSameTeacher,
        timeTableMappingId,
        timeTableCreationId,
        timeTableType, // This is the **raw mapping type** (e.g., 'normal', 'elective', 'Both')
        timeTablecreation,
        timeTableSubject,
        employeeDetails,
        timeTableTeacherSubject,
        timeTableElective
      } = curr || {};

      // Extract subject and teacher details (Logic from original function)
      const sameTeacher = isSameTeacher;
      const subjectData = sameTeacher
        ? timeTableTeacherSubject?.employeeSubject?.subjects
        : timeTableSubject;
      const teacherData = sameTeacher
        ? timeTableTeacherSubject?.teacherEmployeeData
        : employeeDetails;

      // Create the mapping entry
      const mappingEntry = {
        timeTableMappingId,
        employeeName: teacherData?.employeeName || "N/A",
        employeeCode: teacherData?.employeeCode || "",
        pickColor: teacherData?.pickColor || "",
        employeeId: teacherData?.employeeId || null,
        isTeacher: curr?.isTeacher || null,        
        isAttendence: curr?.isAttendence ?? null,
        timeTableType, // Use the raw mapping type for the final grouping key
        subject: timeTableElective
          ? {
              subjectId: timeTableElective?.electiveSubjectId,
              Name: timeTableElective?.electiveSubjectName,
              Code: timeTableElective?.electiveSubjectCode,
            }
          : {
              subjectId: subjectData?.subjectId,
              Name: subjectData?.subjectName,
              Code: subjectData?.subjectCode,
            },
      };

      // Store the flattened mapping along with its period and day metadata
      allMappings.push({
        day,
        timeTableCreationId,
        periodDetails: timeTablecreation || {},
        mappingEntry,
        // Store base course/section data for top-level aggregation
        baseMetadata: {
          course,
          classSection,
          courseId: item.courseId,
          classSectionsId: item.classSectionsId,
          startingDate: item.startingDate,
          endingDate: item.endingDate,
        }
      });
    });
  }

  // 3. Aggregate flattened mappings into final top-level time table structures (formatted)
  const finalAggregatedRoutines = allMappings.reduce((acc, currentMapping) => {
    const {
      day,
      timeTableCreationId,
      periodDetails,
      mappingEntry,
      baseMetadata
    } = currentMapping;
    
    // Key for top-level grouping is the internal mapping's timeTableType
    const finalType = mappingEntry.timeTableType;

    // Find or create the top-level time table object for this type ('normal', 'elective', or 'Both')
    let timeTableObj = acc.find(t => t.timeTableType === finalType);

    if (!timeTableObj) {
      // Create a new base object using the appropriate metadata
      const sourceItem = finalType === "normal" ? normalItemBase : electiveItemBase || baseMetadata;
      
      const course = sourceItem.timeTableCourse || baseMetadata.course || {};
      const classSection = sourceItem.timeTableClassSection || baseMetadata.classSection || {};
      
      timeTableObj = {
        courseName: course.courseName || "",
        courseCode: course.courseCode || "",
        courseId: sourceItem.courseId || baseMetadata.courseId || "",
        // Use normal section details for 'normal' and 'Both', and null/empty for 'elective'
        section: finalType !== "elective" ? classSection.section || "" : "",
        class: finalType !== "elective" ? classSection.class || "" : "",
        timeTableType: finalType, // Crucial: use the mapping's type here
        classSectionsId: finalType !== "elective" ? sourceItem.classSectionsId || baseMetadata.classSectionsId || null : null,
        startingDate: finalType !== "elective" ? sourceItem.startingDate || baseMetadata.startingDate || null : null,
        endingDate: finalType !== "elective" ? sourceItem.endingDate || baseMetadata.endingDate || null : null,
        sectionRoutine: [],
      };
      acc.push(timeTableObj);
    }

    // 4. Group by Day and Period within the chosen timeTableObj
    let dayObj = timeTableObj.sectionRoutine.find(d => d.day === day);
    if (!dayObj) {
      dayObj = { day, period: [] };
      timeTableObj.sectionRoutine.push(dayObj);
    }

    let existPeriod = dayObj.period.find(
      p => p.timeTableCreationId === timeTableCreationId
    );

    if (!existPeriod) {
      dayObj.period.push({
        timeTableCreationId,
        periodName: periodDetails.periodName,
        isBreak: periodDetails.isBreak,
        periodLength: periodDetails.periodLength,
        periodGap: periodDetails.periodGap,
        startTime: periodDetails.startTime,
        endTime: periodDetails.endTime,
        mappingData: [mappingEntry],
      });
    } else {
      existPeriod.mappingData.push(mappingEntry);
    }

    return acc;
  }, []);

  return { formatted: finalAggregatedRoutines };
};

export async function publishTimeTableService(timeTableCreateId) {
  try {
    const result = await timeTableCreateRepository.publishTimeTableRepository(timeTableCreateId);

    if (result[0] === 0) {
      throw new Error("Time table create ID not found");
    }

    return { message: "Time table published successfully" };

  } catch (error) {
    console.error("Error in publishTimeTableService:", error);
    throw error;
  }
};

export async function getSubjectWithCount(classSectionsId) {
  const [subjectsData, timeTableData] = await Promise.all([
    timeTableCreateRepository.ClassSubjectCount(classSectionsId),
    timeTableCreateRepository.timeTableData(classSectionsId)
  ]);

  const subjectsList = subjectsData?.semesterDetail?.semestermapping?.map(s => ({
    id: s.subjectId,
    name: s.subjects?.subjectName,
  })) || [];

  const timeTable = timeTableData?.timeTablecreate || [];

  // Count map
  const countMap = {};

  // Initialize with 0
  subjectsList.forEach(s => {
    countMap[s.id] = 0;
  });

  // Count actual occurrences
  timeTable.forEach(t => {
    const subjectId =
      t.timeTableSubject?.subjectId ||
      t.timeTableTeacherSubject?.employeeSubject?.subjectId ||
      null;

    if (subjectId && countMap[subjectId] !== undefined) {
      countMap[subjectId]++;
    }
  });

  // Final formatted response
  const result = subjectsList.map(s => ({
    subjectId: s.id,
    subject: s.name,
    count: countMap[s.id] || 0
  }));

  return result;
}