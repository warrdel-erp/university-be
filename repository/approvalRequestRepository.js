import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";
import { Op } from "sequelize";

export async function createApprovalRequest(data, options = {}) {
  return scoped(model.approvalRequestModel).create(data, {
    transaction: options.transaction,
  });
}

export async function getApprovalRequests(filters = {}, options = {}) {
  const where = {};

  if (filters.id) where.id = filters.id;
  if (filters.approvalFor) where.approvalFor = filters.approvalFor;
  if (filters.resourceId) where.resourceId = filters.resourceId;
  if (filters.requestedBy) where.requestedBy = filters.requestedBy;
  if (filters.assignedToPositionId) where.assignedToPositionId = filters.assignedToPositionId;
  if (filters.status) where.status = filters.status;
  if (filters.level) where.level = filters.level;

  const include = [
    {
      model: model.userModel,
      as: "requester",
      attributes: ["userId", "fullName", "email"],
      required: false,
    },
    {
      model: model.userModel,
      as: "approvedBy",
      attributes: ["userId", "fullName", "email"],
      required: false,
    },
    {
      model: model.userModel,
      as: "skippedBy",
      attributes: ["userId", "fullName", "email"],
      required: false,
    },
    {
      model: model.departmentPositionsModel,
      as: "assignedPosition",
      attributes: ["departmentPositionId", "positionName", "level"],
      required: false,
    },
  ];

  const queryOptions = {
    where,
    include,
    order: [["createdAt", "DESC"]],
    transaction: options.transaction,
  };

  if (options.limit) queryOptions.limit = Number(options.limit);
  if (options.offset) queryOptions.offset = Number(options.offset);

  return scoped(model.approvalRequestModel).findAndCountAll(queryOptions);
}

export async function getApprovalRequestById(id, options = {}) {
  return scoped(model.approvalRequestModel).findOne({
    where: { id },
    include: [
      {
        model: model.userModel,
        as: "requester",
        attributes: ["userId", "fullName", "email"],
        required: false,
      },
      {
        model: model.userModel,
        as: "approvedBy",
        attributes: ["userId", "fullName", "email"],
        required: false,
      },
      {
        model: model.userModel,
        as: "skippedBy",
        attributes: ["userId", "fullName", "email"],
        required: false,
      },
      {
        model: model.departmentPositionsModel,
        as: "assignedPosition",
        attributes: ["departmentPositionId", "positionName", "level"],
        required: false,
      },
    ],
    transaction: options.transaction,
  });
}

export async function updateApprovalRequest(id, data, options = {}) {
  const existing = await scoped(model.approvalRequestModel).findOne({
    where: { id },
    transaction: options.transaction,
  });

  if (!existing) {
    return [0];
  }

  return scoped(model.approvalRequestModel).update(data, {
    where: { id },
    transaction: options.transaction,
  });
}

export async function getUserActivePositionIds(userId, options = {}) {
  const positions = await scoped(model.userDepartmentPositionsModel).findAll({
    attributes: ["departmentPositionId"],
    where: {
      userId,
      status: "ACTIVE",
    },
    transaction: options.transaction,
  });

  return positions.map((p) => p.departmentPositionId);
}

export async function getPendingApprovalsForPositions(positionIds = [], filters = {}, options = {}) {
  if (!positionIds.length) {
    return { count: 0, rows: [] };
  }

  const where = {
    assignedToPositionId: { [Op.in]: positionIds },
    status: filters.status || "pending",
  };

  if (filters.approvalFor) where.approvalFor = filters.approvalFor;
  if (filters.resourceId) where.resourceId = filters.resourceId;

  const include = [
    {
      model: model.userModel,
      as: "requester",
      attributes: ["userId", "fullName", "email"],
      required: false,
    },
    {
      model: model.departmentPositionsModel,
      as: "assignedPosition",
      attributes: ["departmentPositionId", "positionName", "level"],
      required: false,
    },
  ];

  const queryOptions = {
    where,
    include,
    order: [["createdAt", "DESC"]],
    transaction: options.transaction,
  };

  if (options.limit) queryOptions.limit = Number(options.limit);
  if (options.offset) queryOptions.offset = Number(options.offset);

  return scoped(model.approvalRequestModel).findAndCountAll(queryOptions);
}

