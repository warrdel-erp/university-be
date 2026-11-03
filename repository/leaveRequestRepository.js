import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";
import { Op } from "sequelize";

export async function checkOverlappingLeave(userId, startDate, endDate, excludeRequestId = null, options = {}) {
  const where = {
    userId,
    status: { [Op.in]: ["pending", "approved"] },
    startDate: { [Op.lte]: endDate },
    endDate: { [Op.gte]: startDate },
  };

  if (excludeRequestId) {
    where.requestId = { [Op.ne]: excludeRequestId };
  }

  return scoped(model.leaveRequestModel).findOne({
    where,
    attributes: ["requestId", "startDate", "endDate", "status", "totalDays", "reason"],
    transaction: options.transaction,
  });
}

export async function resolveApproverPosition(userId, options = {}) {
  const employee = await scoped(model.employeeModel).findOne({
    where: { userId },
    attributes: ["employeeId", "departmentId"],
    transaction: options.transaction,
  });

  let departmentId = employee?.departmentId;

  if (!departmentId) {
    const userPos = await scoped(model.userDepartmentPositionsModel).findOne({
      where: { userId, status: "ACTIVE" },
      include: [
        {
          model: model.departmentPositionsModel,
          as: "position",
          attributes: ["departmentId"],
        },
      ],
      transaction: options.transaction,
    });
    departmentId = userPos?.position?.departmentId;
  }

  if (departmentId) {
    const headPosition = await scoped(model.departmentPositionsModel).findOne({
      where: {
        departmentId,
        [Op.or]: [{ isLevelHead: true }, { level: 1 }, { isDefault: true }],
      },
      attributes: ["departmentPositionId"],
      order: [
        ["isLevelHead", "DESC"],
        ["level", "ASC"],
      ],
      transaction: options.transaction,
    });
    if (headPosition) {
      return headPosition.departmentPositionId;
    }
  }

  const fallbackPosition = await scoped(model.departmentPositionsModel).findOne({
    where: {
      [Op.or]: [{ isLevelHead: true }, { level: 1 }, { isDefault: true }],
    },
    attributes: ["departmentPositionId"],
    order: [
      ["isLevelHead", "DESC"],
      ["level", "ASC"],
    ],
    transaction: options.transaction,
  });

  return fallbackPosition ? fallbackPosition.departmentPositionId : null;
}

export async function addRequest(data, options = {}) {
  const policy = await scoped(model.leavePolicyModel).findOne({
    attributes: ["policyId"],
    where: { policyId: data.policyId },
    transaction: options.transaction,
  });
  if (!policy) {
    throw new Error("Leave policy not found");
  }

  return scoped(model.leaveRequestModel).create(data, { transaction: options.transaction });
}

export async function getRequests(filters = {}) {
  const businessWhere = filters.userId ? { userId: filters.userId } : {};

  return scoped(model.leaveRequestModel).findAll({
    attributes: { exclude: ["deletedAt"] },
    where: businessWhere,
    include: [
      {
        model: model.leavePolicyModel,
        as: "leaveRequestsPolicy",
        where: buildScope(model.leavePolicyModel),
        required: true,
        attributes: ["policyId", "policyName", "totalLeavesPerYear"],
      },
      {
        model: model.users, as: "user",
        where: buildScope(model.users),
        required: true,
      },
    ],
  });
}

export async function getRequestById(requestId) {
  return scoped(model.leaveRequestModel).findOne({
    where: { requestId },
    attributes: { exclude: ["deletedAt"] },
    include: [
      {
        model: model.leavePolicyModel,
        as: "leaveRequestsPolicy",
        where: buildScope(model.leavePolicyModel),
        required: true,
        attributes: ["policyId", "policyName", "totalLeavesPerYear"],
      },
      {
        model: model.users, as: "user",
        where: buildScope(model.users),
        required: true,
      },
    ],
  });
}

export async function updateRequest(requestId, data, options = {}) {
  const existing = await getRequestById(requestId);
  if (!existing) {
    return [0];
  }

  return scoped(model.leaveRequestModel).update(data, {
    where: { requestId },
    transaction: options.transaction,
  });
}
