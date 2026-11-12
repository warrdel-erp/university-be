import * as model from "../../../models/index.js";
import { buildScope, scoped } from "../../../utility/scoped.js";
import { requestContext } from "../../../utility/requestContext.js";
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

async function isUniversityLogin(user, userId, transaction) {
  if (!user && !userId) return false;

  const resolvedUserId = userId || user?.userId || user?.dataValues?.userId;

  // 1. Direct role check on user or dataValues
  const defaultRole = (
    user?.defaultRole ||
    user?.dataValues?.defaultRole ||
    user?.role ||
    user?.dataValues?.role ||
    ""
  ).toUpperCase();

  if (["CLIENT_ADMIN", "ADMIN", "SYS_CLIENT_ADMIN", "SUPERADMIN"].includes(defaultRole)) {
    return true;
  }

  // 2. Check defaultRoleRef
  const roleRef = user?.defaultRoleRef || user?.dataValues?.defaultRoleRef;
  if (roleRef) {
    const refRole = (roleRef.role || "").toUpperCase();
    const refCode = (roleRef.code || "").toUpperCase();
    const refScope = (roleRef.scope || "").toUpperCase();
    if (
      refScope === "UNIVERSITY" ||
      refCode === "SYS_CLIENT_ADMIN" ||
      ["CLIENT_ADMIN", "ADMIN"].includes(refRole)
    ) {
      return true;
    }
  }

  // 3. Request context check
  const store = requestContext.getStore();
  if (
    store?.defaultRole &&
    ["CLIENT_ADMIN", "ADMIN", "SYS_CLIENT_ADMIN"].includes(String(store.defaultRole).toUpperCase())
  ) {
    return true;
  }

  // 4. Database check for role scope
  if (resolvedUserId) {
    const defaultRoleId = user?.defaultRoleId || user?.dataValues?.defaultRoleId;
    if (defaultRoleId) {
      const role = await model.roleModel.findByPk(defaultRoleId, { transaction });
      if (
        role &&
        (role.scope === "UNIVERSITY" ||
          role.code === "SYS_CLIENT_ADMIN" ||
          ["CLIENT_ADMIN", "ADMIN"].includes(String(role.role).toUpperCase()))
      ) {
        return true;
      }
    }

    const hasUniversityAssignment = await model.userRolePermissionModel.findOne({
      where: { userId: resolvedUserId },
      include: [
        {
          model: model.roleModel,
          as: "userRole",
          where: {
            [Op.or]: [
              { scope: "UNIVERSITY" },
              { code: "SYS_CLIENT_ADMIN" },
              { role: ["CLIENT_ADMIN", "Admin", "admin"] },
            ],
          },
          required: true,
        },
      ],
      transaction,
    });
    if (hasUniversityAssignment) {
      return true;
    }
  }

  return false;
}

export async function getLeavesAssignedToUserPositions(userId, filters = {}, options = {}) {
  const user = options.user;
  const isUniversity = await isUniversityLogin(user, userId, options.transaction);
  const where = {
    approvalFor: "leave",
  };

  const store = requestContext.getStore();
  const universityId =
    filters.universityId ||
    user?.universityId ||
    user?.dataValues?.universityId ||
    store?.universityId;

  if (universityId) {
    where.universityId = universityId;
  }

  if (filters.instituteId) {
    where.instituteId = Number(filters.instituteId);
  }

  if (isUniversity) {
    // If university user is logged in, show leaves across all departments
    if (filters.positionId) {
      where.assignedToPositionId = Number(filters.positionId);
    }
    if (filters.departmentId) {
      where.departmentId = Number(filters.departmentId);
    }
  } else {
    // Normal user: restricted to their active assigned positions
    let positionIds = [];
    if (filters.positionId) {
      positionIds = [Number(filters.positionId)];
    } else if (userId) {
      const positions = await scoped(model.userDepartmentPositionsModel).findAll({
        where: { userId, status: "ACTIVE" },
        attributes: ["departmentPositionId"],
        transaction: options.transaction,
      });
      positionIds = positions.map((p) => p.departmentPositionId);
    }

    if (!positionIds.length) {
      return { count: 0, rows: [] };
    }

    where.assignedToPositionId = { [Op.in]: positionIds };
  }

  if (filters.status && filters.status !== "all") {
    const normalizeStatus = (s) => {
      const lower = String(s).trim().toLowerCase();
      if (lower === "skip") return "skipped";
      return lower;
    };

    if (filters.status.includes(",")) {
      where.status = { [Op.in]: filters.status.split(",").map(normalizeStatus) };
    } else {
      const normalized = normalizeStatus(filters.status);
      where.status = normalized === "skipped" ? { [Op.in]: ["skipped", "skip"] } : normalized;
    }
  }

  const include = [
    {
      model: model.leaveRequestModel,
      as: "leaveRequest",
      required: true,
      include: [
        {
          model: model.leavePolicyModel,
          as: "leaveRequestsPolicy",
          attributes: ["policyId", "policyName", "totalLeavesPerYear"],
          required: false,
        },
        {
          model: model.departmentModel,
          as: "department",
          attributes: ["departmentId", "departmentName"],
          required: false,
        },
      ],
    },
    {
      model: model.userModel,
      as: "requester",
      attributes: ["userId", "userName", "email"],
      required: false,
    },
    {
      model: model.departmentPositionsModel,
      as: "assignedPosition",
      attributes: ["departmentPositionId", "positionName", "level", "departmentId"],
      required: false,
      include: [
        {
          model: model.departmentModel,
          as: "department",
          attributes: ["departmentId", "departmentName"],
          required: false,
        },
      ],
    },
    {
      model: model.departmentModel,
      as: "department",
      attributes: ["departmentId", "departmentName"],
      required: false,
    },
    {
      model: model.userModel,
      as: "approvedBy",
      attributes: ["userId", "userName", "email"],
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

  const targetModel = isUniversity ? model.approvalRequestModel : scoped(model.approvalRequestModel);
  return targetModel.findAndCountAll(queryOptions);
}
