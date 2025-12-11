import * as jobService from "../services/jobService.js";

// ADD JOB
export async function addJob(req, res) {
  try {
    const required = ["jobTitle", "employeeId", "jobDate", "startTime", "endTime"];
    for (const f of required) {
      if (!req.body[f]) {
        return res.status(400).json({ success: false, message: `${f} is required` });
      }
    }

    const data = {
      universityId: req.user.universityId,
      instituteId: req.user.instituteId,
      createdBy: req.user.userId,
      updatedBy: req.user.userId,
      ...req.body
    };

    const result = await jobService.addJob(data);
    return res.status(201).json({
      success: true,
      message: "Job created successfully",
      data: result
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// GET ALL JOBS
export async function getAllJobs(req, res) {
  try {
    const data = await jobService.getAllJobs(
      req.user.universityId,
      req.user.instituteId,
      req.user.role
    );

    return res.status(200).json({ success: true, data });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// GET SINGLE JOB
export async function getSingleJob(req, res) {
  try {
    const jobId = req.params.id;
    const data = await jobService.getSingleJob(jobId);

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// UPDATE JOB
export async function updateJob(req, res) {
  try {
    const jobId = req.params.id;

    const result = await jobService.updateJob(jobId, req.body);

    return res.status(200).json({
      success: true,
      message: "Job updated successfully",
      data: result
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// DELETE JOB
export async function deleteJob(req, res) {
  try {
    const jobId = req.params.id;

    await jobService.deleteJob(jobId);

    return res.status(200).json({
      success: true,
      message: "Job deleted successfully"
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// CALENDAR VIEW
export async function getCalendarView(req, res) {
  try {
    const { view = "daily", date } = req.query;
    const result = await jobService.getCalendarView({
      view,
      date,
      universityId: req.user.universityId,
      instituteId: req.user.instituteId,
      role: req.user.role
    });

    return res.status(200).json({ success: true, data: result });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// FACULTY CALENDAR
export async function getFacultyCalendar(req, res) {
  try {
    const { employeeId } = req.params;
    const { start, end } = req.query;

    const result = await jobService.getFacultyCalendar({ employeeId, start, end });

    return res.status(200).json({ success: true, data: result });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// DEPARTMENT CALENDAR
export async function getDepartmentCalendar(req, res) {
  try {
    const { departmentId } = req.params;
    const { start, end } = req.query;

    const result = await jobService.getDepartmentCalendar({ departmentId, start, end });

    return res.status(200).json({ success: true, data: result });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getFilteredJobs(req, res) {
  try {
    const {
      type = "upcoming", // upcoming | previous | master
      jobTypeId,
      departmentId,
      employeeId,
      date,
      status,
      page = 1,
      limit = 10,
    } = req.query;

    const filters = {
      type,
      jobTypeId,
      departmentId,
      employeeId,
      date,
      status,
      page,
      limit,
      universityId: req.user.universityId,
      instituteId: req.user.instituteId,
      role: req.user.role
    };

    const result = await jobService.getFilteredJobs(filters);

    return res.status(200).json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error("Error in getFilteredJobs:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}