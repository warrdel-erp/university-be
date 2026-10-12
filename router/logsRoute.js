import { Router } from "express";
import {
  getLogsApi,
  getLogByIdApi,
  clearLogsApi,
  getLogDatesApi,
} from "../controllers/logsController.js";

const router = Router();

// Available log file dates for date-picker
router.get("/dates", getLogDatesApi);

// Get paginated logs (supports query filters: ?date=YYYY-MM-DD&status=...&method=...&search=...&page=...&limit=...)
router.get("/", getLogsApi);

// Single log detail by ID for req/res inspection drawer
router.get("/:id", getLogByIdApi);

// Clear in-memory logs
router.delete("/", clearLogsApi);

export default router;
