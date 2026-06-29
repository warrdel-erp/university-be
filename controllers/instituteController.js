import * as instituteService from "../services/instituteService.js";

export const createInstitute = async (req, res) => {
  try {
    const createdBy = req.user.userId;

    const data = {
      ...req.body,
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

export const updateInstitute = async (req, res) => {
  try {
    const { instituteId, ...body } = req.body;
    const result = await instituteService.updateInstitute(instituteId, body);

    return res.status(200).json({
      status: "success",
      message: "Institute updated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error in Update Institute Controller:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      status: "error",
      message: statusCode === 500 ? "Internal Server Error" : error.message,
      ...(statusCode === 500 && { error: error.message }),
    });
  }
};

export const updateAffiliatedUniversity = async (req, res) => {
  try {
    const { affiliatedUniversityId, ...body } = req.body;
    const result = await instituteService.updateAffiliatedUniversity(
      affiliatedUniversityId,
      body
    );

    return res.status(200).json({
      status: "success",
      message: "Affiliated university updated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error in Update Affiliated University Controller:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      status: "error",
      message: statusCode === 500 ? "Internal Server Error" : error.message,
      ...(statusCode === 500 && { error: error.message }),
    });
  }
};

export const listInstitutes = async (req, res) => {
  try {
    const { campusId } = req.query;
    const result = await instituteService.listInstitutes(campusId);

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
