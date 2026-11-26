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
    if (Array.isArray(filters.eventType)) {
      where.eventType = { [Op.in]: filters.eventType };
    } else if (String(filters.eventType).includes(",")) {
      where.eventType = {
        [Op.in]: filters.eventType.split(",").map((s) => s.trim().toUpperCase()),
      };
    } else {
      where.eventType = String(filters.eventType).trim().toUpperCase();
    }
  }

  if (filters.status && String(filters.status).toUpperCase() !== "ALL") {
    if (Array.isArray(filters.status)) {
      where.status = { [Op.in]: filters.status.map((s) => String(s).toUpperCase()) };
    } else if (String(filters.status).includes(",")) {
      where.status = {
        [Op.in]: filters.status.split(",").map((s) => s.trim().toUpperCase()),
      };
    } else {
      where.status = String(filters.status).trim().toUpperCase();
    }
  }

  if (filters.action && String(filters.action).toUpperCase() !== "ALL") {
    const rawActions = Array.isArray(filters.action)
      ? filters.action
      : String(filters.action)
          .split(",")
          .map((a) => a.trim().toUpperCase())
          .filter(Boolean);

    const actionClauses = [];
    for (const act of rawActions) {
      if (act === "CREATE") {
        actionClauses.push({
          [Op.or]: [
            { eventType: { [Op.like]: "%_CREATE%" } },
            { eventType: { [Op.like]: "%CREATE%" } },
            sequelize.literal(
              "EXISTS (SELECT 1 FROM `event_log` AS `el_act` WHERE `el_act`.`event_id` = `event`.`event_id` AND `el_act`.`action` IN ('CREATE', 'BULK_CREATE'))"
            ),
          ],
        });
      } else if (act === "UPDATE") {
        actionClauses.push({
          [Op.or]: [
            { eventType: { [Op.like]: "%_UPDATE%" } },
            { eventType: { [Op.like]: "%UPDATE%" } },
            sequelize.literal(
              "EXISTS (SELECT 1 FROM `event_log` AS `el_act` WHERE `el_act`.`event_id` = `event`.`event_id` AND `el_act`.`action` IN ('UPDATE', 'BULK_UPDATE'))"
            ),
          ],
        });
      } else if (act === "DELETE") {
        actionClauses.push({
          [Op.or]: [
            { eventType: { [Op.like]: "%_DELETE%" } },
            { eventType: { [Op.like]: "%DELETE%" } },
            sequelize.literal(
              "EXISTS (SELECT 1 FROM `event_log` AS `el_act` WHERE `el_act`.`event_id` = `event`.`event_id` AND `el_act`.`action` IN ('DELETE', 'BULK_DELETE'))"
            ),
          ],
        });
      } else if (act === "ASSIGN") {
        actionClauses.push({
          [Op.or]: [
            { eventType: { [Op.like]: "%_ASSIGN%" } },
            { eventType: { [Op.like]: "%ASSIGN%" } },
          ],
        });
      } else if (act === "VERIFY") {
        actionClauses.push({
          [Op.or]: [
            { eventType: { [Op.like]: "%_VERIFY%" } },
            { eventType: { [Op.like]: "%VERIFY%" } },
          ],
        });
      } else {
        const escaped = sequelize.escape(act);
        actionClauses.push({
          [Op.or]: [
            { eventType: { [Op.like]: `%${act}%` } },
            sequelize.literal(
              `EXISTS (SELECT 1 FROM \`event_log\` AS \`el_act\` WHERE \`el_act\`.\`event_id\` = \`event\`.\`event_id\` AND \`el_act\`.\`action\` = ${escaped})`
            ),
          ],
        });
      }
    }

    if (actionClauses.length > 0) {
      if (!where[Op.and]) where[Op.and] = [];
      where[Op.and].push({ [Op.or]: actionClauses });
    }
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
