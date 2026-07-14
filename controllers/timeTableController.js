import * as timeTableServices from "../services/timeTableServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export const addTimeTable = async (req, res) => {
  try {
    const data = req.body;

    const createdBy = req.user.userId;

    const updatedBy = req.user.userId;

    const result = await timeTableServices.addTimeTable(
      data,
      createdBy,
      updatedBy,
    );

    return SuccessResponse(res, 200, "Time table added successfully", result);
  } catch (error) {
    console.error("Error in adding all time table:", error);

    return ErrorResponse(res, 400, error.message || "Internal Server Error");   
  }
};
export const addTimeTablePeriod = async (req, res) => {
  try {
    const data = req.body;

    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;

    const result = await timeTableServices.addTimeTablePeriod(
      data,
      createdBy,
      updatedBy,
    );

    return SuccessResponse(res, 200, "Time table period added successfully", result);
  } catch (error) {
    return ErrorResponse(res, 400, error.message || "Internal Server Error");
  } 
};

export const getTimeTableDetails = async (req, res) => {
  const { courseId } = req.query;

  try {
    const result = await timeTableServices.getTimeTableDetails(courseId);
    return SuccessResponse(res, 200, "Time table details fetched successfully", result);
  } catch (error) {
    return ErrorResponse(res, 400, error.message || "Internal Server Error");
  }
};

export const getAllTimeTableName = async (req, res) => {
  const { courseId } = req.query;

  try {
    const result = await timeTableServices.getAllTimeTableName(courseId);
    return SuccessResponse(res, 200, "All time table name fetched successfully", result);
  } catch (error) {
    return ErrorResponse(res, 400, error.message || "Internal Server Error");
  }
};

export const getSingleTimeTableDetails = async (req, res) => {
  const { courseId } = req.query;

  try {
    const result = await timeTableServices.getSingleTimeTableDetails(courseId);
    return SuccessResponse(res, 200, "Single time table details fetched successfully", result);
  } catch (error) {
    return ErrorResponse(res, 400, error.message || "Internal Server Error");
  }
};

export const updateTimeTable = async (req, res) => {
  try {
    const result = await timeTableServices.updateTimeTable(req.body);
    return SuccessResponse(res, 200, "Time table updated successfully", result);
  } catch (error) {
    return ErrorResponse(res, 400, error.message || "Internal Server Error");
  }
};

export const deleteTimeTable = async (req, res) => {
  const { timeTableCreationId } = req.query;

  try {
    const result = await timeTableServices.deleteTimeTable(timeTableCreationId);
    return SuccessResponse(res, 200, "Time table deleted successfully", result);
  } catch (error) {
    return ErrorResponse(res, 400, error.message || "Internal Server Error");
  }
};

export const deleteTimeTableStructure = async (req, res) => {
  const { timeTableNameId } = req.query;

  try {
    const result =
      await timeTableServices.deleteTimeTableStructure(timeTableNameId);

    return SuccessResponse(res, 200, "Time table structure deleted successfully", result);
  } catch (error) {
    return ErrorResponse(res, 400, error.message || "Internal Server Error");
  }
};

export const updateStructureEndingDate = async (req, res) => {
  try {
    const { timeTableNameId, endingDate } = req.body;
    const updatedBy = req.user.userId;

    const result = await timeTableServices.updateStructureEndingDate(
      timeTableNameId,
      endingDate,
      updatedBy,
    );

    return SuccessResponse(res, 200, "Structure endingDate updated successfully", result);
  } catch (error) {
    return ErrorResponse(res, 400, error.message || "Internal Server Error");
  }
};
