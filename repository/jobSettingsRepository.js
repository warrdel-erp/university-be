import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";
import { Op } from "sequelize";

export async function addJobType(data) {
  try {
    return scoped(model.jobSettingModel).create(data);
  } catch (error) {
    console.error("Repository Error - addJobType:", error.message);
    throw new Error(error.message);
  }
}

export async function getAllJobTypes() {
  try {
    return scoped(model.jobSettingModel).findAll({
      where: { isActive: true },
    });
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function getSingleJobType(jobSettingId, options = {}) {
  try {
    const { page, limit, search } = options;

    const jobSetting = await scoped(model.jobSettingModel).findOne({
      where: { jobSettingId },
    });

    if (!jobSetting) {
      return null;
    }

    const jobWhere = {
      jobSettingId,
      ...buildScope(model.jobModel),
    };

    if (search && String(search).trim()) {
      const searchTerm = `%${String(search).trim()}%`;
      jobWhere[Op.or] = [
        { jobTitle: { [Op.like]: searchTerm } },
        { '$user.employeeName$': { [Op.like]: searchTerm } },
        { '$departmentJobs.departmentName$': { [Op.like]: searchTerm } },
      ];
    }

    const includeArray = [
      {
        model: model.users,
        as: "user",
        attributes: ["employeeCode", "departmentId", "employmentType", "employeeName", "pickColor"],
      },
      {
        model: model.departmentModel,
        as: "departmentJobs",
        attributes: ["departmentName", "departmentId", "alternateName", "departmentCode"],
      },
      {
        model: model.subjectModel,
        as: "subjectJobs",
        attributes: ["subjectName", "subjectCode", "subjectId"],
      },
      {
        model: model.courseModel,
        as: "courseJobs",
        attributes: ["courseId", "courseName", "courseCode"],
      },
    ];

    let resultJobs;
    let totalCount = 0;

    if (page && limit) {
      const parsedPage = parseInt(page, 10) || 1;
      const parsedLimit = parseInt(limit, 10) || 10;
      const offset = (parsedPage - 1) * parsedLimit;

      const { count, rows } = await scoped(model.jobModel).findAndCountAll({
        where: jobWhere,
        attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] },
        include: includeArray,
        offset,
        limit: parsedLimit,
        subQuery: false,
        order: [["jobId", "DESC"]],
      });

      resultJobs = rows;
      totalCount = count;
    } else {
      const rows = await scoped(model.jobModel).findAll({
        where: jobWhere,
        attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] },
        include: includeArray,
        order: [["jobId", "DESC"]],
      });

      resultJobs = rows;
      totalCount = rows.length;
    }

    const jobSettingPlain = jobSetting.get({ plain: true });
    jobSettingPlain.jobs = resultJobs.map(j => {
      const plainJob = j.get ? j.get({ plain: true }) : j;
      plainJob.facultyJobs = plainJob.user;
      return plainJob;
    });

    return {
      jobSetting: jobSettingPlain,
      total: totalCount,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || totalCount || 10,
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function updateJobType(jobSettingId, data) {
  try {
    const existing = await scoped(model.jobSettingModel).findOne({
      attributes: ["jobSettingId"],
      where: { jobSettingId },
    });
    if (!existing) {
      return [0];
    }

    return scoped(model.jobSettingModel).update(data, { where: { jobSettingId } });
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function deleteJobType(jobSettingId) {
  try {
    const existing = await scoped(model.jobSettingModel).findOne({
      attributes: ["jobSettingId"],
      where: { jobSettingId },
    });
    if (!existing) {
      return 0;
    }

    return scoped(model.jobSettingModel).destroy({ where: { jobSettingId } });
  } catch (error) {
    throw new Error(error.message);
  }
}
