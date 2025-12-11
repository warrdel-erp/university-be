import * as jobRepository from "../repository/jobRepository.js";
import { Op } from "sequelize";

function to24(timeStr) {
  try {
    if (!timeStr) throw new Error("Invalid time string");

    const d = new Date(`1970-01-01 ${timeStr}`);

    if (isNaN(d.getTime())) {
      throw new Error("Invalid time format");
    }

    return d.toTimeString().split(" ")[0]; 
  } catch (error) {
    console.error("Error in to24:", error.message);
    return null; 
  }
}

// CHECK CONFLICTS
async function checkConflict({ jobDate, startTime, endTime, employeeId, location, excludeId }) {
  try {
    const s = to24(startTime);
    const e = to24(endTime);

    if (!s || !e) {
      throw new Error("Invalid startTime or endTime format");
    }

    // Check employee conflict
    const empConflict = await jobRepository.findEmployeeConflict({
      jobDate,
      s,
      e,
      employeeId,
      excludeId
    });

    if (empConflict) {
      throw new Error(`Employee conflict with job: ${empConflict.jobTitle}`);
    }

    // Check location conflict
    if (location) {
      const locConflict = await jobRepository.findLocationConflict({
        jobDate,
        s,
        e,
        location,
        excludeId
      });

      if (locConflict) {
        throw new Error(`Location conflict with job: ${locConflict.jobTitle}`);
      }
    }

    return true; 
  } catch (error) {
    console.error("Error in checkConflict:", error.message);
    throw error; 
  }
}


// ADD JOB
export async function addJob(data) {
  try {
    await checkConflict({
      jobDate: data.jobDate,
      startTime: data.startTime,
      endTime: data.endTime,
      employeeId: data.employeeId,
      location: data.location
    });

    const job = await jobRepository.addJob(data);
    return job;
  } catch (error) {
    console.error("Error in addJob:", error.message);
    throw new Error(error.message || "Unable to add job");
  }
}


// UPDATE JOB
export async function updateJob(jobId, data) {
  try {
    const old = await jobRepository.getSingleJob(jobId);
    if (!old) throw new Error("Job not found");

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

    const updatedJob = await jobRepository.updateJob(jobId, data);
    return updatedJob;

  } catch (error) {
    console.error("Error in updateJob:", error.message);
    throw new Error(error.message || "Unable to update job");
  }
};

// GET ALL JOBS
export async function getAllJobs(universityId, instituteId, role) {
  try {
    return await jobRepository.getAllJobs(universityId, instituteId, role);
  } catch (error) {
    console.error("Error in getAllJobs:", error.message);
    throw new Error("Unable to fetch jobs");
  }
}

// GET SINGLE JOB
export async function getSingleJob(id) {
  try {
    return await jobRepository.getSingleJob(id);
  } catch (error) {
    console.error("Error in getSingleJob:", error.message);
    throw new Error("Unable to fetch job");
  }
}

// DELETE JOB
export async function deleteJob(id) {
  try {
    return await jobRepository.deleteJob(id);
  } catch (error) {
    console.error("Error in deleteJob:", error.message);
    throw new Error("Unable to delete job");
  }
}

// CALENDAR (daily / weekly / monthly)
export async function getCalendarView({ view, date, universityId, instituteId, role }) {
  try {
    return await jobRepository.getCalendarJobs(view, date, universityId, instituteId, role);
  } catch (error) {
    console.error("Error in getCalendarView:", error.message);
    throw new Error("Unable to fetch calendar jobs");
  }
}

// FACULTY CALENDAR
export async function getFacultyCalendar({ employeeId, start, end }) {
  try {
    return await jobRepository.getFacultyCalendar(employeeId, start, end);
  } catch (error) {
    console.error("Error in getFacultyCalendar:", error.message);
    throw new Error("Unable to fetch faculty calendar");
  }
}

// DEPARTMENT CALENDAR
export async function getDepartmentCalendar({ subAccountId, start, end }) {
  try {
    return await jobRepository.getDepartmentCalendar(subAccountId, start, end);
  } catch (error) {
    console.error("Error in getDepartmentCalendar:", error.message);
    throw new Error("Unable to fetch department calendar");
  }
}

export async function getFilteredJobs(filters) {
  try {
    return await jobRepository.getFilteredJobs(filters);
  } catch (error) {
    throw new Error(error.message);
  }
}