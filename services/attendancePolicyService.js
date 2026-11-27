import { Op } from "sequelize";
import sequelize from "../database/sequelizeConfig.js";
import * as policyRepo from "../repository/attendancePolicyRepository.js";
import employee from "../models/employeeModel.js";

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function getUserContext(user) {
  const userId = user?.dataValues?.userId || user?.userId || 1;
  const instituteId =
    user?.dataValues?.defaultInstituteId ||
    user?.dataValues?.instituteId ||
    user?.instituteId ||
    user?.defaultInstituteId ||
    1;
  const universityId =
    user?.dataValues?.universityId || user?.universityId || 1;
  const campusId = user?.dataValues?.campusId || user?.campusId || null;

  return { userId, instituteId, universityId, campusId };
}

/**
 * Helper to auto-generate a unique policy code within an institute
 */
export async function generateUniquePolicyCode({ baseCode, universityId, instituteId, transaction = null }) {
  if (!baseCode || !String(baseCode).trim()) return null;
  const cleanBase = String(baseCode).trim();
  let candidate = cleanBase;
  let counter = 1;

  while (true) {
    const existing = await policyRepo.findPolicyByCode(candidate, {
      universityId,
      instituteId,
      transaction,
      paranoid: false,
    });
    if (!existing) {
      return candidate;
    }
    candidate = `${cleanBase}-${counter}`;
    counter++;
  }
}

/**
 * Step 1: Save General & Applicability Mappings
 */
export async function saveStep1(payload, user) {
  const { userId, instituteId, universityId, campusId } = getUserContext(user);
  const {
    policyId,
    policyName,
    policyCode,
    description,
    versionNumber = "v1.0",
    effectiveFrom,
    effectiveTo,
    applicableSchedule = "General Shift",
    mappings = [],
  } = payload;

  if (!policyName || !policyName.trim()) {
    throw httpError("Policy name is required", 422);
  }

  const trimmedCode = policyCode && typeof policyCode === "string" ? policyCode.trim() : null;

  return await sequelize.transaction(async (t) => {
    if (trimmedCode) {
      const duplicate = await policyRepo.findPolicyByCode(trimmedCode, {
        universityId,
        instituteId,
        excludePolicyId: policyId || null,
        transaction: t,
        paranoid: false,
      });
      if (duplicate) {
        throw httpError(`Policy code '${trimmedCode}' already exists for this institute`, 409);
      }
    }

    let policy;
    if (policyId) {
      policy = await policyRepo.findPolicyById(policyId, { transaction: t, includeRelations: false });
      if (!policy) {
        throw httpError("Policy not found", 404);
      }

      await policyRepo.updatePolicy(
        policyId,
        {
          policyName: policyName.trim(),
          policyCode: trimmedCode,
          description: description || null,
          versionNumber,
          effectiveFrom: effectiveFrom || null,
          effectiveTo: effectiveTo || null,
          applicableSchedule,
          updatedBy: userId,
        },
        t
      );
    } else {
      policy = await policyRepo.createPolicy(
        {
          universityId,
          instituteId,
          campusId,
          policyName: policyName.trim(),
          policyCode: trimmedCode,
          description: description || null,
          versionNumber,
          status: "Draft",
          effectiveFrom: effectiveFrom || null,
          effectiveTo: effectiveTo || null,
          applicableSchedule,
          isActive: true,
          createdBy: userId,
          updatedBy: userId,
        },
        t
      );
    }

    const currentPolicyId = policyId || policy.policyId;

    if (Array.isArray(mappings)) {
      await policyRepo.replaceMappings(currentPolicyId, mappings, userId, t);
    }

    return await policyRepo.findPolicyById(currentPolicyId, { transaction: t });
  });
}

/**
 * Step 2: Save Working Hours & Regularisation Configuration
 */
export async function saveStep2(policyId, payload, user) {
  const { userId } = getUserContext(user);
  const policy = await policyRepo.findPolicyById(policyId, { includeRelations: false });
  if (!policy) {
    throw httpError("Policy not found", 404);
  }

  const {
    minFullDayMinutes = 450,
    minHalfDayMinutes = 240,
    considerBreakTime = false,
    missingPunchAction = "PENDING_REVIEW",
    autoMarkAbsentAfterDays = 3,
    countFullDayOdAsPresent = true,
    countHalfDayOdAsPresent = true,
    requireOdApproval = true,
    allowRegularisation = true,
    regularisationWindowDays = 7,
  } = payload;

  if (Number(minHalfDayMinutes) >= Number(minFullDayMinutes)) {
    throw httpError("Minimum hours for half day must be less than full day", 422);
  }

  return await sequelize.transaction(async (t) => {
    const workingHours = await policyRepo.upsertWorkingHours(
      policyId,
      {
        minFullDayMinutes,
        minHalfDayMinutes,
        considerBreakTime: Boolean(considerBreakTime),
        missingPunchAction,
        autoMarkAbsentAfterDays,
        countFullDayOdAsPresent: Boolean(countFullDayOdAsPresent),
        countHalfDayOdAsPresent: Boolean(countHalfDayOdAsPresent),
        requireOdApproval: Boolean(requireOdApproval),
        allowRegularisation: Boolean(allowRegularisation),
        regularisationWindowDays,
      },
      t
    );

    await policyRepo.updatePolicy(policyId, { updatedBy: userId }, t);
    return workingHours;
  });
}

