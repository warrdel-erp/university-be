import * as campusService from "../services/campusService.js";

export const createCampus = async (req, res) => {
  try {
    const createdBy = req.user.userId;

    if (!req.user.universityId) {
      return res.status(400).json({
        status: "error",
        message: "University Id is missing from user session",
      });
    }

    const result = await campusService.createCampus(req.body, createdBy);

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

export const updateCampus = async (req, res) => {
  try {
    if (!req.user.universityId) {
      return res.status(400).json({
        status: "error",
        message: "University Id is missing from user session",
      });
    }

    const { campusId, ...body } = req.body;
    const result = await campusService.updateCampus(campusId, body);

    return res.status(200).json({
      status: "success",
      message: "Campus updated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error in Update Campus Controller:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      status: "error",
      message: statusCode === 500 ? "Internal Server Error" : error.message,
      ...(statusCode === 500 && { error: error.message }),
    });
  }
};

export const getCampusHierarchy = async (req, res) => {
  try {
    if (!req.user.universityId) {
      return res.status(400).json({
        status: "error",
        message: "University Id is missing from user session",
      });
    }

    const result = await campusService.getCampusHierarchy(req.user.universityId);

    return res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error in Get Campus Hierarchy Controller:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
};

export const listCampuses = async (req, res) => {
  try {
    if (!req.user.universityId) {
      return res.status(400).json({
        status: "error",
        message: "University Id is missing from user session",
      });
    }

    const result = await campusService.listCampuses();

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
