import * as model from "../../../models/index.js";
import { scoped } from "../../../utility/scoped.js";
import sequelize from "../../../database/sequelizeConfig.js";
import { Op } from "sequelize";

export async function addPolicy(data) {
  return scoped(model.leavePolicyModel).create(data);
}

/**
 * Creates a complete Leave Policy with its Entitlements (leave types)
 * and Role Assignments (including selected employees).
 */
export async function createFullPolicy({ policyData, entitlements = [], roleAssignments = [] }) {
  return sequelize.transaction(async (t) => {
    // 1. Create main Leave Policy
    const policy = await scoped(model.leavePolicyModel).create(policyData, { transaction: t });
    const policyId = policy.policyId || policy.dataValues?.policyId;

    // 2. Create Entitlements (Leave Types: CL, SL, EL)
    let createdEntitlements = [];
    if (entitlements && entitlements.length > 0) {
      const entitlementRecords = entitlements.map((ent) => ({
        ...ent,
        policyId,
      }));
      createdEntitlements = await model.leavePolicyEntitlementModel.bulkCreate(entitlementRecords, {
        transaction: t,
        validate: true,
      });
    }

    // 3. Create Role Assignments
    const createdRoleAssignments = [];
    if (roleAssignments && roleAssignments.length > 0) {
      for (const ra of roleAssignments) {
        const roleRecord = await model.leavePolicyRoleModel.create(
          {
            policyId,
            roleId: ra.roleId,
            assignmentMode: ra.assignmentMode || "ALL",
            effectiveFrom: ra.effectiveFrom || policyData.effectiveFrom || new Date(),
            effectiveTo: ra.effectiveTo || policyData.effectiveTo || null,
            universityId: policyData.universityId || policy.universityId,
            instituteId: policyData.instituteId || policy.instituteId,
            campusId: policyData.campusId || policy.campusId,
          },
          { transaction: t }
        );

        const policyRoleId = roleRecord.id || roleRecord.dataValues?.id;
        let createdEmployees = [];

        // If SELECTED mode, insert specific employees
        if (
          (ra.assignmentMode === "SELECTED" || ra.assignment_mode === "SELECTED") &&
          Array.isArray(ra.selectedUserIds) &&
          ra.selectedUserIds.length > 0
        ) {
          const empRecords = ra.selectedUserIds.map((userId) => ({
            policyRoleId,
            userId,
            isActive: true,
          }));
          createdEmployees = await model.leavePolicyEmployeeModel.bulkCreate(empRecords, {
            transaction: t,
          });
        }

        createdRoleAssignments.push({
          ...roleRecord.toJSON ? roleRecord.toJSON() : roleRecord,
          selectedEmployees: createdEmployees,
        });
      }
    }

    // 4. Reload full policy with associations
    return getPolicyById(policyId, { transaction: t });
  });
}

export async function getPolicies(filters = {}) {
  const { roleId, userId, status, isActive, ignoreEmployeeFilter } = filters;

  const policyWhere = {};
  if (status) policyWhere.status = status;
  if (typeof isActive === "boolean") policyWhere.isActive = isActive;

  const roleInclude = {
    model: model.leavePolicyRoleModel,
    as: "roleAssignments",
    where: { deletedAt: null },
    required: false,
    include: [
      {
        model: model.roleModel,
        as: "role",
        attributes: ["roleId", "role", "code", "scope"],
      },
      {
        model: model.leavePolicyEmployeeModel,
        as: "selectedEmployees",
        where: { deletedAt: null, isActive: true },
        required: false,
        attributes: ["id", "userId", "isActive"],
      },
    ],
  };

  if (roleId) {
    roleInclude.required = true; // INNER JOIN to return only policies assigned to this role

    if (userId && !ignoreEmployeeFilter) {
      // Hybrid condition:
      // role_id = roleId AND (assignmentMode = 'ALL' OR (assignmentMode = 'SELECTED' AND selected user exists))
      roleInclude.where = {
        deletedAt: null,
        roleId,
        [Op.or]: [
          { assignmentMode: "ALL" },
          sequelize.literal(
            `EXISTS (
              SELECT 1 FROM leave_policy_employees lpe
              WHERE lpe.policy_role_id = \`roleAssignments\`.\`id\`
                AND lpe.user_id = ${sequelize.escape(userId)}
                AND lpe.is_active = 1
                AND lpe.deleted_at IS NULL
            )`
          ),
        ],
      };
    } else {
      // Filter by roleId only (shows all policies assigned to this role)
      roleInclude.where = {
        deletedAt: null,
        roleId,
      };
    }
  }

  return scoped(model.leavePolicyModel).findAll({
    where: policyWhere,
    attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] },
    include: [
      {
        model: model.leavePolicyEntitlementModel,
        as: "entitlements",
        attributes: [
          "entitlementId",
          "leaveType",
          "leaveCode",
          "entitlementAnnual",
          "creditMethod",
          "carryForward",
          "maxCarryForwardDays",
          "maximumConsecutiveDays",
          "keyRules",
          "status",
        ],
      },
      roleInclude,
    ],
    order: [["createdAt", "DESC"]],
  });
}

