import * as model from "../models/index.js";
import { Op, Sequelize } from "sequelize";

export async function addJob(data) {
  try {
    const job = await model.jobModel.create(data);
    return job;
  } catch (error) {
    console.error("Error in addJob:", error);
    throw new Error("Unable to create job");
  }
}

export async function getAllJobs(universityId, instituteId, role) {
  try {
    return await model.jobModel.findAll({
      where: {
        universityId,
        ...(role === "Head" && { instituteId }),
        deletedAt: null
      },
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
      include: [
        {
          model: model.jobSettingModel,
          as: "jobType",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] }
        },
        {
          model: model.employeeModel,
          as: "facultyJobs",
          attributes: ["employeeCode", "department", "employmentType", "employeeName", "pickColor"]
        },
        {
          model: model.subAccountModel,
          as: "departmentJobs",
          attributes: ["departmentName", "subAccountId", "alternateName", "departmentCode"]
        },
        {
          model: model.subjectModel,
          as: "subjectJobs",
          attributes: ["subjectName", "subjectCode", "subjectId"]
        },
        {
          model: model.courseModel,
          as: "courseJobs",
          attributes: ["courseId", "courseName", "courseCode"]
        }
      ]
    });

  } catch (error) {
    console.error("Error in getAllJobs:", error);
    throw new Error("Unable to fetch job list");
  }
}

export async function getSingleJob(jobId) {
  try {
    return await model.jobModel.findOne({
      where: { jobId, deletedAt: null },
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
      include: [
        {
          model: model.jobSettingModel,
          as: "jobType",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] }
        },
        {
          model: model.employeeModel,
          as: "facultyJobs",
          attributes: ["employeeCode", "department", "employmentType", "employeeName", "pickColor"]
        },
        {
          model: model.subAccountModel,
          as: "departmentJobs",
          attributes: ["departmentName", "subAccountId", "alternateName", "departmentCode"]
        },
        {
          model: model.subjectModel,
          as: "subjectJobs",
          attributes: ["subjectName", "subjectCode", "subjectId"]
        },
        {
          model: model.courseModel,
          as: "courseJobs",
          attributes: ["courseId", "courseName", "courseCode"]
        }
      ]
    });

  } catch (error) {
    console.error("Error in getSingleJob:", error);
    throw new Error("Unable to fetch job details");
  }
};

export async function updateJob(jobId, data) {
  try {
    await model.jobModel.update(data, { where: { jobId } });
    return await getSingleJob(jobId);
  } catch (error) {
    console.error("Error in updateJob:", error);
    throw new Error("Unable to update job");
  }
}

export async function deleteJob(jobId) {
  try {
    return await model.jobModel.destroy({ where: { jobId } });
  } catch (error) {
    console.error("Error in deleteJob:", error);
    throw new Error("Unable to delete job");
  }
}

// EMPLOYEE CONFLICT CHECK
export async function findEmployeeConflict({ jobDate, s, e, employeeId, excludeId }) {
  return await model.jobModel.findOne({
    where: {
      jobDate,
      employeeId,
      jobId: excludeId ? { [Op.ne]: excludeId } : { [Op.ne]: 0 },
      [Op.and]: Sequelize.literal(
        `STR_TO_DATE(start_time, '%H:%i:%s') < '${e}' AND STR_TO_DATE(end_time, '%H:%i:%s') > '${s}'`
      )
    }
  });
}

// LOCATION CONFLICT CHECK
export async function findLocationConflict({ jobDate, s, e, location, excludeId }) {
  return await model.jobModel.findOne({
    where: {
      jobDate,
      location,
      jobId: excludeId ? { [Op.ne]: excludeId } : { [Op.ne]: 0 },
      [Op.and]: Sequelize.literal(
        `STR_TO_DATE(start_time, '%H:%i:%s') < '${e}' AND STR_TO_DATE(end_time, '%H:%i:%s') > '${s}'`
      )
    }
  });
}

// CALENDAR VIEW
export async function getCalendarJobs(view, date, universityId, instituteId, role) {
  let start, end;

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

  return await model.jobModel.findAll({
    where: {
      jobDate: { [Op.between]: [start, end] },
      universityId,
      ...(role === "Head" && { instituteId }),
    },

    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
    include: [
      {
        model: model.jobSettingModel,
        as: "jobType",
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] }
      },
      {
        model: model.employeeModel,
        as: "facultyJobs",
        attributes: ["employeeCode", "department", "employmentType", "employeeName", "pickColor"]
      },
      {
        model: model.subAccountModel,
        as: "departmentJobs",
        attributes: ["departmentName", "subAccountId", "alternateName", "departmentCode"]
      },
      {
        model: model.subjectModel,
        as: "subjectJobs",
        attributes: ["subjectName", "subjectCode", "subjectId"]
      },
      {
        model: model.courseModel,
        as: "courseJobs",
        attributes: ["courseId", "courseName", "courseCode"]
      }
    ],
    order: [["jobDate", "ASC"], ["startTime", "ASC"]]
  });
}

// FACULTY CALENDAR
export async function getFacultyCalendar(employeeId, start, end) {
  return await model.jobModel.findAll({
    where: {
      employeeId,
      jobDate: { [Op.between]: [start, end] }
    },
    order: [["jobDate", "ASC"], ["startTime", "ASC"]]
  });
}

// DEPARTMENT CALENDAR
export async function getDepartmentCalendar(subAccountId, start, end) {
  return await model.jobModel.findAll({
    where: {
      subAccountId,
      jobDate: { [Op.between]: [start, end] }
    },
    order: [["jobDate", "ASC"], ["startTime", "ASC"]]
  });
}

