import * as dashboardServices from '../services/dashboardServices.js';
import { SuccessResponse, ErrorResponse } from '../utility/response.js';
import { validateEmployeeUser } from '../utility/employeeValidation.js';

export const getDashboard = async (req, res) => {
  try {
    const { date, limit, year, month, week } = req.query;
    const result = await dashboardServices.getDashboard({
      date,
      limit,
      role: req.user.defaultRole,
      year,
      month,
      week,
    });
    return SuccessResponse(res, 200, 'Dashboard fetched successfully', result);
  } catch (error) {
    const statusCode = /scope/i.test(error.message) ? 400 : 500;
    return ErrorResponse(res, statusCode, error.message || 'Something went wrong');
  }
};

export const getTeacherDashboard = async (req, res) => {
  try {
    const validation = await validateEmployeeUser(req, res);
    if (!validation.valid) {
      return ErrorResponse(res, validation.status, validation.message);
    }
    const userId = req.user.userId;
    const employeeId = validation.employeeRecord?.employeeId;
    const result = await dashboardServices.getTeacherDashboard({ userId, employeeId });
    return SuccessResponse(res, 200, 'Teacher dashboard fetched successfully', result);
  } catch (error) {
    const statusCode = error.statusCode || (/scope/i.test(error.message) ? 400 : 500);
    return ErrorResponse(res, statusCode, error.message || 'Something went wrong');
  }
};

export const getMyTeacherDashboard = async (req, res) => {
  try {
    const validation = await validateEmployeeUser(req, res);
    if (!validation.valid) {
      return ErrorResponse(res, validation.status, validation.message);
    }
    const userId = req.user.userId;
    const employeeId = validation.employeeRecord?.employeeId;

    const result = await dashboardServices.getTeacherDashboard({ userId, employeeId });
    return SuccessResponse(res, 200, 'Teacher dashboard fetched successfully', result);
  } catch (error) {
    const statusCode = error.statusCode || (/scope/i.test(error.message) ? 400 : 500);
    return ErrorResponse(res, statusCode, error.message || 'Something went wrong');
  }
};

export const getMyTeacherDashboardDateWiseClasses = async (req, res) => {
  try {
    const validation = await validateEmployeeUser(req, res);
    if (!validation.valid) {
      return ErrorResponse(res, validation.status, validation.message);
    }
    const userId = req.user.userId;
    const date=req.query.date;
    const result = await dashboardServices.getMyTeacherDashboardDateWiseClasses({userId,date});
    return SuccessResponse(res, 200, 'Teacher dashboard fetched successfully', result);
  } catch (error) {
    const statusCode = error.statusCode || (/scope/i.test(error.message) ? 400 : 500);
    return ErrorResponse(res, statusCode, error.message || 'Something went wrong');
  }
};

export const getMyTeacherTaskDuty = async (req, res) => {
  try {
    const validation = await validateEmployeeUser(req, res);
    if (!validation.valid) {
      return ErrorResponse(res, validation.status, validation.message);
    }
    const userId = req.user.userId;
    const employeeId = validation.employeeRecord?.employeeId;
    const { filter, type, date } = req.query;

    const result = await dashboardServices.getMyTeacherTaskDuty({
      userId,
      employeeId,
      filter: filter || type,
      date,
    });
    return SuccessResponse(res, 200, 'Tasks and duties fetched successfully', result);
  } catch (error) {
    const statusCode = error.statusCode || (/scope/i.test(error.message) ? 400 : 500);
    return ErrorResponse(res, statusCode, error.message || 'Something went wrong');
  }
};


