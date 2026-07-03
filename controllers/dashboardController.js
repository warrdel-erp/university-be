import * as dashboardServices from '../services/dashboardServices.js';
import { SuccessResponse, ErrorResponse } from '../utility/response.js';

export const getDashboardOverview = async (req, res) => {
  try {
    const { year, month } = req.query;
    const result = await dashboardServices.getDashboardOverview({ year, month });
    return SuccessResponse(res, 200, 'Dashboard overview fetched successfully', result);
  } catch (error) {
    const statusCode = /scope/i.test(error.message) ? 400 : 500;
    return ErrorResponse(res, statusCode, error.message || 'Something went wrong');
  }
};

export const getFeeOverview = async (req, res) => {
  try {
    const { year, month, week } = req.query;
    const result = await dashboardServices.getFeeOverview({ year, month, week });
    return SuccessResponse(res, 200, 'Fee collection overview fetched successfully', result);
  } catch (error) {
    const statusCode = /scope/i.test(error.message) ? 400 : 500;
    return ErrorResponse(res, statusCode, error.message || 'Something went wrong');
  }
};

export const getStudentAttendanceOverview = async (req, res) => {
  try {
    const result = await dashboardServices.getStudentAttendanceOverview();
    return SuccessResponse(res, 200, 'Student attendance overview fetched successfully', result);
  } catch (error) {
    const statusCode = /scope/i.test(error.message) ? 400 : 500;
    return ErrorResponse(res, statusCode, error.message || 'Something went wrong');
  }
};

export const getTodaysClasses = async (req, res) => {
  try {
    const result = await dashboardServices.getTodaysClasses(req.query.date);
    return SuccessResponse(res, 200, "Today's classes fetched successfully", result);
  } catch (error) {
    const statusCode = /scope/i.test(error.message) ? 400 : 500;
    return ErrorResponse(res, statusCode, error.message || 'Something went wrong');
  }
};

export const getDashboardNotices = async (req, res) => {
  try {
    const limit = req.query.limit != null ? Number(req.query.limit) : 10;
    const result = await dashboardServices.getDashboardNotices(req.user.defaultRole, limit, req.query.date);
    return SuccessResponse(res, 200, 'Dashboard notices fetched successfully', result);
  } catch (error) {
    const statusCode = /scope/i.test(error.message) ? 400 : 500;
    return ErrorResponse(res, statusCode, error.message || 'Something went wrong');
  }
};
