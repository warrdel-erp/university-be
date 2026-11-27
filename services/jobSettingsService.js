import * as jobSettingsRepository from "../repository/jobSettingsRepository.js";
import { withAuditEvent } from "../utility/audit/withAuditEvent.js";
import { AUDIT_EVENTS } from "../const/auditEvents.js";

export async function addJobType(data) {
  try {
    if (!data.jobTypeName) {
      throw new Error("jobTypeName is required");
    }

    return await withAuditEvent(AUDIT_EVENTS.JOB_TYPE_CREATE, async ({ transaction }) => {
      return jobSettingsRepository.addJobType(data, { transaction });
    });
  } catch (error) {
    throw new Error(error.message);
  }
};

export async function getAllJobTypes() {
  try {
    return jobSettingsRepository.getAllJobTypes();
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
};

export async function updateJobType(jobSettingId, data) {
  try {
    if (!jobSettingId) throw new Error("settingId is required");
    return await withAuditEvent(AUDIT_EVENTS.JOB_TYPE_UPDATE, async ({ transaction }) => {
      return jobSettingsRepository.updateJobType(jobSettingId, data, { transaction });
    });
  } catch (error) {
    throw new Error(error.message);
  }
};

export async function deleteJobType(jobSettingId) {
  try {
    if (!jobSettingId) throw new Error("settingId is required");
    return await withAuditEvent(AUDIT_EVENTS.JOB_TYPE_DELETE, async ({ transaction }) => {
      return jobSettingsRepository.deleteJobType(jobSettingId, { transaction });
    });
  } catch (error) {
    throw new Error(error.message);
  }
};