import * as model from "../models/index.js";
import { Op, Sequelize } from "sequelize";
import { scoped } from "../utility/scoped.js";

export async function addJob(data) {
  try {
    return scoped(model.jobModel).create(data);
  } catch (error) {
    console.error("Error in addJob:", error);
    throw new Error("Unable to create job");
  }
}

export async function getAllJobs() {
  try {
    return scoped(model.jobModel).findAll({
      where: { deletedAt: null },
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
      include: [
        {
          model: model.jobSettingModel.unscoped(),
          as: "jobType",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
        },
        {
          model: model.employeeModel.unscoped(),
          as: "facultyJobs",
          attributes: ["employeeCode", "department", "employmentType", "employeeName", "pickColor"],
        },
        {
          model: model.subAccountModel.unscoped(),
          as: "departmentJobs",
          attributes: ["departmentName", "subAccountId", "alternateName", "departmentCode"],
        },
        {
          model: model.subjectModel.unscoped(),
          as: "subjectJobs",
          attributes: ["subjectName", "subjectCode", "subjectId"],
        },
        {
          model: model.courseModel.unscoped(),
          as: "courseJobs",
          attributes: ["courseId", "courseName", "courseCode"],
        },
      ],
    });
  } catch (error) {
    console.error("Error in getAllJobs:", error);
    throw new Error("Unable to fetch job list");
  }
}

export async function getSingleJob(jobId) {
  try {
    return scoped(model.jobModel).findOne({
      where: { jobId, deletedAt: null },
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
      include: [
        {
          model: model.jobSettingModel.unscoped(),
          as: "jobType",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
        },
        {
          model: model.employeeModel.unscoped(),
          as: "facultyJobs",
          attributes: ["employeeCode", "department", "employmentType", "employeeName", "pickColor"],
        },
        {
          model: model.subAccountModel.unscoped(),
          as: "departmentJobs",
          attributes: ["departmentName", "subAccountId", "alternateName", "departmentCode"],
        },
        {
          model: model.subjectModel.unscoped(),
          as: "subjectJobs",
          attributes: ["subjectName", "subjectCode", "subjectId"],
        },
        {
          model: model.courseModel.unscoped(),
          as: "courseJobs",
          attributes: ["courseId", "courseName", "courseCode"],
        },
      ],
    });
  } catch (error) {
    console.error("Error in getSingleJob:", error);
    throw new Error("Unable to fetch job details");
  }
}

export async function updateJob(jobId, data) {
  try {
    const existing = await scoped(model.jobModel).findOne({
      attributes: ["jobId"],
      where: { jobId, deletedAt: null },
    });
    if (!existing) {
      throw new Error("Job not found");
    }

    await scoped(model.jobModel).update(data, { where: { jobId } });
    return getSingleJob(jobId);
  } catch (error) {
    console.error("Error in updateJob:", error);
    throw new Error("Unable to update job");
  }
}

export async function deleteJob(jobId) {
  try {
    const existing = await scoped(model.jobModel).findOne({
      attributes: ["jobId"],
      where: { jobId },
    });
    if (!existing) {
      return 0;
    }

    return scoped(model.jobModel).destroy({ where: { jobId } });
  } catch (error) {
    console.error("Error in deleteJob:", error);
    throw new Error("Unable to delete job");
  }
}

export async function findEmployeeConflict({ jobDate, s, e, employeeId, excludeId }) {
  return scoped(model.jobModel).findOne({
    where: {
      jobDate,
      employeeId,
      jobId: excludeId ? { [Op.ne]: excludeId } : { [Op.ne]: 0 },
      [Op.and]: Sequelize.literal(
        `STR_TO_DATE(start_time, '%H:%i:%s') < '${e}' AND STR_TO_DATE(end_time, '%H:%i:%s') > '${s}'`
      ),
    },
  });
}

export async function findLocationConflict({ jobDate, s, e, location, excludeId }) {
  return scoped(model.jobModel).findOne({
    where: {
      jobDate,
      location,
      jobId: excludeId ? { [Op.ne]: excludeId } : { [Op.ne]: 0 },
      [Op.and]: Sequelize.literal(
        `STR_TO_DATE(start_time, '%H:%i:%s') < '${e}' AND STR_TO_DATE(end_time, '%H:%i:%s') > '${s}'`
      ),
    },
  });
}