export async function getActivePolicies(filters = {}) {
  return getPolicies({ ...filters, isActive: true });
}

export async function getPolicyById(policyId, options = {}) {
  return scoped(model.leavePolicyModel).findOne({
    where: { policyId },
    attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] },
    include: [
      {
        model: model.leavePolicyEntitlementModel,
        as: "entitlements",
      },
      {
        model: model.leavePolicyRoleModel,
        as: "roleAssignments",
        include: [
          {
            model: model.roleModel,
            as: "role",
            attributes: ["roleId", "role", "code", "scope"],
          },
          {
            model: model.leavePolicyEmployeeModel,
            as: "selectedEmployees",
            include: [
              {
                model: model.userModel,
                as: "user",
                attributes: ["userId", "userName", "email"],
              },
            ],
          },
        ],
      },
    ],
    ...options,
  });
}

export async function updatePolicy(policyId, data) {
  const existing = await scoped(model.leavePolicyModel).findOne({
    attributes: ["policyId"],
    where: { policyId },
  });
  if (!existing) {
    return [0];
  }

  return scoped(model.leavePolicyModel).update(data, {
    where: { policyId },
  });
}

export async function deletePolicy(policyId) {
  const existing = await scoped(model.leavePolicyModel).findOne({
    attributes: ["policyId"],
    where: { policyId },
  });
  if (!existing) {
    return false;
  }

  const deleted = await scoped(model.leavePolicyModel).destroy({
    where: { policyId },
  });
  return deleted > 0;
}

/**
 * Returns roles with employee count and their current leave policy assignment.
 * Powers the "ROLE ASSIGNMENT" table in the UI.
 */
export async function getRolesSummary({ instituteId, universityId }) {
  // 1. Get all active roles
  const roles = await model.roleModel.findAll({
    where: { deletedAt: null },
    attributes: ["roleId", "role", "code", "scope"],
    order: [["role", "ASC"]],
  });

  // 2. Get active policy role mappings with parent policy details
  const activeAssignments = await model.leavePolicyRoleModel.findAll({
    where: { deletedAt: null },
    include: [
      {
        model: model.leavePolicyModel,
        as: "policy",
        where: { deletedAt: null },
        attributes: ["policyId", "policyName", "policyCode", "status", "effectiveFrom"],
      },
      {
        model: model.leavePolicyEmployeeModel,
        as: "selectedEmployees",
        where: { deletedAt: null, isActive: true },
        required: false,
        attributes: ["userId"],
      },
    ],
  });

  // 3. For each role, calculate total employees and assignment summary
  const summary = [];
  for (const r of roles) {
    const roleId = r.roleId;

    // Count distinct users holding this role within university and institute scope
    const [userCountResult] = await sequelize.query(`
      SELECT COUNT(DISTINCT u.user_id) as count
      FROM (
        SELECT user_id FROM user_role_permission_scope WHERE role_id = ${roleId}
        UNION
        SELECT user_id FROM employee WHERE role_id = ${roleId}
        UNION
        SELECT user_id FROM users WHERE default_role_id = ${roleId}
      ) u
      JOIN users usr ON usr.user_id = u.user_id AND usr.deleted_at IS NULL
      LEFT JOIN employee emp ON emp.user_id = u.user_id AND emp.deleted_at IS NULL
      WHERE 1=1
        ${instituteId ? `AND COALESCE(emp.institute_id, usr.default_institute_id) = ${sequelize.escape(instituteId)}` : ""}
        ${universityId ? `AND COALESCE(emp.university_id, usr.university_id) = ${sequelize.escape(universityId)}` : ""}
    `);
    const totalEmployees = parseInt(userCountResult[0]?.count || 0, 10);

    // Find assignment for this role
    const assignment = activeAssignments.find((a) => a.roleId === roleId);

    let currentSummary = "Not Assigned";
    let assignmentMode = null;
    let selectedCount = 0;
    let assignedPolicy = null;
    let effectiveFrom = null;

    if (assignment && assignment.policy) {
      assignedPolicy = {
        policyId: assignment.policy.policyId,
        policyName: assignment.policy.policyName,
        policyCode: assignment.policy.policyCode,
      };
      assignmentMode = assignment.assignmentMode;
      effectiveFrom = assignment.effectiveFrom;

      if (assignment.assignmentMode === "ALL") {
        selectedCount = totalEmployees;
        currentSummary = `All on ${assignment.policy.policyName}`;
      } else {
        selectedCount = (assignment.selectedEmployees || []).length;
        currentSummary = `${selectedCount} on ${assignment.policy.policyName}`;
      }
    }

    summary.push({
      roleId: r.roleId,
      roleName: r.role,
      roleCode: r.code,
      scope: r.scope,
      totalEmployees,
      assignmentSummary: currentSummary,
      assignmentMode,
      selectedCount,
      effectiveFrom,
      assignedPolicy,
    });
  }

  return summary;
}

