import * as eventLogRepository from "../repository/eventLogRepository.js";
import * as eventRepository from "../repository/eventRepository.js";
import {
  AUDIT_LOG_ACTIONS,
  AUDIT_LOG_STATUSES,
  AUDIT_DATE_RANGES,
} from "../const/auditEvents.js";

export { AUDIT_LOG_ACTIONS, AUDIT_LOG_STATUSES, AUDIT_DATE_RANGES };

/**
 * Resolves standard date range string into concrete start and end Date objects
 */
export function resolveDateRange(range) {
  if (!range) return null;
  const normalized = String(range).trim().toUpperCase();
  if (normalized === "ALL" || normalized === "ALL TIME") {
    return null;
  }

  const now = new Date();

  if (normalized === "TODAY") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { startDate: start, endDate: end };
  }

  if (normalized === "YESTERDAY") {
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);
    return { startDate: start, endDate: end };
  }

  if (
    normalized === "WEEK" ||
    normalized === "LAST 7 DAYS" ||
    normalized === "LAST_7_DAYS"
  ) {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { startDate: start, endDate: end };
  }

  if (
    normalized === "MONTH" ||
    normalized === "LAST 30 DAYS" ||
    normalized === "LAST_30_DAYS"
  ) {
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { startDate: start, endDate: end };
  }

  return null;
}

/**
 * Computes structured diff and changedFields array between oldData and newData
 */
export function computeDiff(oldData, newData, action) {
  const oldObj =
    oldData && typeof oldData === "object" && !Array.isArray(oldData)
      ? oldData
      : {};
  const newObj =
    newData && typeof newData === "object" && !Array.isArray(newData)
      ? newData
      : {};

  if (action === "CREATE") {
    const changedFields = Object.keys(newObj);
    const diff = changedFields.map((field) => ({
      field,
      oldValue: null,
      newValue: newObj[field],
    }));
    return { changedFields, diff };
  }

  if (action === "DELETE") {
    const changedFields = Object.keys(oldObj);
    const diff = changedFields.map((field) => ({
      field,
      oldValue: oldObj[field],
      newValue: null,
    }));
    return { changedFields, diff };
  }

  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  const diff = [];
  const changedFields = [];

  for (const key of allKeys) {
    const oldVal = oldObj[key];
    const newVal = newObj[key];

    const isDifferent =
      typeof oldVal === "object" || typeof newVal === "object"
        ? JSON.stringify(oldVal) !== JSON.stringify(newVal)
        : oldVal !== newVal;

    if (isDifferent) {
      changedFields.push(key);
      diff.push({
        field: key,
        oldValue: oldVal !== undefined ? oldVal : null,
        newValue: newVal !== undefined ? newVal : null,
      });
    }
  }

  return { changedFields, diff };
}

/**
 * Maps raw database row to frontend-friendly audit log object
 */
export function mapAuditLogRow(row) {
  const plain = row?.get ? row.get({ plain: true }) : row;
  if (!plain) return null;

  const { changedFields, diff } = computeDiff(
    plain.oldData,
    plain.newData,
    plain.action,
  );

  return {
    eventLogId: plain.eventLogId,
    eventId: plain.eventId,
    universityId: plain.universityId,
    instituteId: plain.instituteId,
    academicYearId: plain.academicYearId,
    entity: plain.entity,
    entityId: plain.entityId,
    action: plain.action,
    changedFields,
    diff,
    oldData: plain.oldData,
    newData: plain.newData,
    createdAt: plain.createdAt,
    event: plain.event
      ? {
          eventId: plain.event.eventId,
          eventType: plain.event.eventType,
          status: plain.event.status,
          errorMessage: plain.event.errorMessage,
          completedAt: plain.event.completedAt,
          createdAt: plain.event.createdAt,
          user: plain.event.user
            ? {
                userId: plain.event.user.userId,
                userName: plain.event.user.userName,
                email: plain.event.user.email,
              }
            : null,
        }
      : null,
  };
}

/**
 * Service to fetch paginated audit events with search, filtering and sorting
 */
