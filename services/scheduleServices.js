import sequelize from "../database/sequelizeConfig.js";
import * as scheduleCreationRepository  from "../repository/scheduleRepository.js";

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

export async function getScheduleDetails(universityId,acedmicYearId,instituteId,role) {
    return await scheduleCreationRepository.getScheduleDetails(universityId,acedmicYearId,instituteId,role);
};

export async function getSingleScheduleDetails(scheduleId,universityId) {
    return await scheduleCreationRepository.getSingleScheduleDetails(scheduleId,universityId);
};

export async function deleteSchedule(scheduleId) {
    return await scheduleCreationRepository.deleteSchedule(scheduleId);
};

export async function updateSchedule(scheduleId, ScheduleData, updatedBy) {    
    ScheduleData.updatedBy = updatedBy;
    await scheduleCreationRepository.updateSchedule(scheduleId, ScheduleData);
};

export async function assignTeacher(scheduleId,employeeId,createdBy,updatedBy) {
  const data ={scheduleId,employeeId,createdBy,updatedBy}
    return await scheduleCreationRepository.assignTeacher(data);
};

export async function getAssignTeacher() {
    return await scheduleCreationRepository.getAssignTeacher();
};