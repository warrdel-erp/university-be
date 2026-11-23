import { Op } from "sequelize";
import "../models/index.js";
import attendancePolicyModel from "../models/attendancePolicyModel.js";
import attendancePolicyWorkingHoursModel from "../models/attendancePolicyWorkingHoursModel.js";
import attendancePolicyLateEarlyRuleModel from "../models/attendancePolicyLateEarlyRuleModel.js";
import attendancePolicyPenaltySlabModel from "../models/attendancePolicyPenaltySlabModel.js";
import attendancePolicyMappingModel from "../models/attendancePolicyMappingModel.js";
import role from "../models/roleModel.js";
import department from "../models/departmentModel.js";
import employee from "../models/employeeModel.js";
import userModel from "../models/userModel.js";

/**
 * Standard includes for fetching complete policy details
 */
export function getFullPolicyIncludes() {
  return [
    {
      model: attendancePolicyWorkingHoursModel,
      as: "workingHours",
      required: false,
    },
    {
      model: attendancePolicyLateEarlyRuleModel,
      as: "lateEarlyRules",
      required: false,
    },
    {
      model: attendancePolicyPenaltySlabModel,
      as: "penaltySlabs",
      required: false,
    },
    {
      model: attendancePolicyMappingModel,
      as: "mappings",
      required: false,
      include: [
        {
          model: role,
          as: "role",
          attributes: ["roleId", "role", "code"],
          required: false,
        },
        {
          model: department,
          as: "department",
          attributes: ["departmentId", "departmentName", "departmentCode"],
          required: false,
        },
        {
          model: employee,
          as: "employee",
          attributes: ["employeeId", "userId"],
          required: false,
          include: [
            {
              model: userModel,
              as: "user",
              attributes: ["userId", "userName", "email"],
              required: false,
            },
          ],
        },
      ],
    },
  ];
}

export async function createPolicy(data, transaction = null) {
  return await attendancePolicyModel.create(data, { transaction });
}

export async function updatePolicy(policyId, data, transaction = null) {
  const [affectedCount] = await attendancePolicyModel.update(data, {
    where: { policyId },
    transaction,
  });
  return affectedCount;
}

export async function findPolicyById(policyId, options = {}) {
  const { transaction, includeRelations = true } = options;
  return await attendancePolicyModel.findByPk(policyId, {
    include: includeRelations ? getFullPolicyIncludes() : [],
    transaction,
  });
}

export async function findPolicies({ where = {}, limit = 10, offset = 0, order = [["created_at", "DESC"]] }) {
  return await attendancePolicyModel.findAndCountAll({
    where,
    limit,
    offset,
    order,
    distinct: true,
    include: [
      {
        model: attendancePolicyMappingModel,
        as: "mappings",
        required: false,
        include: [
          {
            model: role,
            as: "role",
            attributes: ["roleId", "role", "code"],
            required: false,
          },
        ],
      },
    ],
  });
}

export async function upsertWorkingHours(policyId, data, transaction = null) {
  const existing = await attendancePolicyWorkingHoursModel.findOne({
    where: { policyId },
    transaction,
  });

  const payload = { ...data, policyId };
  delete payload.policy_id;

  if (existing) {
    return await existing.update(payload, { transaction });
  } else {
    return await attendancePolicyWorkingHoursModel.create(payload, { transaction });
  }
}

export async function upsertLateEarlyRules(policyId, data, transaction = null) {
  const existing = await attendancePolicyLateEarlyRuleModel.findOne({
    where: { policyId },
    transaction,
  });

  const payload = { ...data, policyId };
  delete payload.policy_id;

  if (existing) {
    return await existing.update(payload, { transaction });
  } else {
    return await attendancePolicyLateEarlyRuleModel.create(payload, { transaction });
  }
}

export async function replacePenaltySlabs(policyId, slabs = [], transaction = null) {
  await attendancePolicyPenaltySlabModel.destroy({
    where: { policyId },
    force: true,
    transaction,
  });

  if (slabs && slabs.length > 0) {
    const formatted = slabs.map((s) => ({
      policyId,
      violationType: s.violationType,
      fromOccurrence: s.fromOccurrence,
      toOccurrence: s.toOccurrence ?? null,
      attendanceImpact: s.attendanceImpact || "NO_IMPACT",
      penaltyApplication: s.penaltyApplication || "AT_THRESHOLD",
    }));
    return await attendancePolicyPenaltySlabModel.bulkCreate(formatted, { transaction });
  }
  return [];
}

export async function replaceMappings(policyId, mappings = [], userId, transaction = null) {
  await attendancePolicyMappingModel.destroy({
    where: { policyId },
    force: true,
    transaction,
  });

  if (mappings && mappings.length > 0) {
    const formatted = mappings.map((m) => ({
      policyId,
      roleId: m.roleId || null,
      departmentId: m.departmentId || null,
      employeeId: m.employeeId || null,
      createdBy: userId,
      isActive: true,
    }));
    return await attendancePolicyMappingModel.bulkCreate(formatted, { transaction });
  }
  return [];
}

export async function getPolicyMetrics(filter = {}) {
  const totalPolicies = await attendancePolicyModel.count({
    where: filter,
  });

  const activePolicies = await attendancePolicyModel.count({
    where: {
      ...filter,
      status: "Active",
    },
  });

  // Calculate distinct employees covered across active policies
  const activePolicyRows = await attendancePolicyModel.findAll({
    where: { ...filter, status: "Active" },
    attributes: ["policyId"],
    include: [
      {
        model: attendancePolicyMappingModel,
        as: "mappings",
        required: true,
        attributes: ["roleId", "departmentId", "employeeId"],
      },
    ],
  });

  let uniqueEmployees = 0;
  // If policies have direct employee mappings or role mappings:
  const roleIds = new Set();
  const directEmployeeIds = new Set();

  for (const pol of activePolicyRows) {
    for (const m of pol.mappings || []) {
      if (m.employeeId) directEmployeeIds.add(m.employeeId);
      if (m.roleId) roleIds.add(m.roleId);
    }
  }

  if (roleIds.size > 0 || directEmployeeIds.size > 0) {
    const whereEmp = {
      [Op.or]: [],
    };
    if (roleIds.size > 0) {
      whereEmp[Op.or].push({ roleId: Array.from(roleIds) });
    }
    if (directEmployeeIds.size > 0) {
      whereEmp[Op.or].push({ employeeId: Array.from(directEmployeeIds) });
    }
    if (filter.instituteId) {
      whereEmp.instituteId = filter.instituteId;
    }
    uniqueEmployees = await employee.count({
      where: whereEmp,
      distinct: true,
      col: "employee_id",
    });
  }

  return {
    totalPolicies,
    activePolicies,
    employeesCovered: uniqueEmployees,
  };
}

export async function deletePolicy(policyId, transaction = null) {
  return await attendancePolicyModel.destroy({
    where: { policyId },
    transaction,
  });
}
