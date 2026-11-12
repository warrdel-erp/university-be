import * as eventLogRepository from "../repository/eventLogRepository.js";

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
 * Service to fetch paginated audit logs with search, filtering and sorting
 */
export async function getAuditLogs(query = {}, tenantContext = {}) {
  try {
    const filters = {
      entity: query.entity ? String(query.entity).trim() : undefined,
      entityId: query.entityId ? String(query.entityId).trim() : undefined,
      action: query.action ? String(query.action).trim().toUpperCase() : undefined,
      eventType: query.eventType ? String(query.eventType).trim().toUpperCase() : undefined,
      status: query.status ? String(query.status).trim().toUpperCase() : undefined,
      userId: query.userId ? Number(query.userId) : undefined,
      startDate: query.startDate,
      endDate: query.endDate,
      search: query.search ? String(query.search).trim() : undefined,
    };

    // Tenant scoping
    if (!tenantContext.bypass) {
      if (tenantContext.universityId) {
        filters.universityId = Number(tenantContext.universityId);
      }
    } else if (query.universityId) {
      filters.universityId = Number(query.universityId);
    }

    if (query.instituteId) {
      filters.instituteId = Number(query.instituteId);
    }
    if (query.academicYearId) {
      filters.academicYearId = Number(query.academicYearId);
    }

    const pagination = {
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    };

    const result = await eventLogRepository.findAndCountAuditLogs(
      filters,
      pagination,
    );

    return {
      totalRecords: result.totalRecords,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      pageSize: result.pageSize,
      rows: result.rows.map(mapAuditLogRow),
    };
  } catch (error) {
    console.error("Error in Audit Log Service (getAuditLogs):", error);
    throw error;
  }
}

/**
 * Service to fetch single audit log detail by ID
 */
export async function getAuditLogById(id, tenantContext = {}) {
  try {
    const eventLogId = Number(id);
    if (!eventLogId || isNaN(eventLogId)) {
      const error = new Error("Invalid audit log ID");
      error.statusCode = 400;
      throw error;
    }

    const row = await eventLogRepository.findAuditLogById(eventLogId);
    if (!row) {
      const error = new Error("Audit log entry not found");
      error.statusCode = 404;
      throw error;
    }

    if (!tenantContext.bypass && tenantContext.universityId) {
      if (
        row.universityId &&
        Number(row.universityId) !== Number(tenantContext.universityId)
      ) {
        const error = new Error("Audit log entry not found");
        error.statusCode = 404;
        throw error;
      }
    }

    return mapAuditLogRow(row);
  } catch (error) {
    console.error("Error in Audit Log Service (getAuditLogById):", error);
    throw error;
  }
}

/**
 * Service to fetch distinct audited entities
 */
export async function getAuditLogEntities(universityId) {
  try {
    return await eventLogRepository.getDistinctEntities(universityId);
  } catch (error) {
    console.error("Error in Audit Log Service (getAuditLogEntities):", error);
    throw error;
  }
}

/**
 * Service to fetch available audit actions
 */
export function getAuditLogActions() {
  return [
    "CREATE",
    "UPDATE",
    "DELETE",
    "BULK_CREATE",
    "BULK_UPDATE",
    "BULK_DELETE",
  ];
}

