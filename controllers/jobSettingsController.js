import * as jobSettingsService from "../services/jobSettingsService.js";

export async function addJobType(req, res) {
  try {
    const data = {
      universityId: req.user.universityId,
      instituteId: req.user.defaultInstituteId,
      createdBy: req.user.userId,
      updatedBy: req.user.userId,
      ...req.body
    };
    const result = await jobSettingsService.addJobType(data);
    return res.status(201).json({
      success: true,
      message: "Job type added successfully",
      data: result
    });
  } catch (error) {
    console.error("Error in addJobType:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export async function getAllJobTypes(req, res) {
  try {
    const universityId = req.user.universityId;
    const instituteId = req.user.defaultInstituteId;
    const role = req.user.role;
    const result = await jobSettingsService.getAllJobTypes(universityId, instituteId, role);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Error in getAllJobTypes:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export async function getSingleJobType(req, res) {
  try {
    const result = await jobSettingsService.getSingleJobType(req.params.id);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Error in getSingleJobType:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export async function updateJobType(req, res) {
  try {
    const result = await jobSettingsService.updateJobType(req.params.id, req.body);
    return res.status(200).json({
      success: true,
      message: "Job type updated successfully",
      data: result
    });
  } catch (error) {
    console.error("Error in updateJobType:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export async function deleteJobType(req, res) {
  try {
    const result = await jobSettingsService.deleteJobType(req.params.id);
    return res.status(200).json({
      success: true,
      message: "Job type deleted successfully"
    });
  } catch (error) {
    console.error("Error in deleteJobType:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};