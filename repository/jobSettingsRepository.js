import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

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

export async function getSingleJobType(jobSettingId) {
  try {
    return scoped(model.jobSettingModel).findOne({
      where: { jobSettingId },
      include: [
        {
          model: model.jobModel.unscoped(),
          as: "jobs",
          attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] },
          where: buildScope(model.jobModel),
          required: false,
          include: [
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
        },
      ],
    });
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
