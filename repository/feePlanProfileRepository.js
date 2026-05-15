import { Op } from "sequelize";
import * as model from "../models/index.js";

export const PLAN_TYPES = new Set(["annual", "semester", "trimester"]);

/** Accepts frontend/DB keys: `annual` | `semester` | `trimester` (case-insensitive, trimmed). */
export function normalizePlanType(planTypeOrBody) {
  if (planTypeOrBody == null || planTypeOrBody === "") return null;
  const key = String(planTypeOrBody).trim().toLowerCase();
  return PLAN_TYPES.has(key) ? key : null;
}

export async function assertCourseSessionForInstitute(mapId, instituteId, academicYearId, options = {}) {
  const { transaction } = options;
  const mapping = await findSessionCourseMappingForInstitute(mapId, instituteId, { transaction });
  if (!mapping) {
    const err = new Error("courseSessionId not found or not in your institute");
    err.statusCode = 400;
    throw err;
  }
  if (academicYearId == null || academicYearId === "") return;
  const withSession = await findSessionCourseMappingWithSession(mapId, instituteId, { transaction });
  const expected = Number(academicYearId);
  const sessionYear = Number(withSession?.session?.acedmicYearId);
  if (!withSession?.session || sessionYear !== expected) {
    const err = new Error("academicYearId does not match the session for this courseSessionId");
    err.statusCode = 400;
    throw err;
  }
}

const excludeTs = ["createdAt", "updatedAt"];

const profileIncludes = [
  {
    model: model.sessionCouseMappingModel,
    as: "courseSessionMapping",
    attributes: ["sessionCourseMappingId", "courseId", "sessionId", "instituteId"],
  },
];

export async function createFeePlanProfile(data, options = {}) {
  return model.feePlanProfileModel.create(data, { transaction: options.transaction });
}

const feePlanItemsWithAdditionalFeesInclude = {
  model: model.feePlanItemModel,
  as: "feePlanItems",
  required: false,
  include: [
    {
      model: model.additionalFeeModel,
      as: "itemAdditionalFees",
      required: false,
      include: [
        {
          model: model.feeTypeCatalogModel,
          as: "feeTypeCatalog",
          required: false,
          attributes: { exclude: excludeTs },
          include: [
            {
              model: model.feeTypeCategoryModel,
              as: "feeTypeCategory",
              required: false,
              attributes: ["feeTypeCategoryId", "name", "description", "instituteId"],
            },
          ],
        },
      ],
    },
  ],
};

export async function findFeePlanProfilesByInstitute(instituteId, options = {}) {
  const { courseSessionId, transaction } = options;
  const where = { instituteId };
  if (courseSessionId != null) {
    where.courseSessionId = courseSessionId;
  }
  const include = [...profileIncludes];
  if (courseSessionId != null) {
    include.push(feePlanItemsWithAdditionalFeesInclude);
  }
  const order = [["feePlanProfileId", "ASC"]];
  if (courseSessionId != null) {
    order.push([{ model: model.feePlanItemModel, as: "feePlanItems" }, "feePlanItemId", "ASC"]);
  }
  return model.feePlanProfileModel.findAll({
    attributes: { exclude: excludeTs },
    where,
    include,
    order,
    transaction,
  });
}

export async function findFeePlanProfileById(feePlanProfileId, instituteId, options = {}) {
  const { transaction } = options;
  return model.feePlanProfileModel.findOne({
    attributes: { exclude: excludeTs },
    where: { feePlanProfileId, instituteId },
    include: [...profileIncludes, feePlanItemsWithAdditionalFeesInclude],
    order: [[{ model: model.feePlanItemModel, as: "feePlanItems" }, "feePlanItemId", "ASC"]],
    transaction,
  });
}

export async function findSessionCourseMappingForInstitute(
  sessionCourseMappingId,
  instituteId,
  options = {}
) {
  return model.sessionCouseMappingModel.findOne({
    attributes: ["sessionCourseMappingId", "instituteId"],
    where: { sessionCourseMappingId, instituteId },
    transaction: options.transaction,
  });
}

export async function findSessionCourseMappingWithSession(
  sessionCourseMappingId,
  instituteId,
  options = {}
) {
  return model.sessionCouseMappingModel.findOne({
    attributes: ["sessionCourseMappingId", "instituteId"],
    where: { sessionCourseMappingId, instituteId },
    include: [
      {
        model: model.sessionModel,
        as: "session",
        required: true,
        attributes: ["sessionId", "acedmicYearId"],
      },
    ],
    transaction: options.transaction,
  });
}

export async function updateFeePlanProfile(feePlanProfileId, instituteId, payload, options = {}) {
  const { transaction } = options;
  const [affected] = await model.feePlanProfileModel.update(payload, {
    where: { feePlanProfileId, instituteId },
    transaction,
  });
  return affected;
}

export async function deleteFeePlanProfile(feePlanProfileId, instituteId, options = {}) {
  const { transaction } = options;
  const deleted = await model.feePlanProfileModel.destroy({
    where: { feePlanProfileId, instituteId },
    transaction,
  });
  return deleted > 0;
}

export async function countAdditionalFeesForProfile(feePlanProfileId, options = {}) {
  const { transaction } = options;
  return model.additionalFeeModel.count({
    include: [
      {
        model: model.feePlanItemModel,
        as: "feePlanItem",
        where: { feePlanProfileId },
        required: true,
        attributes: [],
      },
    ],
    transaction,
  });
}

export async function countStudentFeeInvoicesForFeePlanProfile(feePlanProfileId, instituteId, options = {}) {
  const { transaction } = options;
  return model.studentFeeInvoiceModel.count({
    where: { instituteId },
    include: [
      {
        model: model.feePlanItemModel,
        as: "feePlanItem",
        where: { feePlanProfileId },
        required: true,
        attributes: [],
      },
    ],
    transaction,
  });
}

/** Deletes fee plan items for a profile and their additional_fee + fee_type_catalog rows (same institute). */
export async function removeInstallmentsAndCatalogsForProfile(feePlanProfileId, instituteId, options = {}) {
  const { transaction } = options;
  const items = await model.feePlanItemModel.findAll({
    where: { feePlanProfileId, instituteId },
    attributes: ["feePlanItemId"],
    transaction,
  });
  const itemIds = items.map((r) => r.feePlanItemId);
  if (itemIds.length === 0) return;

  const additionalFees = await model.additionalFeeModel.findAll({
    where: {
      feePlanItemId: { [Op.in]: itemIds },
      instituteId,
    },
    attributes: ["additionalFeeId", "feeTypeCatalogId"],
    transaction,
  });

  for (const af of additionalFees) {
    await model.additionalFeeModel.destroy({
      where: { additionalFeeId: af.additionalFeeId, instituteId },
      transaction,
    });
  }

  const catalogIds = [...new Set(additionalFees.map((a) => a.feeTypeCatalogId).filter(Boolean))];
  for (const feeTypeCatalogId of catalogIds) {
    await model.feeTypeCatalogModel.destroy({
      where: { feeTypeCatalogId, instituteId },
      transaction,
    });
  }

  await model.feePlanItemModel.destroy({
    where: { feePlanProfileId, instituteId },
    transaction,
  });
}

export async function createFeePlanItem(data, options = {}) {
  return model.feePlanItemModel.create(data, { transaction: options.transaction });
}

export async function createAdditionalFee(data, options = {}) {
  return model.additionalFeeModel.create(data, { transaction: options.transaction });
}
