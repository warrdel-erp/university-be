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