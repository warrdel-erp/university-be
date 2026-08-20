import * as jobSettingsService from "../services/jobSettingsService.js";
import { SuccessResponse } from "../utility/response.js";

export async function addJobType(req, res) {
  try {
    const data = {
      createdBy: req.user.userId,
      updatedBy: req.user.userId,
      ...req.body,
    };
    const result = await jobSettingsService.addJobType(data);
    return res.status(201).json({
      success: true,
      message: "Job type added successfully",
      data: result,
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
    const { page, limit, search } = req.query;
    const result = await jobSettingsService.getSingleJobType(req.params.id, { page, limit, search });
    
    if (result) {
      if (page && limit) {
        return SuccessResponse(
          res,
          200,
          "Job setting details fetched successfully",
          result.jobSetting,
          {
            total: result.total,
            limit: parseInt(limit, 10),
            page: parseInt(page, 10),
          }
        );
      } else {
        return SuccessResponse(
          res,
          200,
          "Job setting details fetched successfully",
          result.jobSetting,
          {
            total: result.total,
            limit: result.total || 10,
            page: 1,
          }
        );
      }
    } else {
      return res.status(404).json({ success: false, message: "Job type not found" });
    }
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
      data: result,
    });
  } catch (error) {
    console.error("Error in updateJobType:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteJobType(req, res) {
  try {
    await jobSettingsService.deleteJobType(req.params.id);
    return res.status(200).json({
      success: true,
      message: "Job type deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteJobType:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}
