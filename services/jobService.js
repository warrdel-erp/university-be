import * as jobRepository from "../repository/jobRepository.js";
import { Op } from "sequelize";

function to24(timeStr) {
  const d = new Date(`1970-01-01 ${timeStr}`);
  return d.toTimeString().split(" ")[0]; // HH:MM:SS
}

// CHECK CONFLICTS
async function checkConflict({ jobDate, startTime, endTime, employeeId, location, excludeId }) {
  const s = to24(startTime);
  const e = to24(endTime);

  const empConflict = await jobRepository.findEmployeeConflict({
    jobDate, s, e, employeeId, excludeId
  });

  if (empConflict)
    throw new Error(`Employee conflict with job ${empConflict.jobTitle}`);

  if (location) {
    const locConflict = await jobRepository.findLocationConflict({
      jobDate, s, e, location, excludeId
    });

    if (locConflict)
      throw new Error(`Location conflict with job ${locConflict.jobTitle}`);
  }
}

// ADD JOB
export async function addJob(data) {
  await checkConflict({
    jobDate: data.jobDate,
    startTime: data.startTime,
    endTime: data.endTime,
    employeeId: data.employeeId,
    location: data.location
  });

  return await jobRepository.addJob(data);
}

// UPDATE JOB
export async function updateJob(jobId, data) {
  const old = await jobRepository.getSingleJob(jobId);

  const jobDate = data.jobDate || old.jobDate;
  const start = data.startTime || old.startTime;
  const end = data.endTime || old.endTime;
  const emp = data.employeeId || old.employeeId;
  const loc = data.location || old.location;

  await checkConflict({
    jobDate,
    startTime: start,
    endTime: end,
    employeeId: emp,
    location: loc,
    excludeId: jobId
  });

  return await jobRepository.updateJob(jobId, data);
}

// GET ALL JOBS
export async function getAllJobs(universityId, instituteId, role) {
  return await jobRepository.getAllJobs(universityId, instituteId, role);
}

// GET SINGLE JOB
export async function getSingleJob(id) {
  return await jobRepository.getSingleJob(id);
}

// DELETE JOB
export async function deleteJob(id) {
  return await jobRepository.deleteJob(id);
}

// CALENDAR (daily / weekly / monthly)
export async function getCalendarView({ view, date, universityId, instituteId, role }) {
  return await jobRepository.getCalendarJobs(view, date, universityId, instituteId, role);
}

// FACULTY CALENDAR
export async function getFacultyCalendar({ employeeId, start, end }) {
  return await jobRepository.getFacultyCalendar(employeeId, start, end);
}

// DEPARTMENT CALENDAR
export async function getDepartmentCalendar({ departmentId, start, end }) {
  return await jobRepository.getDepartmentCalendar(departmentId, start, end);
}

export async function getFilteredJobs(filters) {
  try {
    return await jobRepository.getFilteredJobs(filters);
  } catch (error) {
    throw new Error(error.message);
  }
}