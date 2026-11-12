import * as auditLogService from "../services/auditLogService.js";
import { getTenantStore } from "../utility/requestContext.js";

/**
 * Controller to fetch paginated audit logs for Frontend
 * Query parameters supported:
 *  - page (default 1)
 *  - limit (default 10)
 *  - entity (e.g. "campus", "exam_schedule")
 *  - entityId (e.g. "1")
 *  - action (e.g. "CREATE", "UPDATE", "DELETE")
 *  - eventType (e.g. "CAMPUS_CREATE", "CAMPUS_UPDATE")
 *  - status (e.g. "SUCCESS", "FAILED")
 *  - userId (ID of user who performed the action)
 *  - startDate, endDate (ISO date strings)
 *  - search (keyword across entity and entityId)
 *  - sortBy (default "createdAt")
 *  - sortOrder ("ASC" or "DESC", default "DESC")
 */
export const getAuditLogs = async (req, res) => {
  try {
    const tenantStore = getTenantStore();
    const tenantContext = {
      universityId:
        tenantStore.universityId ||
        req.user?.universityId ||
        req.user?.dataValues?.universityId,
      instituteId:
        tenantStore.instituteId ||
        req.user?.defaultInstituteId ||
        req.user?.dataValues?.defaultInstituteId,
      academicYearId:
        tenantStore.academicYearId ||
        req.user?.defaultAcademicYearId ||
        req.user?.dataValues?.defaultAcademicYearId,
      userId: req.user?.userId || req.user?.dataValues?.userId,
      bypass: tenantStore.bypass || req.bypassScope,
    };

    const result = await auditLogService.getAuditLogs(req.query, tenantContext);

    return res.status(200).json({
      status: "success",
      message: "Audit logs fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error in getAuditLogs controller:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      status: "error",
      message: statusCode === 500 ? "Internal Server Error" : error.message,
      ...(statusCode === 500 && { error: error.message }),
    });
  }
};

/**
 * Controller to fetch single audit log detail by eventLogId
 */
export const getAuditLogById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantStore = getTenantStore();
    const tenantContext = {
      universityId:
        tenantStore.universityId ||
        req.user?.universityId ||
        req.user?.dataValues?.universityId,
      bypass: tenantStore.bypass || req.bypassScope,
    };

    const result = await auditLogService.getAuditLogById(id, tenantContext);

    return res.status(200).json({
      status: "success",
      message: "Audit log detail fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error in getAuditLogById controller:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      status: "error",
      message: statusCode === 500 ? "Internal Server Error" : error.message,
      ...(statusCode === 500 && { error: error.message }),
    });
  }
};

/**
 * Controller to fetch list of distinct entities currently in audit logs (for frontend filters)
 */
export const getAuditLogEntities = async (req, res) => {
  try {
    const tenantStore = getTenantStore();
    const universityId =
      tenantStore.universityId ||
      req.user?.universityId ||
      req.user?.dataValues?.universityId;

    const entities = await auditLogService.getAuditLogEntities(universityId);

    return res.status(200).json({
      status: "success",
      data: entities,
    });
  } catch (error) {
    console.error("Error in getAuditLogEntities controller:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
};

/**
 * Controller to fetch list of available audit actions (for frontend filter dropdowns)
 */
export const getAuditLogActions = (req, res) => {
  try {
    const actions = auditLogService.getAuditLogActions();
    return res.status(200).json({
      status: "success",
      data: actions,
    });
  } catch (error) {
    console.error("Error in getAuditLogActions controller:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
};

