import * as model from "../../../models/index.js";
import { scoped } from "../../../utility/scoped.js";
import sequelize from "../../../database/sequelizeConfig.js";
import { Op } from "sequelize";

/**
 * Creates leave_types record along with its 1:1 rule records:
 * eligibility, holidaysCarryForward, and encashment.
 */
export async function createLeaveType(payload, options = {}) {
  const transaction = options.transaction || (await sequelize.transaction());
  const isExternalTx = !!options.transaction;

  try {
    const {
      eligibility,
      holidaysCarryForward,
      encashment,
      ...leaveTypeData
    } = payload;

    // 1. Create main Leave Type
    const leaveType = await scoped(model.leaveTypeModel).create(leaveTypeData, {
      transaction,
    });
    const leaveTypeId = leaveType.id || leaveType.dataValues?.id;

    // 2. Create Eligibility rule record if provided
    let eligibilityRecord = null;
    if (eligibility && typeof eligibility === "object") {
      eligibilityRecord = await model.leaveTypeEligibilityModel.create(
        {
          ...eligibility,
          leaveTypeId,
        },
        { transaction }
      );
    } else {
      // Create with default values
      eligibilityRecord = await model.leaveTypeEligibilityModel.create(
        { leaveTypeId },
        { transaction }
      );
    }

    // 3. Create Holidays & Carry Forward rule record if provided
    let holidaysRecord = null;
    if (holidaysCarryForward && typeof holidaysCarryForward === "object") {
      holidaysRecord = await model.leaveTypeHolidaysCarryForwardModel.create(
        {
          ...holidaysCarryForward,
          leaveTypeId,
        },
        { transaction }
      );
    } else {
      // Create with default values
      holidaysRecord = await model.leaveTypeHolidaysCarryForwardModel.create(
        { leaveTypeId },
        { transaction }
      );
    }

    // 4. Create Encashment rule record if provided
    let encashmentRecord = null;
    if (encashment && typeof encashment === "object") {
      encashmentRecord = await model.leaveTypeEncashmentModel.create(
        {
          ...encashment,
          leaveTypeId,
        },
        { transaction }
      );
    } else {
      // Create with default values
      encashmentRecord = await model.leaveTypeEncashmentModel.create(
        { leaveTypeId },
        { transaction }
      );
    }

    if (!isExternalTx) {
      await transaction.commit();
    }

    // Return complete leave type with relations
    return getLeaveTypeById(leaveTypeId, { transaction: isExternalTx ? transaction : undefined });
  } catch (error) {
    if (!isExternalTx) {
      await transaction.rollback();
    }
    throw error;
  }
}

/**
 * Get all leave types with search, classification, status filter, and pagination.
 */
export async function getLeaveTypes(filters = {}, pagination = {}) {
  const where = {};

  // Search by name or code
  if (filters.search && filters.search.trim()) {
    const term = `%${filters.search.trim()}%`;
    where[Op.or] = [
      { name: { [Op.like]: term } },
      { code: { [Op.like]: term } },
      { description: { [Op.like]: term } },
    ];
  }

  // Filter by classification ('Paid', 'Unpaid', 'Duty')
  if (filters.classification && filters.classification !== "All") {
    where.classification = filters.classification;
  }

  // Filter by status ('Active', 'Inactive', 'Draft', 'Published')
  if (filters.status && filters.status !== "All") {
    where.status = filters.status;
  }

  const queryOptions = {
    where,
    attributes: {
      include: [
        [
          sequelize.literal(`(
            SELECT COUNT(DISTINCT lpe.policy_id)
            FROM leave_policy_entitlements lpe
            WHERE lpe.leave_code = leave_types.code
              AND lpe.deleted_at IS NULL
          )`),
          "usedInPoliciesCount",
        ],
      ],
      exclude: ["deletedAt"],
    },
    include: [
      {
        model: model.leaveTypeEligibilityModel,
        as: "eligibility",
        attributes: { exclude: ["deletedAt"] },
      },
      {
        model: model.leaveTypeHolidaysCarryForwardModel,
        as: "holidaysCarryForward",
        attributes: { exclude: ["deletedAt"] },
      },
      {
        model: model.leaveTypeEncashmentModel,
        as: "encashment",
        attributes: { exclude: ["deletedAt"] },
      },
    ],
    order: [["id", "DESC"]],
  };

  // Pagination support
  if (pagination.limit) {
    queryOptions.limit = Math.max(1, parseInt(pagination.limit, 10) || 10);
    queryOptions.offset = Math.max(
      0,
      ((parseInt(pagination.page, 10) || 1) - 1) * queryOptions.limit
    );
    return scoped(model.leaveTypeModel).findAndCountAll(queryOptions);
  }

  return scoped(model.leaveTypeModel).findAll(queryOptions);
}

/**
 * Get single leave type by ID with all rules and policy usage count.
 */
