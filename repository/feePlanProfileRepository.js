import { Op, fn, col } from "sequelize";
import * as model from "../models/index.js";

export const PLAN_TYPES = new Set(["annual", "semester", "trimester"]);

const profileIncludes = [
  {
    model: model.sessionCouseMappingModel,
    as: "courseSessionMapping",
    attributes: ["sessionCourseMappingId", "courseId", "sessionId", "instituteId"],
  },
];

const profileIncludesForDetail = [
  {
    model: model.sessionCouseMappingModel,
    as: "courseSessionMapping",
    attributes: ["sessionCourseMappingId", "courseId", "sessionId", "instituteId"],
    include: [
      {
        model: model.courseModel,
        as: "courses",
        attributes: ["courseId", "courseName"],
      },
      {
        model: model.sessionModel,
        as: "session",
        attributes: ["sessionId", "sessionName"],
      },
    ],
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
  return model.feePlanProfileModel.findAll({
    where,
    include: [...profileIncludes, feePlanItemsWithAdditionalFeesInclude],
    order: [
      ["feePlanProfileId", "ASC"],
      [{ model: model.feePlanItemModel, as: "feePlanItems" }, "feePlanItemId", "ASC"],
    ],
    transaction,
  });
}

export async function findFeePlanProfileById(feePlanProfileId, instituteId, options = {}) {
  const { transaction, forDetail } = options;
  const profileInclude = forDetail ? profileIncludesForDetail : profileIncludes;

  return model.feePlanProfileModel.findOne({
    where: { feePlanProfileId, instituteId },
    include: [...profileInclude, feePlanItemsWithAdditionalFeesInclude],
    order: [[{ model: model.feePlanItemModel, as: "feePlanItems" }, "feePlanItemId", "ASC"]],
    transaction,
  });
}

export async function findFeePlanProfileByIdForInstitute(feePlanProfileId, instituteId, options = {}) {
  const { transaction } = options;
  return model.feePlanProfileModel.findOne({
    where: { feePlanProfileId, instituteId },
    attributes: ["feePlanProfileId", "instituteId"],
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

export async function countFeePlanProfilesByInstitute(instituteId, options = {}) {
  const { transaction } = options;
  return model.feePlanProfileModel.count({
    where: { instituteId },
    transaction,
  });
}

/** Profiles assigned to at least one student (students.fee_plan_profile_id). */
export async function countActiveFeePlanProfilesByInstitute(instituteId, options = {}) {
  const { transaction } = options;
  return model.studentModel.count({
    where: {
      instituteId,
      feePlanProfileId: { [Op.ne]: null },
    },
    include: [
      {
        model: model.feePlanProfileModel,
        as: "studentFeePlanProfile",
        where: { instituteId },
        required: true,
        attributes: [],
      },
    ],
    distinct: true,
    col: "fee_plan_profile_id",
    transaction,
  });
}

/** fee_plan_profile_id → number of students assigned. */
export async function countStudentsGroupedByFeePlanProfile(instituteId, options = {}) {
  const { transaction } = options;
  const rows = await model.studentModel.findAll({
    attributes: ["feePlanProfileId", [fn("COUNT", col("student_id")), "studentCount"]],
    where: {
      instituteId,
      feePlanProfileId: { [Op.ne]: null },
    },
    group: ["fee_plan_profile_id"],
    raw: true,
    transaction,
  });

  const map = new Map();
  for (const row of rows) {
    map.set(Number(row.feePlanProfileId), Number(row.studentCount));
  }
  return map;
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

/** fee_plan_profile_id → term invoice count (student_fee_invoice via fee_plan_item). */
export async function countStudentFeeInvoicesGroupedByFeePlanProfile(instituteId, options = {}) {
  const { transaction } = options;
  const rows = await model.studentFeeInvoiceModel.findAll({
    attributes: [
      [col("feePlanItem.fee_plan_profile_id"), "feePlanProfileId"],
      [fn("COUNT", col("student_fee_invoice.student_fee_invoice_id")), "invoiceCount"],
    ],
    where: {
      instituteId,
      feePlanItemId: { [Op.ne]: null },
    },
    include: [
      {
        model: model.feePlanItemModel,
        as: "feePlanItem",
        where: { instituteId },
        required: true,
        attributes: [],
      },
    ],
    group: [col("feePlanItem.fee_plan_profile_id")],
    subQuery: false,
    raw: true,
    transaction,
  });

  const map = new Map();
  for (const row of rows) {
    map.set(Number(row.feePlanProfileId), Number(row.invoiceCount));
  }
  return map;
}

/** fee_plan_item_id → term invoice count for that installment. */
export async function countStudentFeeInvoicesGroupedByFeePlanItem(instituteId, options = {}) {
  const { transaction } = options;
  const rows = await model.studentFeeInvoiceModel.findAll({
    attributes: ["feePlanItemId", [fn("COUNT", col("student_fee_invoice_id")), "invoiceCount"]],
    where: {
      instituteId,
      feePlanItemId: { [Op.ne]: null },
    },
    group: ["fee_plan_item_id"],
    raw: true,
    transaction,
  });

  const map = new Map();
  for (const row of rows) {
    map.set(Number(row.feePlanItemId), Number(row.invoiceCount));
  }
  return map;
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