/**
 * Step 3: Save Late Entry, Early Exit & Penalty Slabs
 */
export async function saveStep3(policyId, payload, user) {
  const { userId } = getUserContext(user);
  const policy = await policyRepo.findPolicyById(policyId, { includeRelations: false });
  if (!policy) {
    throw httpError("Policy not found", 404);
  }

  const {
    enableLateEntry = true,
    lateGracePeriodMinutes = 10,
    lateCountCycle = "CALENDAR_MONTH",
    enableEarlyExit = true,
    earlyGracePeriodMinutes = 10,
    earlyCountCycle = "CALENDAR_MONTH",
    violationCountingType = "SEPARATE",
    enableExcessiveViolation = false,
    excessiveLateThresholdMin = 120,
    excessiveLatePenalty = "HALF_DAY",
    excessiveEarlyThresholdMin = 120,
    excessiveEarlyPenalty = "HALF_DAY",
    excludeApprovedExceptions = true,
    maxDailyPenaltyDays = 1.00,
    penaltySlabs = [],
  } = payload;

  return await sequelize.transaction(async (t) => {
    const rules = await policyRepo.upsertLateEarlyRules(
      policyId,
      {
        enableLateEntry: Boolean(enableLateEntry),
        lateGracePeriodMinutes,
        lateCountCycle,
        enableEarlyExit: Boolean(enableEarlyExit),
        earlyGracePeriodMinutes,
        earlyCountCycle,
        violationCountingType,
        enableExcessiveViolation: Boolean(enableExcessiveViolation),
        excessiveLateThresholdMin,
        excessiveLatePenalty,
        excessiveEarlyThresholdMin,
        excessiveEarlyPenalty,
        excludeApprovedExceptions: Boolean(excludeApprovedExceptions),
        maxDailyPenaltyDays,
      },
      t
    );

    if (Array.isArray(penaltySlabs)) {
      await policyRepo.replacePenaltySlabs(policyId, penaltySlabs, t);
    }

    await policyRepo.updatePolicy(policyId, { updatedBy: userId }, t);

    return {
      rules,
      slabs: await policyRepo.findPolicyById(policyId, { transaction: t }),
    };
  });
}

/**
 * Step 4: Publish Policy
 */
export async function publishPolicy(policyId, user) {
  const { userId } = getUserContext(user);
  const policy = await policyRepo.findPolicyById(policyId);
  if (!policy) {
    throw httpError("Policy not found", 404);
  }

  if (!policy.workingHours) {
    throw httpError("Cannot publish policy without configuring working hours (Step 2)", 422);
  }

  if (!policy.lateEarlyRules) {
    throw httpError("Cannot publish policy without configuring late entry & early exit rules (Step 3)", 422);
  }

  await policyRepo.updatePolicy(policyId, {
    status: "Active",
    updatedBy: userId,
  });

  return await policyRepo.findPolicyById(policyId);
}

/**
 * Fetch Single Policy by ID
 */
export async function getSinglePolicy(policyId) {
  const policy = await policyRepo.findPolicyById(policyId);
  if (!policy) {
    throw httpError("Attendance policy not found", 404);
  }
  return policy;
}

/**
 * Fetch Policies List with Filters & Pagination
 */