export async function getLeaveTypeById(id, options = {}) {
  return scoped(model.leaveTypeModel).findOne({
    where: { id },
    attributes: {
      include: [
        [
          sequelize.literal(`(
            SELECT COUNT(DISTINCT lpe.policy_id)
            FROM leave_policy_entitlements lpe
            WHERE lpe.leave_code = leave_types.code
              AND lpe.deleted_at IS NULL
          )`),
          "usedInPoliciesCount",
        ],
      ],
      exclude: ["deletedAt"],
    },
    include: [
      {
        model: model.leaveTypeEligibilityModel,
        as: "eligibility",
        attributes: { exclude: ["deletedAt"] },
      },
      {
        model: model.leaveTypeHolidaysCarryForwardModel,
        as: "holidaysCarryForward",
        attributes: { exclude: ["deletedAt"] },
      },
      {
        model: model.leaveTypeEncashmentModel,
        as: "encashment",
        attributes: { exclude: ["deletedAt"] },
      },
    ],
    transaction: options.transaction,
  });
}

/**
 * Check if code already exists for the university (excluding current id if update).
 */
export async function findByCode(code, universityId, excludeId = null) {
  const where = { code };
  if (universityId) where.universityId = universityId;
  if (excludeId) where.id = { [Op.ne]: excludeId };

  return scoped(model.leaveTypeModel).findOne({ where });
}

/**
 * Count how many policies use this leave code.
 */
export async function countPoliciesUsingLeaveCode(code) {
  const [result] = await sequelize.query(`
    SELECT COUNT(DISTINCT lpe.policy_id) AS policyCount
    FROM leave_policy_entitlements lpe
    WHERE lpe.leave_code = ${sequelize.escape(code)}
      AND lpe.deleted_at IS NULL
  `);
  return result && result[0] ? Number(result[0].policyCount) : 0;
}

/**
 * Update leave type and upsert/update its child rule records.
 */
export async function updateLeaveType(id, payload, options = {}) {
  const transaction = options.transaction || (await sequelize.transaction());
  const isExternalTx = !!options.transaction;

  try {
    const {
      eligibility,
      holidaysCarryForward,
      encashment,
      ...leaveTypeData
    } = payload;

    // 1. Update main leave type
    if (Object.keys(leaveTypeData).length > 0) {
      await scoped(model.leaveTypeModel).update(leaveTypeData, {
        where: { id },
        transaction,
      });
    }

    // 2. Upsert/Update Eligibility
    if (eligibility && typeof eligibility === "object") {
      const existing = await model.leaveTypeEligibilityModel.findOne({
        where: { leaveTypeId: id },
        transaction,
      });
      if (existing) {
        await model.leaveTypeEligibilityModel.update(eligibility, {
          where: { leaveTypeId: id },
          transaction,
        });
      } else {
        await model.leaveTypeEligibilityModel.create(
          { ...eligibility, leaveTypeId: id },
          { transaction }
        );
      }
    }

    // 3. Upsert/Update Holidays & Carry Forward
    if (holidaysCarryForward && typeof holidaysCarryForward === "object") {
      const existing = await model.leaveTypeHolidaysCarryForwardModel.findOne({
        where: { leaveTypeId: id },
        transaction,
      });
      if (existing) {
        await model.leaveTypeHolidaysCarryForwardModel.update(holidaysCarryForward, {
          where: { leaveTypeId: id },
          transaction,
        });
      } else {
        await model.leaveTypeHolidaysCarryForwardModel.create(
          { ...holidaysCarryForward, leaveTypeId: id },
          { transaction }
        );
      }
    }

    // 4. Upsert/Update Encashment
    if (encashment && typeof encashment === "object") {
      const existing = await model.leaveTypeEncashmentModel.findOne({
        where: { leaveTypeId: id },
        transaction,
      });
      if (existing) {
        await model.leaveTypeEncashmentModel.update(encashment, {
          where: { leaveTypeId: id },
          transaction,
        });
      } else {
        await model.leaveTypeEncashmentModel.create(
          { ...encashment, leaveTypeId: id },
          { transaction }
        );
      }
    }

    if (!isExternalTx) {
      await transaction.commit();
    }

    return getLeaveTypeById(id, { transaction: isExternalTx ? transaction : undefined });
  } catch (error) {
    if (!isExternalTx) {
      await transaction.rollback();
    }
    throw error;
  }
}

/**
 * Update status directly (e.g. 'Draft' -> 'Published', 'Active' <-> 'Inactive')
 */
export async function updateLeaveTypeStatus(id, status, updatedBy) {
  const updateData = { status };
  if (updatedBy) updateData.updatedBy = updatedBy;

  await scoped(model.leaveTypeModel).update(updateData, {
    where: { id },
  });

  return getLeaveTypeById(id);
}

/**
 * Soft delete leave type and its 1:1 detail records.
 */
export async function deleteLeaveType(id) {
  return sequelize.transaction(async (t) => {
    await model.leaveTypeEligibilityModel.destroy({
      where: { leaveTypeId: id },
      transaction: t,
    });
    await model.leaveTypeHolidaysCarryForwardModel.destroy({
      where: { leaveTypeId: id },
      transaction: t,
    });
    await model.leaveTypeEncashmentModel.destroy({
      where: { leaveTypeId: id },
      transaction: t,
    });
    return scoped(model.leaveTypeModel).destroy({
      where: { id },
      transaction: t,
    });
  });
}
