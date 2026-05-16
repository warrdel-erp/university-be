import { Op } from "sequelize";
import * as model from "../models/index.js";

export const PLAN_TYPES = new Set(["annual", "semester", "trimester"]);

const profileIncludes = [
  {
    model: model.sessionCouseMappingModel,
    as: "courseSessionMapping",
    attributes: ["sessionCourseMappingId", "courseId", "sessionId", "instituteId"],
  },
];

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
          include: [
            {
              model: model.feeTypeCategoryModel,
              as: "feeTypeCategory",
              required: false,
            },
          ],
        },
      ],
    },
  ],
};

export async function createFeePlanProfile(data, options = {}) {
  return model.feePlanProfileModel.create(data, { transaction: options.transaction });
}

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
    where,
    include,
    order,
    transaction,
  });
}

export async function findFeePlanProfileById(feePlanProfileId, instituteId, options = {}) {
  const { transaction } = options;
  return model.feePlanProfileModel.findOne({
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

export async function countStudentFeeInvoicesForFeePlanProfile(
  feePlanProfileId,
  instituteId,
  options = {}
) {
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

export async function removeInstallmentsForProfile(feePlanProfileId, instituteId, options = {}) {
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
    attributes: ["additionalFeeId"],
    transaction,
  });

  for (const af of additionalFees) {
    await model.additionalFeeModel.destroy({
      where: { additionalFeeId: af.additionalFeeId, instituteId },
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

/**
 * @param {Array<{
 *   name: string,
 *   startDate: string,
 *   dueDate: string|null,
 *   amount: number|string,
 *   additionalFees?: Array<{ feeTypeCatalogId: number, amount: number }>
 * }>} installments
 */
export async function createInstallmentsForProfile(
  feePlanProfileId,
  instituteId,
  installments,
  options = {}
) {
  const { transaction } = options;

  for (const installment of installments) {
    const feePlanItem = await createFeePlanItem(
      {
        createDate: installment.startDate,
        dueDate: installment.dueDate,
        termName: installment.name,
        amount: installment.amount,
        feePlanProfileId,
        instituteId,
      },
      { transaction }
    );

    const lines = installment.additionalFees;
    if (!Array.isArray(lines) || lines.length === 0) continue;

    for (const line of lines) {
      await createAdditionalFee(
        {
          amount: line.amount,
          feeTypeCatalogId: line.feeTypeCatalogId,
          feePlanItemId: feePlanItem.feePlanItemId,
          instituteId,
        },
        { transaction }
      );
    }
  }
}
