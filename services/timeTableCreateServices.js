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

        console.log(`>>>>>>> timeTableCreationId: ${timeTableCreationId}`);

        // Fetch time table data
        const timeTableData = await getSingleTimeTableById(timeTableCreationId);
        if (!timeTableData || !timeTableData[0]) {
            throw new Error(`No timetable found for ID ${timeTableCreationId}`);
        }

        const periodLength = timeTableData[0]?.dataValues?.periodLength || 0;
        console.log(`>>>>>> periodLength: ${periodLength}`);

        if (teacherSubjectMappingId) {
            teacherSubjectData = await getTeacherDetailsByTeacherSubjectId(teacherSubjectMappingId);
            if (!teacherSubjectData || !teacherSubjectData[0]) {
                throw new Error(`No teacher-subject mapping found for ID ${teacherSubjectMappingId}`);
            }
            console.log(`>>>>>>>>>>> teacherSubjectData:`, teacherSubjectData);
        }

        const employeeIdData = teacherSubjectData
            ? teacherSubjectData[0].dataValues?.employeeId
            : employeeId;

        if (!employeeIdData) {
            throw new Error(`Employee ID is missing or invalid.`);
        }

        console.log(`>>>>>> employeeIdData: ${employeeIdData}`);

        // Fetch faculty load details
        const faculityLoad = await getSingleFaculityLoadDetails(employeeIdData);
        console.log(`>>>>>> faculityLoad:`, faculityLoad);

        if (!faculityLoad || !faculityLoad[0]) {
            throw new Error(`No faculty load record found for employee ID ${employeeIdData}`);
        }

        const faculityCurrentLoad = faculityLoad[0].dataValues?.currentLoad || 0;
        console.log(`>>>>>> faculityCurrentLoad: ${faculityCurrentLoad}`);

        const currentLoad = parseInt(faculityCurrentLoad) + periodLength || 0;
        console.log(`>>>>>> currentLoad: ${currentLoad}`);

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

// export async function getTimeTableCellData(courseId, classSectionsId, universityId, instituteId, role) {
//   try {
//     const data = await timeTableCreateRepository.getTimeTableCellData(
//       courseId,
//       classSectionsId,
//       universityId,
//       instituteId,
//       role
//     );
//     return data

//     //  Filter for matching timetables
//     const filtered = data.filter(item => {
//       if (item.timeTableType === "normal") {
//         return (
//           item.courseId === courseId &&
//           item.classSectionsId === classSectionsId
//         );
//       } else if (item.timeTableType === "elective") {
//         return item.courseId === courseId;
//       }
//     });

//     //  Transform data into your required format
//     const result = filtered.map(item => {
//       const course = item.timeTableCourse || {};
//       const classSec = item.timeTableClassSection || {};
//       const timeTablecreate = item.timeTablecreate || [];

//       //  Group by day -> then by period
//       const dayMap = {};

//       timeTablecreate.forEach(entry => {
//         const day = entry.day || "Unknown";
//         if (!dayMap[day]) dayMap[day] = {};

//         const periodName = entry.timeTablecreation?.periodName || "Unknown Period";

//         if (!dayMap[day][periodName]) {
//           dayMap[day][periodName] = {
//             timeTableCreationId: entry.timeTablecreation?.timeTableCreationId || null,
//             periodName,
//             startTime: entry.timeTablecreation?.startTime || null,
//             endTime: entry.timeTablecreation?.endTime || null,
//             periodLength: entry.timeTablecreation?.periodLength || null,
//             mappingData: []
//           };
//         }

//         //  Push mapping data (teacher + subject)
//         dayMap[day][periodName].mappingData.push({
//           employeeName: entry.employeeDetails?.employeeName || null,
//           employeeCode: entry.employeeDetails?.employeeCode || null,
//           pickColor: entry.employeeDetails?.pickColor || null,
//           employeeId: entry.employeeId,
//           subject: entry.timeTableSubject
//             ? {
//                 subjectId: entry.timeTableSubject.subjectId,
//                 Name: entry.timeTableSubject.subjectName,
//                 Code: entry.timeTableSubject.subjectCode
//               }
//             : entry.timeTableElective
//             ? {
//                 subjectId: entry.timeTableElective.electiveSubjectId,
//                 Name: entry.timeTableElective.electiveSubjectName,
//                 Code: entry.timeTableElective.electiveSubjectCode
//               }
//             : null
//         });
//       });

//       //  Convert grouped map into array
//       const sectionRountine = Object.entries(dayMap).map(([day, periods]) => ({
//         day,
//         period: Object.values(periods)
//       }));

//       return {
//         courseName: course.courseName,
//         courseCode: course.courseCode,
//         courseId: course.courseId,
//         section: classSec.section || null,
//         class: classSec.class || null,
//         timeTableType: item.timeTableType,
//         classSectionsId: item.classSectionsId || null,
//         startingDate: item.startingDate,
//         endingDate: item.endingDate,
//         sectionRountine
//       };
//     });

//     return result;
//   } catch (error) {
//     console.error("Error in getTimeTableCellData:", error);
//     throw error;
//   }
// };

export async function getTimeTableCellData(courseId, classSectionsId, universityId, instituteId, role) {
  const allData = await timeTableCreateRepository.getTimeTableCellData(
    courseId,
    classSectionsId,
    universityId,
    instituteId,
    role
  );

  //  Separate normal and elective
  const normal = allData.filter(
    item =>
      item.timeTableType === "normal" &&
      item.classSectionsId === Number(classSectionsId)
  );

  const elective = allData.filter(
    item =>
      item.timeTableType === "elective" &&
      item.courseId === Number(courseId)
  );

  const combined = [...normal, ...elective];

  //  Format final output
  const formatted = combined.map(item => {
    const course = item.timeTableCourse || {};
    const classSection = item.timeTableClassSection || {};

    //  Build sectionRountine only for elective type
    const sectionRountine = (item.timeTablecreate || []).reduce((acc, curr) => {
      let dayObj = acc.find(d => d.day === curr.day);
      if (!dayObj) {
        dayObj = { timeTableMappingId: curr.timeTableMappingId, day: curr.day, period: [] };
        acc.push(dayObj);
      }

      dayObj.period.push({
        timeTableCreationId: curr.timeTableCreationId,
        periodName: curr.timeTablecreation?.periodName,
        startTime: curr.timeTablecreation?.startTime,
        endTime: curr.timeTablecreation?.endTime,
        periodLength: curr.timeTablecreation?.periodLength,
        mappingData: [
          {
            employeeName: curr.employeeDetails?.employeeName,
            employeeCode: curr.employeeDetails?.employeeCode,
            pickColor: curr.employeeDetails?.pickColor,
            employeeId: curr.employeeDetails?.employeeId,
            subject: curr.timeTableSubject
              ? {
                  subjectId: curr.timeTableSubject.subjectId,
                  Name: curr.timeTableSubject.subjectName,
                  Code: curr.timeTableSubject.subjectCode,
                }
              : curr.timeTableElective
              ? {
                  subjectId: curr.timeTableElective.electiveSubjectId,
                  Name: curr.timeTableElective.electiveSubjectName,
                  Code: curr.timeTableElective.electiveSubjectCode,
                }
              : null,
          },
        ],
      });

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
      sectionRountine,
    };
  });

  return {formatted,allData};
};