/**
 * Returns employees belonging to a specific role, along with their current policy.
 * Powers the "Select Employees" side drawer in the UI.
 */
export async function getRoleEmployees(roleId, { search, policyId, instituteId, universityId } = {}) {
  // 1. Fetch all distinct users belonging to this role within tenant scope
  let searchQuery = "";
  if (search) {
    const escaped = sequelize.escape(`%${search}%`);
    searchQuery = ` AND (u.user_name LIKE ${escaped} OR u.email LIKE ${escaped} OR e.employee_Code LIKE ${escaped} OR e.employee_name LIKE ${escaped})`;
  }

  const [users] = await sequelize.query(`
    SELECT DISTINCT
      u.user_id as userId,
      u.user_name as userName,
      u.email as email,
      u.status as userStatus,
      e.employee_id as employeeId,
      e.employee_Code as employeeCode,
      e.employee_name as employeeName
    FROM users u
    LEFT JOIN employee e ON e.user_id = u.user_id AND e.deleted_at IS NULL
    WHERE u.deleted_at IS NULL
      AND (
        u.user_id IN (SELECT user_id FROM user_role_permission_scope WHERE role_id = ${roleId})
        OR e.role_id = ${roleId}
        OR u.default_role_id = ${roleId}
      )
      ${instituteId ? `AND COALESCE(e.institute_id, u.default_institute_id) = ${sequelize.escape(instituteId)}` : ""}
      ${universityId ? `AND COALESCE(e.university_id, u.university_id) = ${sequelize.escape(universityId)}` : ""}
      ${searchQuery}
    ORDER BY COALESCE(e.employee_name, u.user_name) ASC
  `);

  // 2. Fetch current policy assignments for these users
  const [assignedUsers] = await sequelize.query(`
    SELECT
      lpe.user_id as userId,
      lp.policy_id as policyId,
      lp.policy_name as policyName,
      lp.policy_code as policyCode
    FROM leave_policy_employees lpe
    JOIN leave_policy_roles lpr ON lpr.id = lpe.policy_role_id
    JOIN leave_policies lp ON lp.policy_id = lpr.policy_id
    WHERE lpe.is_active = 1
      AND lpe.deleted_at IS NULL
      AND lp.deleted_at IS NULL
  `);

  const userPolicyMap = new Map();
  for (const au of assignedUsers) {
    userPolicyMap.set(au.userId, au);
  }

  // 3. Format employee items and calculate counts
  let selectedCount = 0;
  let onOtherPoliciesCount = 0;

  const currentPolicyId = policyId ? parseInt(policyId, 10) : null;

  const employees = users.map((u) => {
    const currentAssignment = userPolicyMap.get(u.userId);
    const isSelected = currentPolicyId && currentAssignment?.policyId === currentPolicyId;

    if (isSelected) {
      selectedCount++;
    } else if (currentAssignment && currentAssignment.policyId !== currentPolicyId) {
      onOtherPoliciesCount++;
    }

    return {
      userId: u.userId,
      employeeId: u.employeeId,
      employeeCode: u.employeeCode || `EMP-${String(u.userId).padStart(4, "0")}`,
      name: u.employeeName || u.userName || "Unnamed Employee",
      email: u.email,
      status: u.userStatus || "Active",
      currentPolicy: currentAssignment
        ? {
            policyId: currentAssignment.policyId,
            policyName: currentAssignment.policyName,
            policyCode: currentAssignment.policyCode,
          }
        : null,
      isSelected: !!isSelected,
    };
  });

  return {
    roleId: parseInt(roleId, 10),
    totalEmployees: employees.length,
    selectedCount,
    onOtherPoliciesCount,
    employees,
  };
}
