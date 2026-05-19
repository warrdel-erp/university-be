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

const feePlanItemsWithSubItemsInclude = {
  model: model.feePlanItemModel,
  as: "feePlanItems",
  required: false,
  include: [
    {
      model: model.feePlanSubItemsModel,
      as: "feePlanSubItems",
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

export async function updateFeePlanProfileById(feePlanProfileId, instituteId, fields, options = {}) {
  const { transaction } = options;
  return model.feePlanProfileModel.update(fields, {
    where: { feePlanProfileId, instituteId },
    transaction,
  });
}

export async function findFeePlanItemsByProfileId(feePlanProfileId, instituteId, options = {}) {
  const { transaction } = options;
  return model.feePlanItemModel.findAll({
    where: { feePlanProfileId, instituteId },
    attributes: ["feePlanItemId", "feePlanProfileId", "createDate", "dueDate"],
    order: [
      ["createDate", "ASC"],
      ["feePlanItemId", "ASC"],
    ],
    transaction,
  });
}

export async function updateFeePlanItemById(feePlanItemId, instituteId, fields, options = {}) {
  const { transaction } = options;
  return model.feePlanItemModel.update(fields, {
    where: { feePlanItemId, instituteId },
    transaction,
  });
}

export async function deleteFeePlanSubItemsByFeePlanItemId(feePlanItemId, instituteId, options = {}) {
  const { transaction } = options;
  return model.feePlanSubItemsModel.destroy({
    where: { feePlanItemId, instituteId },
    transaction,
  });
}

export async function deleteFeePlanItemById(feePlanItemId, instituteId, options = {}) {
  const { transaction } = options;
  return model.feePlanItemModel.destroy({
    where: { feePlanItemId, instituteId },
    transaction,
  });
}

/** Distinct fee_plan_profile_id values assigned on students for this institute. */
export async function findDistinctAssignedFeePlanProfileIds(instituteId, options = {}) {
  const { transaction } = options;
  const rows = await model.studentModel.findAll({
    attributes: ["feePlanProfileId"],
    where: {
      instituteId,
      feePlanProfileId: { [Op.ne]: null },
    },
    group: ["feePlanProfileId"],
    raw: true,
    transaction,
  });

  return rows.map((row) => Number(row.feePlanProfileId)).filter((id) => id > 0);
}

export async function findFeePlanProfilesByInstitute(instituteId, options = {}) {
  const { courseSessionId, feePlanProfileIds, excludeFeePlanProfileIds, transaction } = options;
  const where = { instituteId };
  if (courseSessionId != null) {
    where.courseSessionId = courseSessionId;
  }
  if (feePlanProfileIds != null) {
    if (feePlanProfileIds.length === 0) return [];
    where.feePlanProfileId = { [Op.in]: feePlanProfileIds };
  } else if (excludeFeePlanProfileIds?.length) {
    where.feePlanProfileId = { [Op.notIn]: excludeFeePlanProfileIds };
  }
  return model.feePlanProfileModel.findAll({
    where,
    include: [...profileIncludes, feePlanItemsWithSubItemsInclude],
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
    include: [...profileInclude, feePlanItemsWithSubItemsInclude],
    order: [[{ model: model.feePlanItemModel, as: "feePlanItems" }, "feePlanItemId", "ASC"]],
    transaction,
  });
}

export async function findFeePlanProfileByIdForInstitute(feePlanProfileId, instituteId, options = {}) {
  const { transaction } = options;
  return model.feePlanProfileModel.findOne({
    where: { feePlanProfileId, instituteId },
    attributes: ["feePlanProfileId", "instituteId", "name", "planType", "courseSessionId"],
    transaction,
  });
}

export async function findSessionCourseMappingForInstitute(
  sessionCourseMappingId,
  instituteId,
  options = {}
) {
  return model.sessionCouseMappingModel.findOne({
    attributes: ["sessionCourseMappingId", "instituteId", "courseId", "sessionId"],
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

export async function countFeePlanProfilesByInstitute(instituteId, options = {}) {
  const { transaction } = options;
  return model.feePlanProfileModel.count({
    where: { instituteId },
    transaction,
  });
}

/** Distinct fee plan profiles linked via students.fee_plan_profile_id. */
export async function countActiveFeePlanProfilesByInstitute(instituteId, options = {}) {
  const ids = await findDistinctAssignedFeePlanProfileIds(instituteId, options);
  return ids.length;
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
    group: ["feePlanProfileId"],
    raw: true,
    transaction,
  });

  const map = new Map();
  for (const row of rows) {
    const profileId = Number(row.feePlanProfileId ?? row.fee_plan_profile_id);
    map.set(profileId, Number(row.studentCount));
  }
  return map;
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

export async function createFeePlanItem(data, options = {}) {
  return model.feePlanItemModel.create(data, { transaction: options.transaction });
}

export async function createFeePlanSubItem(data, options = {}) {
  return model.feePlanSubItemsModel.create(data, { transaction: options.transaction });
}

/**
 * @param {Array<{
 *   startDate: string,
 *   dueDate: string|null,
 *   subItems: Array<{ feeTypeId: number, amount: number, isMainSubItem: boolean }>
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
        feePlanProfileId,
        instituteId,
      },
      { transaction }
    );

    for (const line of installment.subItems) {
      await createFeePlanSubItem(
        {
          amount: line.amount,
          feeTypeId: line.feeTypeId,
          feePlanItemId: feePlanItem.feePlanItemId,
          instituteId,
          isMainSubItem: line.isMainSubItem,
        },
        { transaction }
      );
    }
  }
}