export async function getFilteredJobs(filters) {
  const {
    type,
    jobTypeId,
    subAccountId,
    employeeId,
    date,
    status,
    universityId,
    instituteId,
    role,
    page,
    limit
  } = filters;

  const where = {
    universityId,
    ...(role === "Head" && { instituteId }),
    ...(jobTypeId && { jobSettingId: jobTypeId }),
    ...(subAccountId && { subAccountId }),
    ...(employeeId && { employeeId }),
    ...(status && { status }),
    ...(date && { jobDate: date })
  };

  // TIME BASED FILTERS
  const today = new Date().toISOString().slice(0, 10);

  if (type === "upcoming") {
    where.jobDate = { [Op.gte]: today };
  }

  if (type === "previous") {
    where.jobDate = { [Op.lt]: today };
  }

  // For "job master", return job types only
  if (type === "master") {
    const jobTypes = await model.jobSettingModel.findAll({
      where: { universityId, instituteId, isActive: true },
      order: [["jobTypeName", "ASC"]]
    });

    return {
      total: jobTypes.length,
      data: jobTypes
    };
  }

  // PAGINATION
  const offset = (page - 1) * limit;

  const jobs = await model.jobModel.findAndCountAll({
    where,
    offset,
    limit: parseInt(limit),
    order: [["jobDate", "ASC"], ["startTime", "ASC"]],
    include: [
      {
        model: model.jobSettingModel,
        as: "jobType",
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] }
      },
      {
        model: model.employeeModel,
        as: "facultyJobs",
        attributes: ["employeeCode", "department", "employmentType", "employeeName", "pickColor"]
      },
      {
        model: model.subAccountModel,
        as: "departmentJobs",
        attributes: ["departmentName", "subAccountId", "alternateName", "departmentCode"]
      },
      {
        model: model.subjectModel,
        as: "subjectJobs",
        attributes: ["subjectName", "subjectCode", "subjectId"]
      },
      {
        model: model.courseModel,
        as: "courseJobs",
        attributes: ["courseId", "courseName", "courseCode"]
      }
    ]
  });

  return {
    total: jobs.count,
    totalPages: Math.ceil(jobs.count / limit),
    page: Number(page),
    limit: Number(limit),
    data: jobs.rows
  };
}

export async function getJobData(filters, targetDate) {
  return model.jobModel.findAll({
    where: {
      universityId: filters.universityId,
      instituteId: filters.instituteId,
      jobDate: targetDate.toISOString().slice(0, 10),
      ...(filters.employeeId && { employeeId: filters.employeeId }),
      ...(filters.status && { status: filters.status })
    },
    include: [
      { model: model.employeeModel, as: "facultyJobs" },
      { model: model.subAccountModel, as: "departmentJobs" }
    ]
  });
}

export async function fetchJobs(filters, fromDate, toDate) {
  const where = {
    universityId: filters.universityId,
    instituteId: filters.instituteId,
    ...(filters.employeeId && { employeeId: filters.employeeId }),
    ...(filters.subAccountId && { subAccountId: filters.subAccountId }),
    ...(filters.status && { status: filters.status })
  };

  if (fromDate && toDate) {
    where.jobDate = { [Op.between]: [fromDate, toDate] };
  } else if (fromDate) {
    where.jobDate = { [Op.gte]: fromDate };
  } else if (toDate) {
    where.jobDate = { [Op.lte]: toDate };
  }

  const jobs = await model.jobModel.findAll({
    where,
    include: [
      { model: model.employeeModel, as: "facultyJobs" },
      { model: model.subAccountModel, as: "departmentJobs" }
    ]
  });

  return jobs.map(j => ({
    jobId: j.jobId,
    jobTitle: j.jobTitle,
    faculty: j.facultyJobs?.employeeName,
    date: j.jobDate,
    startTime: j.startTime,
    endTime: j.endTime,
    department: j.departmentJobs?.departmentName,
    status: j.status,
    type: "Event"
  }));
}

/* -------------------- TIMETABLE -------------------- */
function getDayName(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", { weekday: "long" });
}

function nextDate(d) {
  const x = new Date(d);
  x.setDate(x.getDate() + 1);
  return x.toISOString().split("T")[0];
}

export async function fetchTimetableAsJobs(filters, fromDate, toDate) {
  const today = new Date().toISOString().split("T")[0];

  const tables = await model.timeTableRoutineModel.findAll({
    where: {
      isPublish: true,
      ...(fromDate && { endingDate: { [Op.gte]: fromDate } }),
      ...(toDate && { startingDate: { [Op.lte]: toDate } })
    }
  });

  const rows = [];

  for (const table of tables) {
    const config = await model.timeTableStructurePeriodsModel.findOne({
      where: { timeTableNameId: table.timeTableNameId }
    });

    if (!config) continue;

    const weekOff = Array.isArray(config.weekOff)
      ? config.weekOff
      : JSON.parse(config.weekOff || "[]");

    let start = fromDate || table.startingDate;
    let end = toDate || table.endingDate;

    for (let d = start; d <= end; d = nextDate(d)) {
      const dayName = getDayName(d);
      if (weekOff.includes(dayName)) continue;

      const lectures = await model.classScheduleModel.findAll({
        where: {
          timeTableRoutineId: table.timeTableRoutineId,
          day: dayName,
          ...(filters.employeeId && { employeeId: filters.employeeId })
        },
        include: [
          { model: model.employeeModel, as: "employeeDetails" },
          // { model: model.classSectionModel, as: "classSection" }
        ]
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
          type: "Lecture"
        });
      }
    }
  }

  return rows;
}
