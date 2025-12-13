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
      attributes: { exclude: [ "createdAt", "updatedAt", "deletedAt"] },
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
          attributes: ["departmentName", "subAccountId","alternateName","departmentCode"]
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
      attributes: { exclude: [ "createdAt", "updatedAt", "deletedAt"] },
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
          attributes: ["departmentName", "subAccountId","alternateName","departmentCode"]
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
          attributes: ["departmentName", "subAccountId","alternateName","departmentCode"]
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
        attributes: ["departmentName", "subAccountId","alternateName","departmentCode"]
      },
      {
        model: model.subjectModel,
        as: "subjectJobs",
        attributes: ["subjectName", "subjectCode", "subjectId"]
      },
      {
        model: model.courseModel,
        as: "courseJobs",
        attributes: ["courseId","courseName","courseCode"]
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