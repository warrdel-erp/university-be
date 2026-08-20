import moment from "moment";
import sequelize from "../database/sequelizeConfig.js";
import * as scheduleCreationRepository from "../repository/scheduleRepository.js";

export async function addSchedule(scheduleData, createdBy, updatedBy) {

  try {
    const data = {
      ...scheduleData,
      createdBy,
      updatedBy
    };
    const schedule = await scheduleCreationRepository.addSchedule(data);
    return schedule;
  } catch (error) {
    throw new Error(error.message);
  }

};

export async function getScheduleDetails() {
  return await scheduleCreationRepository.getScheduleDetails();
};

export async function getSingleScheduleDetails(scheduleId) {
  return await scheduleCreationRepository.getSingleScheduleDetails(scheduleId);
};

export async function deleteSchedule(scheduleId) {
  return await scheduleCreationRepository.deleteSchedule(scheduleId);
};

export async function updateSchedule(scheduleId, ScheduleData, updatedBy) {
  ScheduleData.updatedBy = updatedBy;
  await scheduleCreationRepository.updateSchedule(scheduleId, ScheduleData);
};

/**
 * Assigns a teacher to an exam schedule after validating that the teacher is not already assigned.
 * @param {number} scheduleId - The ID of the exam schedule.
 * @param {number} userId - The ID of the teacher/employee.
 * @param {number} createdBy - User ID of the creator.
 * @param {number} updatedBy - User ID of the updater.
 * @throws {Error} - If the teacher is already assigned to the schedule.
 */
export async function assignTeacher(scheduleId, userId, createdBy, updatedBy) {
  const schedule = await scheduleCreationRepository.getScheduleInScope(scheduleId);
  if (!schedule) {
    throw new Error("Schedule not found for this university and institute");
  }

  const existingAssignment = await scheduleCreationRepository.getAssignmentByScheduleAndEmployee(scheduleId, userId);
  if (existingAssignment) {
    throw new Error("This teacher is already assigned to this exam schedule");
  }
  
  const data = { scheduleId, userId, createdBy, updatedBy }
  return await scheduleCreationRepository.assignTeacher(data);
};

export async function getAssignTeacher() {
  return await scheduleCreationRepository.getAssignTeacher();
};

export async function attendence(data, createdBy, updatedBy) {
  try {
    data.createdBy = createdBy;
    data.updatedBy = updatedBy;

    data.date = moment().format("YYYY-MM-DD");

    if (data.checkIn) {
      data.checkIn = moment(data.checkIn, "HH:mm:ss").format("HH:mm:ss");
    }
    if (data.checkOut) {
      data.checkOut = moment(data.checkOut, "HH:mm:ss").format("HH:mm:ss");
    }

    const attendance = await scheduleCreationRepository.attendence(data);
    return attendance;
  } catch (error) {
    throw new Error(error.message);
  }
};

export async function updateAttendence(teacherAttendenceId, data, updatedBy) {
  data.updatedBy = updatedBy;
  await scheduleCreationRepository.updateAttendence(teacherAttendenceId, data);
};

export async function getAllAttendence(page, limit, fromDate, toDate, search) {
  return await scheduleCreationRepository.getAllAttendence(page, limit, fromDate, toDate, search);
};