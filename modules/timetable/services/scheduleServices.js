import moment from "moment";
import sequelize from "../../../database/sequelizeConfig.js";
import * as scheduleCreationRepository from "../repository/scheduleRepository.js";
import { withAuditEvent } from "../../../utility/audit/withAuditEvent.js";
import { AUDIT_EVENTS } from "../../../const/auditEvents.js";

export async function addSchedule(scheduleData, createdBy, updatedBy) {
  const data = {
    ...scheduleData,
    createdBy,
    updatedBy
  };
  return await withAuditEvent(AUDIT_EVENTS.SCHEDULE_CREATE, async ({ transaction }) => {
    return await scheduleCreationRepository.addSchedule(data, { transaction });
  });
};

export async function getScheduleDetails() {
  return await scheduleCreationRepository.getScheduleDetails();
};

export async function getSingleScheduleDetails(scheduleId) {
  return await scheduleCreationRepository.getSingleScheduleDetails(scheduleId);
};

export async function deleteSchedule(scheduleId) {
  return await withAuditEvent(AUDIT_EVENTS.SCHEDULE_DELETE, async ({ transaction }) => {
    return await scheduleCreationRepository.deleteSchedule(scheduleId, { transaction });
  });
};

export async function updateSchedule(scheduleId, ScheduleData, updatedBy) {
  ScheduleData.updatedBy = updatedBy;
  return await withAuditEvent(AUDIT_EVENTS.SCHEDULE_UPDATE, async ({ transaction }) => {
    return await scheduleCreationRepository.updateSchedule(scheduleId, ScheduleData, { transaction });
  });
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
  
  const data = { scheduleId, userId, createdBy, updatedBy };
  return await withAuditEvent(AUDIT_EVENTS.SCHEDULE_TEACHER_ASSIGN, async ({ transaction }) => {
    return await scheduleCreationRepository.assignTeacher(data, { transaction });
  });
};

export async function getAssignTeacher() {
  return await scheduleCreationRepository.getAssignTeacher();
};

export async function attendence(data, createdBy, updatedBy) {
  data.createdBy = createdBy;
  data.updatedBy = updatedBy;

  data.date = moment().format("YYYY-MM-DD");

  if (data.checkIn) {
    data.checkIn = moment(data.checkIn, "HH:mm:ss").format("HH:mm:ss");
  }
  if (data.checkOut) {
    data.checkOut = moment(data.checkOut, "HH:mm:ss").format("HH:mm:ss");
  }

  return await withAuditEvent(AUDIT_EVENTS.SCHEDULE_ATTENDANCE_MARK, async ({ transaction }) => {
    return await scheduleCreationRepository.attendence(data, { transaction });
  });
};

export async function updateAttendence(teacherAttendenceId, data, updatedBy) {
  data.updatedBy = updatedBy;
  return await withAuditEvent(AUDIT_EVENTS.SCHEDULE_ATTENDANCE_UPDATE, async ({ transaction }) => {
    return await scheduleCreationRepository.updateAttendence(teacherAttendenceId, data, { transaction });
  });
};

export async function getAllAttendence(page, limit, fromDate, toDate) {
  return await scheduleCreationRepository.getAllAttendence(page, limit, fromDate, toDate);
};