import { Router } from "express";
import userAuth from "../middleware/authUser.js";
import * as auditLogController from "../controllers/auditLogController.js";

const router = Router();

// Dropdown filter helpers
router.get("/entities", userAuth, auditLogController.getAuditLogEntities);
router.get("/actions", userAuth, auditLogController.getAuditLogActions);
router.get("/event-types", userAuth, auditLogController.getAuditEventTypes);

// Audit Events APIs
router.get("/events", userAuth, auditLogController.getAuditEvents);
router.get("/events/:eventId/logs", userAuth, auditLogController.getLogsByEventId);
router.get("/events/:eventId", userAuth, auditLogController.getAuditEventById);

// Single audit log detail
router.get("/:id", userAuth, auditLogController.getAuditLogById);

// Paginated audit logs list
router.get("/", userAuth, auditLogController.getAuditLogs);

export default router;

