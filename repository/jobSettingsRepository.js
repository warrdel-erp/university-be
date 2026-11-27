import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

export async function addJobType(data, options = {}) {
  try {
    return scoped(model.jobSettingModel).create(data, { transaction: options.transaction });
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

export async function getSingleJobType(jobSettingId) {
  try {
    return scoped(model.jobSettingModel).findOne({
      where: { jobSettingId },
      include: [
        {
          model: model.jobModel,
          as: "jobs",
          attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] },
          where: buildScope(model.jobModel),
          required: false,
          include: [
            {
              model: model.users, as: "user",
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
          ],
        },
      ],
    });
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function updateJobType(jobSettingId, data, options = {}) {
  try {
    const existing = await scoped(model.jobSettingModel).findOne({
      attributes: ["jobSettingId"],
      where: { jobSettingId },
      transaction: options.transaction,
    });
    if (!existing) {
      return [0];
    }

    return scoped(model.jobSettingModel).update(data, {
      where: { jobSettingId },
      transaction: options.transaction,
      individualHooks: true,
    });
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function deleteJobType(jobSettingId, options = {}) {
  try {
    const existing = await scoped(model.jobSettingModel).findOne({
      attributes: ["jobSettingId"],
      where: { jobSettingId },
      transaction: options.transaction,
    });
    if (!existing) {
      return 0;
    }

    return scoped(model.jobSettingModel).destroy({
      where: { jobSettingId },
      transaction: options.transaction,
      individualHooks: true,
    });
  } catch (error) {
    throw new Error(error.message);
  }
}
