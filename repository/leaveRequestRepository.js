import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";
import { Op } from "sequelize";

export async function addRequest(data, options = {}) {
  const employee = await scoped(model.employeeModel).findOne({
    attributes: ["userId"],
    where: { userId: data.userId },
    transaction: options.transaction,
  });
  if (!employee) {
    throw new Error("Employee not found");
  }

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
  const { page, limit, search, userId } = filters;
  const businessWhere = userId ? { userId } : {};

  const userWhere = {
    ...buildScope(model.employeeModel),
  };

  if (search && String(search).trim()) {
    const searchTerm = `%${String(search).trim()}%`;
    userWhere[Op.or] = [
      { employeeName: { [Op.like]: searchTerm } },
      { employeeCode: { [Op.like]: searchTerm } },
    ];
  }

  const includeArray = [
    {
      model: model.leavePolicyModel,
      as: "leaveRequestsPolicy",
      where: buildScope(model.leavePolicyModel),
      required: true,
      attributes: ["policyId", "policyName", "totalLeavesPerYear"],
    },
    {
      model: model.users,
      as: "user",
      where: userWhere,
      required: true,
    },
  ];

  if (page && limit) {
    const parsedPage = parseInt(page, 10) || 1;
    const parsedLimit = parseInt(limit, 10) || 10;
    const offset = (parsedPage - 1) * parsedLimit;

    const { count, rows } = await scoped(model.leaveRequestModel).findAndCountAll({
      attributes: { exclude: ["deletedAt"] },
      where: businessWhere,
      include: includeArray,
      offset,
      limit: parsedLimit,
      subQuery: false,
      order: [["requestId", "DESC"]],
    });

    return {
      rows,
      total: count,
      page: parsedPage,
      limit: parsedLimit,
    };
  } else {
    const rows = await scoped(model.leaveRequestModel).findAll({
      attributes: { exclude: ["deletedAt"] },
      where: businessWhere,
      include: includeArray,
      order: [["requestId", "DESC"]],
    });

    return {
      rows,
      total: rows.length,
      page: 1,
      limit: rows.length || 10,
    };
  }
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
        where: buildScope(model.employeeModel),
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
