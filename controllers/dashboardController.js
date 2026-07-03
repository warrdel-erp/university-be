import * as dashboardServices from '../services/dashboardServices.js';
import { SuccessResponse, ErrorResponse } from '../utility/response.js';

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