export async function getCalendarJobs(view, date) {
  let start;
  let end;

  const d = new Date(date);

  if (view === "daily") {
    start = end = date;
  }

  if (view === "weekly") {
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((day + 6) % 7));

    start = monday.toISOString().slice(0, 10);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    end = sunday.toISOString().slice(0, 10);
  }

  if (view === "monthly") {
    const year = d.getFullYear();
    const month = d.getMonth();

    start = new Date(year, month, 1).toISOString().slice(0, 10);
    end = new Date(year, month + 1, 0).toISOString().slice(0, 10);
  }

  return scoped(model.jobModel).findAll({
    where: {
      jobDate: { [Op.between]: [start, end] },
    },
    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
    include: [
      {
        model: model.jobSettingModel.unscoped(),
        as: "jobType",
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
      },
      {
        model: model.employeeModel.unscoped(),
        as: "facultyJobs",
        attributes: ["employeeCode", "department", "employmentType", "employeeName", "pickColor"],
      },
      {
        model: model.subAccountModel.unscoped(),
        as: "departmentJobs",
        attributes: ["departmentName", "subAccountId", "alternateName", "departmentCode"],
      },
      {
        model: model.subjectModel.unscoped(),
        as: "subjectJobs",
        attributes: ["subjectName", "subjectCode", "subjectId"],
      },
      {
        model: model.courseModel.unscoped(),
        as: "courseJobs",
        attributes: ["courseId", "courseName", "courseCode"],
      },
    ],
    order: [
      ["jobDate", "ASC"],
      ["startTime", "ASC"],
    ],
  });
}

export async function getFacultyCalendar(employeeId, start, end) {
  const employee = await scoped(model.employeeModel).findOne({
    attributes: ["employeeId"],
    where: { employeeId },
  });
  if (!employee) {
    return [];
  }

  return scoped(model.jobModel).findAll({
    where: {
      employeeId,
      jobDate: { [Op.between]: [start, end] },
    },
    order: [
      ["jobDate", "ASC"],
      ["startTime", "ASC"],
    ],
  });
}

export async function getDepartmentCalendar(subAccountId, start, end) {
  const department = await scoped(model.subAccountModel).findOne({
    attributes: ["subAccountId"],
    where: { subAccountId },
  });
  if (!department) {
    return [];
  }

  return scoped(model.jobModel).findAll({
    where: {
      subAccountId,
      jobDate: { [Op.between]: [start, end] },
    },
    order: [
      ["jobDate", "ASC"],
      ["startTime", "ASC"],
    ],
  });
}

export async function getFilteredJobs(filters) {
  const { type, jobTypeId, subAccountId, employeeId, date, status, page, limit } = filters;

  const where = {
    ...(jobTypeId && { jobSettingId: jobTypeId }),
    ...(subAccountId && { subAccountId }),
    ...(employeeId && { employeeId }),
    ...(status && { status }),
    ...(date && { jobDate: date }),
  };

  const today = new Date().toISOString().slice(0, 10);

  if (type === "upcoming") {
    where.jobDate = { [Op.gte]: today };
  }

  if (type === "previous") {
    where.jobDate = { [Op.lt]: today };
  }

  if (type === "master") {
    const jobTypes = await scoped(model.jobSettingModel).findAll({
      where: { isActive: true },
      order: [["jobTypeName", "ASC"]],
    });

    return {
      total: jobTypes.length,
      data: jobTypes,
    };
  }

  const offset = (page - 1) * limit;

  const jobs = await scoped(model.jobModel).findAndCountAll({
    where,
    offset,
    limit: parseInt(limit, 10),
    order: [
      ["jobDate", "ASC"],
      ["startTime", "ASC"],
    ],
    include: [
      {
        model: model.jobSettingModel.unscoped(),
        as: "jobType",
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
      },
      {
        model: model.employeeModel.unscoped(),
        as: "facultyJobs",
        attributes: ["employeeCode", "department", "employmentType", "employeeName", "pickColor"],
      },
      {
        model: model.subAccountModel.unscoped(),
        as: "departmentJobs",
        attributes: ["departmentName", "subAccountId", "alternateName", "departmentCode"],
      },
      {
        model: model.subjectModel.unscoped(),
        as: "subjectJobs",
        attributes: ["subjectName", "subjectCode", "subjectId"],
      },
      {
        model: model.courseModel.unscoped(),
        as: "courseJobs",
        attributes: ["courseId", "courseName", "courseCode"],
      },
    ],
  });

  return {
    total: jobs.count,
    totalPages: Math.ceil(jobs.count / limit),
    page: Number(page),
    limit: Number(limit),
    data: jobs.rows,
  };
}

