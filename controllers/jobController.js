import * as jobService from "../services/jobService.js";
import { SuccessResponse } from "../utility/response.js";

export async function addJob(req, res) {
  try {
    const required = ["jobTitle", "userId", "jobDate", "startTime", "endTime"];
    for (const f of required) {
      if (!req.body[f]) {
        return res.status(400).json({ success: false, message: `${f} is required` });
      }
    }

    const data = {
      createdBy: req.user.userId,
      updatedBy: req.user.userId,
      ...req.body,
    };

    const result = await jobService.addJob(data);
    return res.status(201).json({
      success: true,
      message: "Job created successfully",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getAllJobs(req, res) {
  try {
    const data = await jobService.getAllJobs();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getSingleJob(req, res) {
  try {
    const jobId = req.params.id;
    const data = await jobService.getSingleJob(jobId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateJob(req, res) {
  try {
    const jobId = req.params.id;
    const result = await jobService.updateJob(jobId, req.body);
    return res.status(200).json({
      success: true,
      message: "Job updated successfully",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteJob(req, res) {
  try {
    const jobId = req.params.id;
    await jobService.deleteJob(jobId);
    return res.status(200).json({
      success: true,
      message: "Job deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getCalendarView(req, res) {
  try {
    const { view = "daily", date } = req.query;
    const result = await jobService.getCalendarView({ view, date });
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getFacultyCalendar(req, res) {
  try {
    const { userId } = req.params;
    const { start, end } = req.query;
    const result = await jobService.getFacultyCalendar({ userId, start, end });
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

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
      type = "upcoming",
      jobTypeId,
      departmentId,
      subAccountId,
      userId,
      date,
      status,
      page = 1,
      limit = 10,
    } = req.query;

    const filters = {
      type,
      jobTypeId,
      departmentId: departmentId ?? subAccountId,
      userId,
      date,
      status,
      page,
      limit,
    };

    const result = await jobService.getFilteredJobs(filters);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error in getFilteredJobs:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getScheduleList(req, res) {
  try {
    const result = await jobService.getScheduleData({ ...req.query });
    return SuccessResponse(
      res,
      200,
      "Schedule list fetched successfully",
      result.data,
      {
        total: result.total,
        limit: result.limit,
        page: result.page,
      }
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}
