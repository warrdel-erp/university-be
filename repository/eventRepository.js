import { Op } from "sequelize";
import sequelize from "../database/sequelizeConfig.js";
import * as model from "../models/index.js";
import eventModel from "../models/eventModel.js";

const MAX_ERROR_MESSAGE_LENGTH = 5_000;

export async function createEvent(
  {
    eventType,
    status = "PENDING",
    userId = null,
    universityId = null,
    instituteId = null,
    academicYearId = null,
  },
  options = {},
) {
  const record = await eventModel.create(
    {
      eventType,
      status,
      userId,
      universityId,
      instituteId,
      academicYearId,
      completedAt: status === "SUCCESS" ? new Date() : null,
    },
    { transaction: options.transaction },
  );
  return record.get({ plain: true });
}

export async function markEventSuccess(eventId) {
  await eventModel.update(
    {
      status: "SUCCESS",
      completedAt: new Date(),
    },
    { where: { eventId } },
  );
}

export async function markEventFailed(eventId, errorMessage = null) {
  let safeMessage = null;
  if (errorMessage != null) {
    safeMessage = String(errorMessage).slice(0, MAX_ERROR_MESSAGE_LENGTH) || null;
  }

  await eventModel.update(
    {
      status: "FAILED",
      completedAt: new Date(),
      errorMessage: safeMessage,
    },
    { where: { eventId } },
  );
}

export async function findAndCountEvents(filters = {}, pagination = {}, options = {}) {
  const where = {};
  
  if (filters.eventType) {
    where.eventType = filters.eventType;
  }
  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.userId != null) {
    where.userId = Number(filters.userId);
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

  if (filters.search) {
    const s = `%${filters.search}%`;
    where[Op.or] = [
      { eventType: { [Op.like]: s } },
      { errorMessage: { [Op.like]: s } },
    ];
  }

  const page = Math.max(1, Number(pagination.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(pagination.limit) || 10));
  const offset = (page - 1) * limit;

  const validSortFields = {
    createdAt: "createdAt",
    eventId: "eventId",
    eventType: "eventType",
    status: "status",
    completedAt: "completedAt",
  };
  const sortKey = validSortFields[pagination.sortBy] || "createdAt";
  const sortDir = String(pagination.sortOrder || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";

  const { count: totalRecords, rows } = await model.eventModel.findAndCountAll({
    where,
    attributes: {
      include: [
        [
          sequelize.literal(`(
            SELECT COUNT(*)
            FROM \`event_log\` AS \`el\`
            WHERE \`el\`.\`event_id\` = \`event\`.\`event_id\`
          )`),
          "logsCount",
        ],
      ],
    },
    include: [
      {
        model: model.userModel,
        as: "user",
        attributes: ["userId", "userName", "email"],
        required: false,
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

export async function findEventById(eventId, options = {}) {
  return await model.eventModel.findOne({
    where: { eventId },
    attributes: {
      include: [
        [
          sequelize.literal(`(
            SELECT COUNT(*)
            FROM \`event_log\` AS \`el\`
            WHERE \`el\`.\`event_id\` = \`event\`.\`event_id\`
          )`),
          "logsCount",
        ],
      ],
    },
    include: [
      {
        model: model.userModel,
        as: "user",
        attributes: ["userId", "userName", "email"],
        required: false,
      },
    ],
    transaction: options.transaction,
  });
}

export async function getDistinctEventTypes(universityId) {
  const where = universityId ? { universityId } : {};
  const rows = await model.eventModel.findAll({
    where,
    attributes: [
      [sequelize.fn("DISTINCT", sequelize.col("event_type")), "eventType"],
    ],
    raw: true,
  });
  return rows.map((r) => r.eventType).filter(Boolean);
}
