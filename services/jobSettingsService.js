import * as jobSettingsRepository from "../repository/jobSettingsRepository.js";

export async function addJobType(data) {
  try {
    if (!data.jobTypeName) {
      throw new Error("jobTypeName is required");
    }

    return await jobSettingsRepository.addJobType(data);
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function getAllJobTypes() {
  try {
    return await jobSettingsRepository.getAllJobTypes();
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function getSingleJobType(jobSettingId) {
  try {
    if (!jobSettingId) throw new Error("settingId is required");
    return await jobSettingsRepository.getSingleJobType(jobSettingId);
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function updateJobType(jobSettingId, data) {
  try {
    if (!jobSettingId) throw new Error("settingId is required");
    return await jobSettingsRepository.updateJobType(jobSettingId, data);
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function deleteJobType(jobSettingId) {
  try {
    if (!jobSettingId) throw new Error("settingId is required");
    return await jobSettingsRepository.deleteJobType(jobSettingId);
  } catch (error) {
    throw new Error(error.message);
  }
};