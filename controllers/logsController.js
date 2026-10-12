import {
  getLogs,
  getLogById,
  clearLogs,
  getAvailableLogDates,
} from "../services/requestLoggerService.js";

/**
 * Controller to fetch available log file dates
 */
export const getLogDatesApi = async (req, res) => {
  const dates = await getAvailableLogDates();
  return res.json({ success: true, dates });
};

/**
 * Controller to fetch paginated JSON logs for React UI / API
 * Supports basic filters: method, status, userId, instituteId, universityId, email, endpoint, minDuration, isAuth
 */
export const getLogsApi = async (req, res) => {
  const {
    date,
    method,
    status,
    userId,
    instituteId,
    universityId,
    email,
    endpoint,
    minDuration,
    maxDuration,
    ip,
    isAuth,
    page,
    limit,
  } = req.query;

  const result = await getLogs({
    date,
    method,
    status,
    userId,
    instituteId,
    universityId,
    email,
    endpoint: endpoint || req.query.path || req.query.url,
    minDuration,
    maxDuration,
    ip,
    isAuth,
    page,
    limit,
  });

  return res.json(result);
};

/**
 * Controller to fetch single log detail by ID
 */
export const getLogByIdApi = async (req, res) => {
  const { id } = req.params;
  const { date } = req.query;
  const log = await getLogById(id, date);
  if (!log) {
    return res.status(404).json({ success: false, message: "Log entry not found" });
  }
  return res.json({ success: true, log });
};

/**
 * Controller to clear in-memory logs
 */
export const clearLogsApi = (req, res) => {
  const result = clearLogs();
  return res.json(result);
};
