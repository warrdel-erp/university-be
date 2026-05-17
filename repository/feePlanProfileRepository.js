import { Op, QueryTypes } from "sequelize";
import sequelize from "../database/sequelizeConfig.js";
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
  const [row] = await sequelize.query(
    `SELECT COUNT(DISTINCT s.fee_plan_profile_id) AS activeCount
     FROM students s
     INNER JOIN fee_plan_profile fpp
       ON fpp.fee_plan_profile_id = s.fee_plan_profile_id
       AND fpp.institute_id = :instituteId
     WHERE s.institute_id = :instituteId
       AND s.fee_plan_profile_id IS NOT NULL`,
    {
      replacements: { instituteId },
      type: QueryTypes.SELECT,
      transaction,
    }
  );
  return Number(row?.activeCount ?? 0);
}

/** fee_plan_profile_id → number of students assigned. */
export async function countStudentsGroupedByFeePlanProfile(instituteId, options = {}) {
  const { transaction } = options;
  const rows = await sequelize.query(
    `SELECT s.fee_plan_profile_id AS feePlanProfileId, COUNT(*) AS studentCount
     FROM students s
     WHERE s.institute_id = :instituteId
       AND s.fee_plan_profile_id IS NOT NULL
     GROUP BY s.fee_plan_profile_id`,
    {
      replacements: { instituteId },
      type: QueryTypes.SELECT,
      transaction,
    }
  );

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
  const rows = await sequelize.query(
    `SELECT fpi.fee_plan_profile_id AS feePlanProfileId,
            COUNT(sfi.student_fee_invoice_id) AS invoiceCount
     FROM student_fee_invoice sfi
     INNER JOIN fee_plan_item fpi
       ON fpi.fee_plan_item_id = sfi.fee_plan_item_id
       AND fpi.institute_id = :instituteId
     WHERE sfi.institute_id = :instituteId
       AND sfi.fee_plan_item_id IS NOT NULL
     GROUP BY fpi.fee_plan_profile_id`,
    {
      replacements: { instituteId },
      type: QueryTypes.SELECT,
      transaction,
    }
  );

  const map = new Map();
  for (const row of rows) {
    map.set(Number(row.feePlanProfileId), Number(row.invoiceCount));
  }
  return map;
}

/** fee_plan_item_id → term invoice count for that installment. */
export async function countStudentFeeInvoicesGroupedByFeePlanItem(instituteId, options = {}) {
  const { transaction } = options;
  const rows = await sequelize.query(
    `SELECT sfi.fee_plan_item_id AS feePlanItemId,
            COUNT(sfi.student_fee_invoice_id) AS invoiceCount
     FROM student_fee_invoice sfi
     WHERE sfi.institute_id = :instituteId
       AND sfi.fee_plan_item_id IS NOT NULL
     GROUP BY sfi.fee_plan_item_id`,
    {
      replacements: { instituteId },
      type: QueryTypes.SELECT,
      transaction,
    }
  );

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
