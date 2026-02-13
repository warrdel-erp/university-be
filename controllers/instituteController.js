import * as instituteService from "../services/instituteService.js";

/**
 * Handle institute creation
 */
export const createInstitute = async (req, res) => {
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

    const result = await instituteService.createInstitute(data);

    return res.status(201).json({
      status: "success",
      message: "Institute created successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error in Create Institute Controller:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      status: "error",
      message: statusCode === 500 ? "Internal Server Error" : error.message,
      ...(statusCode === 500 && { error: error.message }),
    });
  }
};

/**
 * Handle listing of institutes
 */
export const listInstitutes = async (req, res) => {
  try {
    const universityId = req.user.universityId;
    const { campusId } = req.query;

    if (!universityId) {
      return res.status(400).json({
        status: "error",
        message: "University Id is missing from user session",
      });
    }

    const result = await instituteService.listInstitutes(universityId, campusId);

    return res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error in List Institute Controller:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
};
