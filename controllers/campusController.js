import * as campusService from "../services/campusService.js";

/**
 * Handle campus creation
 */
export const createCampus = async (req, res) => {
  try {
    const universityId = req.user.universityId;
    const createdBy = req.user.userId;

    if (!universityId) {
      return res.status(400).json({
        status: "error",
        message: "University Id is missing from user session",
      });
    }

    const data = {
      ...req.body,
      universityId,
      createdBy,
    };

    const result = await campusService.createCampus(data);

    return res.status(201).json({
      status: "success",
      message: "Campus created successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error in Create Campus Controller:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      error: error,
    });
  }
};

/**
 * Handle listing of campuses
 */
export const listCampuses = async (req, res) => {
  try {
    const universityId = req.user.universityId;

    if (!universityId) {
      return res.status(400).json({
        status: "error",
        message: "University Id is missing from user session",
      });
    }

    const result = await campusService.listCampuses(universityId);

    return res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error in List Campus Controller:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
};
