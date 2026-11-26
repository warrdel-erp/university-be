import { Router } from "express";
import userAuth from "../middleware/authUser.js";
import * as auditLogController from "../controllers/auditLogController.js";

const router = Router();

// Audit Events APIs
router.get("/events", userAuth, auditLogController.getAuditEvents);
router.get("/events/:eventId/logs", userAuth, auditLogController.getLogsByEventId);
router.get("/events/:eventId", userAuth, auditLogController.getAuditEventById);

export default router;