export async function getAuditEvents(query = {}) {
  try {
    const dateRangeParam = query.daterange || query.dateRange || query.range;
    const resolvedDates = resolveDateRange(dateRangeParam);

    const startDate = query.startDate || resolvedDates?.startDate;
    const endDate = query.endDate || resolvedDates?.endDate;

    const actionParam = query.action || query.actions;
    const statusParam = query.status || query.statuses;

    const filters = {
      action: actionParam,
      status: statusParam,
      eventType: query.eventType ? String(query.eventType).trim().toUpperCase() : undefined,
      userId: query.userId ? Number(query.userId) : undefined,
      startDate,
      endDate,
      search: query.search ? String(query.search).trim() : undefined,
    };

    const pagination = {
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    };

    const result = await eventRepository.findAndCountEvents(filters, pagination);

    return {
      totalRecords: result.totalRecords,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      pageSize: result.pageSize,
      filters: {
        actions: AUDIT_LOG_ACTIONS,
        statuses: AUDIT_LOG_STATUSES,
        dateRanges: AUDIT_DATE_RANGES,
      },
      rows: result.rows.map((row) => {
        const plain = row?.get ? row.get({ plain: true }) : row;
        return {
          eventId: plain.eventId,
          eventType: plain.eventType,
          status: plain.status,
          userId: plain.userId,
          user: plain.user
            ? {
                userId: plain.user.userId,
                userName: plain.user.userName,
                email: plain.user.email,
              }
            : null,
          universityId: plain.universityId,
          instituteId: plain.instituteId,
          academicYearId: plain.academicYearId,
          errorMessage: plain.errorMessage,
          logsCount: Number(plain.logsCount || 0),
          completedAt: plain.completedAt,
          createdAt: plain.createdAt,
          updatedAt: plain.updatedAt,
        };
      }),
    };
  } catch (error) {
    console.error("Error in Audit Log Service (getAuditEvents):", error);
    throw error;
  }
}

/**
 * Service to fetch single audit event detail by ID
 */
export async function getAuditEventById(id, tenantContext = {}) {
  try {
    const eventId = Number(id);
    if (!eventId || isNaN(eventId)) {
      const error = new Error("Invalid event ID");
      error.statusCode = 400;
      throw error;
    }

    const row = await eventRepository.findEventById(eventId);
    if (!row) {
      const error = new Error("Audit event not found");
      error.statusCode = 404;
      throw error;
    }

    if (!tenantContext.bypass && tenantContext.universityId) {
      if (
        row.universityId &&
        Number(row.universityId) !== Number(tenantContext.universityId)
      ) {
        const error = new Error("Audit event not found");
        error.statusCode = 404;
        throw error;
      }
    }

    const plain = row?.get ? row.get({ plain: true }) : row;
    return {
      eventId: plain.eventId,
      eventType: plain.eventType,
      status: plain.status,
      userId: plain.userId,
      user: plain.user
        ? {
            userId: plain.user.userId,
            userName: plain.user.userName,
            email: plain.user.email,
          }
        : null,
      universityId: plain.universityId,
      instituteId: plain.instituteId,
      academicYearId: plain.academicYearId,
      errorMessage: plain.errorMessage,
      logsCount: Number(plain.logsCount || 0),
      completedAt: plain.completedAt,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
    };
  } catch (error) {
    console.error("Error in Audit Log Service (getAuditEventById):", error);
    throw error;
  }
}

/**
 * Service to fetch all audit logs for a specific eventId
 */
export async function getLogsByEventId(id) {
  try {
    const eventId = Number(id);
    if (!eventId || isNaN(eventId)) {
      const error = new Error("Invalid event ID");
      error.statusCode = 400;
      throw error;
    }

    const event = await eventRepository.findEventById(eventId);
    if (!event) {
      const error = new Error("Audit event not found");
      error.statusCode = 404;
      throw error;
    }

    const logs = await eventLogRepository.findLogsByEventId(eventId);
    const eventPlain = event?.get ? event.get({ plain: true }) : event;

    return {
      event: {
        ...eventPlain,
        logsCount: logs.length,
      },
      logs: logs.map(mapAuditLogRow),
    };
  } catch (error) {
    console.error("Error in Audit Log Service (getLogsByEventId):", error);
    throw error;
  }
}
