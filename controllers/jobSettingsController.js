import * as jobSettingsService from "../services/jobSettingsService.js";

export async function addJobType(req, res) {
  console.log(`>>>>>>>>>>>>>>>>>>>`);
  
  try {
    console.log(`>>>>>req.user.universityId`,req.user.universityId);
    
    const data = {
    universityId: req.user.universityId,
    instituteId: req.user.instituteId,
    createdBy: req.user.userId,
    updatedBy: req.user.userId,
    ...req.body
  };
  console.log(`>>>>>>data`,data);
  
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
}

export async function getAllJobTypes(req, res) {
  try {
    const result = await jobSettingsService.getAllJobTypes();
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Error in getAllJobTypes:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getSingleJobType(req, res) {
  try {
    const result = await jobSettingsService.getSingleJobType(req.params.id);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Error in getSingleJobType:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}

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
}

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
}