export async function getJobData(filters, targetDate) {
  return scoped(model.jobModel).findAll({
    where: {
      jobDate: targetDate.toISOString().slice(0, 10),
      ...(filters.employeeId && { employeeId: filters.employeeId }),
      ...(filters.status && { status: filters.status }),
    },
    include: [
      { model: model.employeeModel.unscoped(), as: "facultyJobs" },
      { model: model.subAccountModel.unscoped(), as: "departmentJobs" },
    ],
  });
}

export async function fetchJobs(filters, fromDate, toDate) {
  const where = {
    ...(filters.employeeId && { employeeId: filters.employeeId }),
    ...(filters.subAccountId && { subAccountId: filters.subAccountId }),
    ...(filters.status && { status: filters.status }),
  };

  if (fromDate && toDate) {
    where.jobDate = { [Op.between]: [fromDate, toDate] };
  } else if (fromDate) {
    where.jobDate = { [Op.gte]: fromDate };
  } else if (toDate) {
    where.jobDate = { [Op.lte]: toDate };
  }

  const jobs = await scoped(model.jobModel).findAll({
    where,
    include: [
      { model: model.employeeModel.unscoped(), as: "facultyJobs" },
      { model: model.subAccountModel.unscoped(), as: "departmentJobs" },
    ],
  });

  return jobs.map((j) => ({
    jobId: j.jobId,
    jobTitle: j.jobTitle,
    faculty: j.facultyJobs?.employeeName,
    date: j.jobDate,
    startTime: j.startTime,
    endTime: j.endTime,
    department: j.departmentJobs?.departmentName,
    status: j.status,
    type: "Event",
  }));
}

export async function fetchTimetableAsJobs(filters, fromDate, toDate) {
  const tables = await model.timeTableRoutineModel.findAll({
    where: {
      isPublish: true,
      ...(fromDate && { endingDate: { [Op.gte]: fromDate } }),
      ...(toDate && { startingDate: { [Op.lte]: toDate } }),
    },
  });

  const rows = [];

  for (const table of tables) {
    const config = await model.timeTableStructurePeriodsModel.findOne({
      where: { timeTableNameId: table.timeTableNameId },
    });

    if (!config) continue;

    const weekOff = Array.isArray(config.weekOff)
      ? config.weekOff
      : JSON.parse(config.weekOff || "[]");

    let start = fromDate || table.startingDate;
    let end = toDate || table.endingDate;

    for (let d = start; d <= end; ) {
      const dayName = new Date(d).toLocaleDateString("en-US", { weekday: "long" });
      if (!weekOff.includes(dayName)) {
        const lectures = await model.classScheduleModel.findAll({
          where: {
            timeTableRoutineId: table.timeTableRoutineId,
            day: dayName,
            ...(filters.employeeId && { employeeId: filters.employeeId }),
          },
          include: [{ model: model.employeeModel.unscoped(), as: "employeeDetails" }],
        });

        for (const l of lectures) {
          rows.push({
            jobTitle: "TimeTable",
            faculty: l.employeeDetails?.employeeName,
            date: d,
            startTime: l.startTime,
            endTime: l.endTime,
            department: l.employeeDetails?.department,
            status: "Active",
            type: "Lecture",
          });
        }
      }

      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      d = next.toISOString().split("T")[0];
    }
  }

  return rows;
}