export async function getPolicies(query, user) {
  const { instituteId } = getUserContext(user);
  const {
    search,
    status,
    roleId,
    page = 1,
    limit = 10,
    sortBy = "created_at",
    sortOrder = "DESC",
  } = query;

  const where = {
    instituteId,
  };

  if (status && status !== "All") {
    where.status = status;
  }

  if (search && search.trim()) {
    where.policyName = {
      [Op.like]: `%${search.trim()}%`,
    };
  }

  const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

  const { rows, count } = await policyRepo.findPolicies({
    where,
    limit: Number(limit),
    offset,
    order: [[sortBy, sortOrder.toUpperCase()]],
  });

  // Calculate mapped employee counts for each policy row
  const items = await Promise.all(
    rows.map(async (row) => {
      const p = row.toJSON();
      const applicableTo = [];
      const roleIds = [];
      const employeeIds = [];

      for (const m of p.mappings || []) {
        if (m.role?.role) {
          applicableTo.push(m.role.role);
          roleIds.push(m.roleId);
        }
        if (m.employeeId) {
          employeeIds.push(m.employeeId);
        }
      }

      let employeesCount = 0;
      if (roleIds.length > 0 || employeeIds.length > 0) {
        const empWhere = {
          instituteId,
          [Op.or]: [],
        };
        if (roleIds.length > 0) empWhere[Op.or].push({ roleId: roleIds });
        if (employeeIds.length > 0) empWhere[Op.or].push({ employeeId: employeeIds });

        employeesCount = await employee.count({
          where: empWhere,
          distinct: true,
          col: "employee_id",
        });
      }

      return {
        policyId: p.policyId,
        policyName: p.policyName,
        policyCode: p.policyCode,
        versionNumber: p.versionNumber,
        status: p.status,
        effectiveFrom: p.effectiveFrom,
        effectiveTo: p.effectiveTo,
        applicableSchedule: p.applicableSchedule,
        applicableTo: Array.from(new Set(applicableTo)),
        employeesCount,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    })
  );

  return {
    items,
    pagination: {
      total: count,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(count / Number(limit)),
    },
  };
}

/**
 * Top Metrics
 */
export async function getMetrics(user) {
  const { instituteId } = getUserContext(user);
  return await policyRepo.getPolicyMetrics({ instituteId });
}

/**
 * Duplicate Policy
 */
export async function duplicatePolicy(policyId, payload, user) {
  const { userId, instituteId, universityId, campusId } = getUserContext(user);
  const existing = await policyRepo.findPolicyById(policyId);
  if (!existing) {
    throw httpError("Policy not found", 404);
  }

  const newName = payload.newPolicyName || `${existing.policyName} (Copy)`;

  return await sequelize.transaction(async (t) => {
    let newPolicyCode = payload.newPolicyCode && typeof payload.newPolicyCode === "string"
      ? payload.newPolicyCode.trim()
      : null;

    if (newPolicyCode) {
      const duplicate = await policyRepo.findPolicyByCode(newPolicyCode, {
        universityId,
        instituteId,
        transaction: t,
        paranoid: false,
      });
      if (duplicate) {
        throw httpError(`Policy code '${newPolicyCode}' already exists for this institute`, 409);
      }
    } else if (existing.policyCode) {
      const cleanBase = existing.policyCode.replace(/(-COPY(-\d+)?)+$/i, "");
      newPolicyCode = await generateUniquePolicyCode({
        baseCode: `${cleanBase}-COPY`,
        universityId,
        instituteId,
        transaction: t,
      });
    }

    const newPolicy = await policyRepo.createPolicy(
      {
        universityId,
        instituteId,
        campusId,
        policyName: newName,
        policyCode: newPolicyCode,
        description: existing.description,
        versionNumber: "v1.0",
        status: "Draft",
        effectiveFrom: null,
        effectiveTo: null,
        applicableSchedule: existing.applicableSchedule,
        isActive: true,
        createdBy: userId,
        updatedBy: userId,
      },
      t
    );

    const newPolicyId = newPolicy.policyId;

    // Duplicate Working Hours
    if (existing.workingHours) {
      const wh = existing.workingHours.toJSON();
      delete wh.id;
      delete wh.policyId;
      delete wh.policy_id;
      delete wh.createdAt;
      delete wh.updatedAt;
      delete wh.deletedAt;
      await policyRepo.upsertWorkingHours(newPolicyId, wh, t);
    }

    // Duplicate Late/Early Rules
    if (existing.lateEarlyRules) {
      const ler = existing.lateEarlyRules.toJSON();
      delete ler.id;
      delete ler.policyId;
      delete ler.policy_id;
      delete ler.createdAt;
      delete ler.updatedAt;
      delete ler.deletedAt;
      await policyRepo.upsertLateEarlyRules(newPolicyId, ler, t);
    }

    // Duplicate Penalty Slabs
    if (existing.penaltySlabs && existing.penaltySlabs.length > 0) {
      const slabs = existing.penaltySlabs.map((s) => ({
        violationType: s.violationType,
        fromOccurrence: s.fromOccurrence,
        toOccurrence: s.toOccurrence,
        attendanceImpact: s.attendanceImpact,
        penaltyApplication: s.penaltyApplication,
      }));
      await policyRepo.replacePenaltySlabs(newPolicyId, slabs, t);
    }

    // Duplicate Mappings
    if (existing.mappings && existing.mappings.length > 0) {
      const mappings = existing.mappings.map((m) => ({
        roleId: m.roleId,
        departmentId: m.departmentId,
        employeeId: m.employeeId,
      }));
      await policyRepo.replaceMappings(newPolicyId, mappings, userId, t);
    }

    return await policyRepo.findPolicyById(newPolicyId, { transaction: t });
  });
}

/**
 * Create New Version
 */
export async function createNewVersion(policyId, payload, user) {
  const { userId, instituteId, universityId, campusId } = getUserContext(user);
  const existing = await policyRepo.findPolicyById(policyId);
  if (!existing) {
    throw httpError("Policy not found", 404);
  }

  const versionNumber = payload.versionNumber || "v2.0";
  const effectiveFrom = payload.effectiveFrom || null;

  return await sequelize.transaction(async (t) => {
    let versionPolicyCode = payload.policyCode && typeof payload.policyCode === "string"
      ? payload.policyCode.trim()
      : null;

    if (versionPolicyCode) {
      const duplicate = await policyRepo.findPolicyByCode(versionPolicyCode, {
        universityId,
        instituteId,
        transaction: t,
        paranoid: false,
      });
      if (duplicate) {
        throw httpError(`Policy code '${versionPolicyCode}' already exists for this institute`, 409);
      }
    } else if (existing.policyCode) {
      const vSuffix = versionNumber.toUpperCase().replace(/^V/, "V");
      const cleanBase = existing.policyCode.replace(/(-V\d+(\.\d+)?)+$/i, "");
      versionPolicyCode = await generateUniquePolicyCode({
        baseCode: `${cleanBase}-${vSuffix}`,
        universityId,
        instituteId,
        transaction: t,
      });
    }

    const newPolicy = await policyRepo.createPolicy(
      {
        universityId,
        instituteId,
        campusId,
        policyName: existing.policyName,
        policyCode: versionPolicyCode,
        description: existing.description,
        versionNumber,
        status: "Draft",
        effectiveFrom,
        effectiveTo: null,
        applicableSchedule: existing.applicableSchedule,
        isActive: true,
        createdBy: userId,
        updatedBy: userId,
      },
      t
    );

    const newPolicyId = newPolicy.policyId;

    if (existing.workingHours) {
      const wh = existing.workingHours.toJSON();
      delete wh.id;
      delete wh.policyId;
      delete wh.policy_id;
      delete wh.createdAt;
      delete wh.updatedAt;
      delete wh.deletedAt;
      await policyRepo.upsertWorkingHours(newPolicyId, wh, t);
    }

    if (existing.lateEarlyRules) {
      const ler = existing.lateEarlyRules.toJSON();
      delete ler.id;
      delete ler.policyId;
      delete ler.policy_id;
      delete ler.createdAt;
      delete ler.updatedAt;
      delete ler.deletedAt;
      await policyRepo.upsertLateEarlyRules(newPolicyId, ler, t);
    }

    if (existing.penaltySlabs && existing.penaltySlabs.length > 0) {
      const slabs = existing.penaltySlabs.map((s) => ({
        violationType: s.violationType,
        fromOccurrence: s.fromOccurrence,
        toOccurrence: s.toOccurrence,
        attendanceImpact: s.attendanceImpact,
        penaltyApplication: s.penaltyApplication,
      }));
      await policyRepo.replacePenaltySlabs(newPolicyId, slabs, t);
    }

    if (existing.mappings && existing.mappings.length > 0) {
      const mappings = existing.mappings.map((m) => ({
        roleId: m.roleId,
        departmentId: m.departmentId,
        employeeId: m.employeeId,
      }));
      await policyRepo.replaceMappings(newPolicyId, mappings, userId, t);
    }

    return await policyRepo.findPolicyById(newPolicyId, { transaction: t });
  });
}

/**
 * Archive Policy
 */
export async function archivePolicy(policyId, user) {
  const { userId } = getUserContext(user);
  const policy = await policyRepo.findPolicyById(policyId, { includeRelations: false });
  if (!policy) {
    throw httpError("Policy not found", 404);
  }

  await policyRepo.updatePolicy(policyId, {
    status: "Archived",
    updatedBy: userId,
  });

  return { message: "Policy archived successfully" };
}

/**
 * Delete Policy
 */
export async function deletePolicy(policyId) {
  const policy = await policyRepo.findPolicyById(policyId, { includeRelations: false });
  if (!policy) {
    throw httpError("Policy not found", 404);
  }

  await policyRepo.deletePolicy(policyId);
  return { message: "Policy deleted successfully" };
}
