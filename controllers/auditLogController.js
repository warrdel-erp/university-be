import * as auditLogService from "../services/auditLogService.js";
import { getTenantStore } from "../utility/requestContext.js";

/**
 * Controller to fetch paginated audit events
 * Query parameters supported:
 *  - page (default 1)
 *  - limit (default 10)
 *  - eventType (e.g. "STUDENT_CREATE", "NOTICE_CREATE")
 *  - status (e.g. "SUCCESS", "FAILED")
 *  - userId (ID of user who triggered the event)
 *  - startDate, endDate (ISO date strings)
 *  - search (keyword across eventType and errorMessage)
 *  - sortBy (default "createdAt")
 *  - sortOrder ("ASC" or "DESC", default "DESC")
 */
export const getAuditEvents = async (req, res) => {
  try {
    const result = await auditLogService.getAuditEvents(req.query);

    return res.status(200).json({
      status: "success",
      message: "Audit events fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error in getAuditEvents controller:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      status: "error",
      message: statusCode === 500 ? "Internal Server Error" : error.message,
      ...(statusCode === 500 && { error: error.message }),
    });
  }
};

/**
 * Controller to fetch single audit event detail by eventId
 */
export const getAuditEventById = async (req, res) => {
  try {
    const { eventId } = req.params;
    const tenantStore = getTenantStore();
    const tenantContext = {
      universityId:
        tenantStore.universityId ||
        req.user?.universityId ||
        req.user?.dataValues?.universityId,
      bypass: tenantStore.bypass || req.bypassScope,
    };

    const result = await auditLogService.getAuditEventById(eventId, tenantContext);

    return res.status(200).json({
      status: "success",
      message: "Audit event detail fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error in getAuditEventById controller:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      status: "error",
      message: statusCode === 500 ? "Internal Server Error" : error.message,
      ...(statusCode === 500 && { error: error.message }),
    });
  }
};

/**
 * Controller to fetch all audit logs for a specific eventId
 */
export const getLogsByEventId = async (req, res) => {
  try {
    const { eventId } = req.params;
    const result = await auditLogService.getLogsByEventId(eventId);

    return res.status(200).json({
      status: "success",
      message: "Event logs fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error in getLogsByEventId controller:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      status: "error",
      message: statusCode === 500 ? "Internal Server Error" : error.message,
      ...(statusCode === 500 && { error: error.message }),
    });
  }
};
