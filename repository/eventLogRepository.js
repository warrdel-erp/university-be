import { Op } from "sequelize";
import * as model from "../models/index.js";

export async function createEventLog(payload, options = {}) {
  const record = await model.eventLogModel.create(
    {
      eventId: payload.eventId,
      universityId: payload.universityId ?? null,
      instituteId: payload.instituteId ?? null,
      academicYearId: payload.academicYearId ?? null,
      entity: payload.entity,
      entityId: payload.entityId ?? null,
      action: payload.action,
      oldData: payload.oldData ?? null,
      newData: payload.newData ?? null,
    },
    { transaction: options.transaction },
  );
  return record.get({ plain: true });
}

export async function findAndCountAuditLogs(filters = {}, pagination = {}, options = {}) {
  const where = {};
  const eventWhere = {};

  if (filters.universityId != null) {
    where.universityId = filters.universityId;
  }
  if (filters.instituteId != null) {
    where.instituteId = filters.instituteId;
  }
  if (filters.academicYearId != null) {
    where.academicYearId = filters.academicYearId;
  }
  if (filters.entity) {
    where.entity = filters.entity;
  }
  if (filters.entityId) {
    where.entityId = String(filters.entityId);
  }
  if (filters.action) {
    where.action = filters.action;
  }

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      where.createdAt[Op.gte] = new Date(filters.startDate);
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      if (String(filters.endDate).length <= 10) {
        end.setHours(23, 59, 59, 999);
      }
      where.createdAt[Op.lte] = end;
    }
  }

  if (filters.eventType) {
    eventWhere.eventType = filters.eventType;
  }
  if (filters.status) {
    eventWhere.status = filters.status;
  }
  if (filters.userId != null) {
    eventWhere.userId = Number(filters.userId);
  }

  if (filters.search) {
    const s = `%${filters.search}%`;
    where[Op.or] = [
      { entity: { [Op.like]: s } },
      { entityId: { [Op.like]: s } },
    ];
  }

  const page = Math.max(1, Number(pagination.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(pagination.limit) || 10));
  const offset = (page - 1) * limit;

  const validSortFields = {
    createdAt: "createdAt",
    created_at: "createdAt",
    timestamp: "createdAt",
    date: "createdAt",
    eventLogId: "eventLogId",
    id: "eventLogId",
    action: "action",
    entity: "entity",
    entityId: "entityId",
  };
  const sortKey = validSortFields[pagination.sortBy] || "createdAt";
  const sortDir = String(pagination.sortOrder || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";

  const { count: totalRecords, rows } = await model.eventLogModel.findAndCountAll({
    where,
    include: [
      {
        model: model.eventModel,
        as: "event",
        where: Object.keys(eventWhere).length > 0 ? eventWhere : undefined,
        required: Object.keys(eventWhere).length > 0,
        include: [
          {
            model: model.userModel,
            as: "user",
            attributes: ["userId", "userName", "email"],
            required: false,
          },
        ],
      },
    ],
    order: [[sortKey, sortDir]],
    limit,
    offset,
    distinct: true,
    transaction: options.transaction,
  });

  return {
    totalRecords,
    totalPages: Math.ceil(totalRecords / limit) || 1,
    currentPage: page,
    pageSize: limit,
    rows,
  };
}

export async function findAuditLogById(eventLogId, options = {}) {
  return await model.eventLogModel.findOne({
    where: { eventLogId },
    include: [
      {
        model: model.eventModel,
        as: "event",
        include: [
          {
            model: model.userModel,
            as: "user",
            attributes: ["userId", "userName", "email"],
            required: false,
          },
        ],
      },
    ],
    transaction: options.transaction,
  });
}

export async function getDistinctEntities(universityId) {
  const where = universityId ? { universityId } : {};
  const rows = await model.eventLogModel.findAll({
    where,
    attributes: [
      [model.sequelize.fn("DISTINCT", model.sequelize.col("entity")), "entity"],
    ],
    raw: true,
  });
  return rows.map((r) => r.entity).filter(Boolean);
}
