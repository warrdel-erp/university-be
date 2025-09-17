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

export async function getScheduleDetails(universityId, acedmicYearId, instituteId, role) {
  return await scheduleCreationRepository.getScheduleDetails(universityId, acedmicYearId, instituteId, role);
};

export async function getSingleScheduleDetails(scheduleId, universityId) {
  return await scheduleCreationRepository.getSingleScheduleDetails(scheduleId, universityId);
};

export async function deleteSchedule(scheduleId) {
  return await scheduleCreationRepository.deleteSchedule(scheduleId);
};

export async function updateSchedule(scheduleId, ScheduleData, updatedBy) {
  ScheduleData.updatedBy = updatedBy;
  await scheduleCreationRepository.updateSchedule(scheduleId, ScheduleData);
};

export async function assignTeacher(scheduleId, employeeId, createdBy, updatedBy) {
  const data = { scheduleId, employeeId, createdBy, updatedBy }
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