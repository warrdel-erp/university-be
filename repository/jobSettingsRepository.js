import * as model from "../models/index.js";

export async function addJobType(data) {
  try {
    return await model.jobSettingModel.create(data);
  } catch (error) {
    console.error("Repository Error - addJobType:", error.message);
    throw new Error(error.message);
  }
}

export async function getAllJobTypes(universityId, instituteId, role) {

  const whereClause = {
    isActive: true,
    ...(universityId && { universityId }),
    ...(role === "Head" && { instituteId }),
  };

  try {
    return await model.jobSettingModel.findAll({
      where: whereClause
    });

  } catch (error) {
    throw new Error(error.message);
  }
};

export async function getSingleJobType(jobSettingId) {
  try {
    return await model.jobSettingModel.findOne({
      where: { jobSettingId },
      include :[
        {
          model :model.jobModel,
          as:'jobs',
          attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] },
          include:[
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
        }
      ]
    });
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function updateJobType(jobSettingId, data) {
  try {
    return await model.jobSettingModel.update(data, { where: { jobSettingId: jobSettingId } });
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function deleteJobType(jobSettingId) {
  try {
    return await model.jobSettingModel.destroy({ where: { jobSettingId: jobSettingId } });
  } catch (error) {
    throw new Error(error.message);
  }
};