import { Op, fn, col } from "sequelize";
import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

function buildScopeWithoutAcademicYear(model) {
  return buildScope({
    rawAttributes: model.rawAttributes,
    name: model.name,
    scopeConfig: { ...(model.scopeConfig || {}), academicYear: false },
  });
}

function profileIncludes() {
  return [
    {
      model: model.sessionCouseMappingModel,
      as: "courseSessionMapping",
      attributes: ["sessionCourseMappingId", "courseId", "sessionId", "instituteId"],
      where: buildScope(model.sessionCouseMappingModel),
      required: true,
    },
  ];
}

function profileIncludesForDetail() {
  return [
    {
      model: model.sessionCouseMappingModel,
      as: "courseSessionMapping",
      attributes: ["sessionCourseMappingId", "courseId", "sessionId", "instituteId"],
      where: buildScope(model.sessionCouseMappingModel),
      required: true,
      include: [
        {
          model: model.courseModel,
          as: "courses",
          attributes: ["courseId", "courseName"],
          where: buildScope(model.courseModel),
          required: false,
        },
        {
          model: model.sessionModel,
          as: "session",
          attributes: ["sessionId", "sessionName"],
          where: buildScopeWithoutAcademicYear(model.sessionModel),
          required: false,
        },
      ],
    },
  ];
}

function feePlanItemsWithSubItemsInclude() {
  return {
    model: model.feePlanItemModel,
    as: "feePlanItems",
    required: false,
    where: buildScope(model.feePlanItemModel),
    include: [
      {
        model: model.feePlanSubItemsModel,
        as: "feePlanSubItems",
        required: false,
        where: buildScope(model.feePlanSubItemsModel),
        include: [
          {
            model: model.feeTypeCatalogModel,
            as: "feeTypeCatalog",
            required: false,
            where: buildScope(model.feeTypeCatalogModel),
            include: [
              {
                model: model.feeTypeCategoryModel,
                as: "feeTypeCategory",
                required: false,
                where: buildScope(model.feeTypeCategoryModel),
              },
            ],
          },
        ],
      },
    ],
  };
}

function buildProfileBusinessWhere(options = {}) {
  const { courseSessionId, feePlanProfileIds, excludeFeePlanProfileIds } = options;
  const where = {};

  if (courseSessionId != null) {
    where.courseSessionId = courseSessionId;
  }
  if (feePlanProfileIds != null) {
    if (feePlanProfileIds.length === 0) {
      return null;
    }
    where.feePlanProfileId = { [Op.in]: feePlanProfileIds };
  } else if (excludeFeePlanProfileIds?.length) {
    where.feePlanProfileId = { [Op.notIn]: excludeFeePlanProfileIds };
  }

  return where;
}

export async function createFeePlanProfile(data, options = {}) {
  return scoped(model.feePlanProfileModel).create(data, { transaction: options.transaction });
}

export async function updateFeePlanProfileById(feePlanProfileId, fields, options = {}) {
  const { transaction } = options;
  const existing = await scoped(model.feePlanProfileModel).findOne({
    attributes: ["feePlanProfileId"],
    where: { feePlanProfileId },
    transaction,
  });
  if (!existing) {
    return [0];
  }

  return scoped(model.feePlanProfileModel).update(fields, {
    where: { feePlanProfileId },
    transaction,
  });
}

export async function findFeePlanItemsByProfileId(feePlanProfileId, options = {}) {
  const { transaction } = options;
  return scoped(model.feePlanItemModel).findAll({
    where: { feePlanProfileId },
    attributes: ["feePlanItemId", "feePlanProfileId", "createDate", "dueDate"],
    order: [
      ["createDate", "ASC"],
      ["feePlanItemId", "ASC"],
    ],
    transaction,
  });
}

export async function updateFeePlanItemById(feePlanItemId, fields, options = {}) {
  const { transaction } = options;
  return scoped(model.feePlanItemModel).update(fields, {
    where: { feePlanItemId },
    transaction,
  });
}

export async function findFeePlanSubItemById(feePlanSubitemId, options = {}) {
  const { transaction } = options;
  return scoped(model.feePlanSubItemsModel).findOne({
    where: { feePlanSubitemId },
    transaction,
  });
}

export async function findFeePlanSubItemForProfile(feePlanSubitemId, feePlanProfileId, options = {}) {
  const { transaction } = options;
  const itemScope = buildScope(model.feePlanItemModel);

  return scoped(model.feePlanSubItemsModel).findOne({
    where: { feePlanSubitemId },
    include: [
      {
        model: model.feePlanItemModel,
        as: "feePlanItem",
        required: true,
        where: { ...{ feePlanProfileId }, ...itemScope },
        attributes: ["feePlanItemId", "feePlanProfileId"],
      },
    ],
    transaction,
  });
}

export async function findFeePlanSubItemsByFeePlanItemId(feePlanItemId, options = {}) {
  const { transaction } = options;
  return scoped(model.feePlanSubItemsModel).findAll({
    where: { feePlanItemId },
    attributes: ["feePlanSubitemId"],
    transaction,
  });
}

export async function updateFeePlanSubItemById(feePlanSubitemId, fields, options = {}) {
  const { transaction } = options;
  return scoped(model.feePlanSubItemsModel).update(fields, {
    where: { feePlanSubitemId },
    transaction,
  });
}

export async function deleteFeePlanSubItemById(feePlanSubitemId, options = {}) {
  const { transaction } = options;
  return scoped(model.feePlanSubItemsModel).destroy({
    where: { feePlanSubitemId },
    transaction,
  });
}

export async function deleteFeePlanSubItemsByFeePlanItemId(feePlanItemId, options = {}) {
  const { transaction } = options;
  return scoped(model.feePlanSubItemsModel).destroy({
    where: { feePlanItemId },
    transaction,
  });
}

export async function deleteFeePlanItemById(feePlanItemId, options = {}) {
  const { transaction } = options;
  return scoped(model.feePlanItemModel).destroy({
    where: { feePlanItemId },
    transaction,
  });
}

/** Distinct fee_plan_profile_id values assigned on students for this institute. */
export async function findDistinctAssignedFeePlanProfileIds(options = {}) {
  const { transaction } = options;
  const rows = await scoped(model.studentModel).findAll({
    attributes: ["feePlanProfileId"],
    where: {
      feePlanProfileId: { [Op.ne]: null },
    },
    group: ["feePlanProfileId"],
    raw: true,
    transaction,
  });

  return rows.map((row) => Number(row.feePlanProfileId)).filter((id) => id > 0);
}

export async function findFeePlanProfilesByInstitute(options = {}) {
  const { transaction } = options;
  const businessWhere = buildProfileBusinessWhere(options);
  if (businessWhere === null) {
    return [];
  }

  return scoped(model.feePlanProfileModel).findAll({
    where: businessWhere,
    include: [...profileIncludes(), feePlanItemsWithSubItemsInclude()],
    order: [
      ["feePlanProfileId", "ASC"],
      [{ model: model.feePlanItemModel, as: "feePlanItems" }, "feePlanItemId", "ASC"],
    ],
    transaction,
  });
}

export async function findFeePlanProfileById(feePlanProfileId, options = {}) {
  const { transaction, forDetail } = options;
  const profileInclude = forDetail ? profileIncludesForDetail() : profileIncludes();

  return scoped(model.feePlanProfileModel).findOne({
    where: { feePlanProfileId },
    include: [...profileInclude, feePlanItemsWithSubItemsInclude()],
    order: [[{ model: model.feePlanItemModel, as: "feePlanItems" }, "feePlanItemId", "ASC"]],
    transaction,
  });
}

export async function findFeePlanProfileByIdForInstitute(feePlanProfileId, options = {}) {
  const { transaction } = options;
  return scoped(model.feePlanProfileModel).findOne({
    where: { feePlanProfileId },
    attributes: [
      "feePlanProfileId",
      "instituteId",
      "name",
      "planType",
      "category",
      "courseSessionId",
      "publishStatus",
    ],
    transaction,
  });
}

export async function findSessionCourseMappingForInstitute(sessionCourseMappingId, options = {}) {
  return scoped(model.sessionCouseMappingModel).findOne({
    attributes: ["sessionCourseMappingId", "instituteId", "courseId", "sessionId"],
    where: { sessionCourseMappingId },
    transaction: options.transaction,
  });
}

export async function findSessionCourseMappingWithSession(sessionCourseMappingId, options = {}) {
  return scoped(model.sessionCouseMappingModel).findOne({
    attributes: ["sessionCourseMappingId", "instituteId"],
    where: { sessionCourseMappingId },
    include: [
      {
        model: model.sessionModel,
        as: "session",
        required: true,
        attributes: ["sessionId", "academicYearId"],
        where: buildScopeWithoutAcademicYear(model.sessionModel),
      },
    ],
    transaction: options.transaction,
  });
}

export async function countFeePlanProfilesByInstitute(options = {}) {
  const { transaction } = options;
  return scoped(model.feePlanProfileModel).count({ transaction });
}

export async function countActiveFeePlanProfilesByInstitute(options = {}) {
  const ids = await findDistinctAssignedFeePlanProfileIds(options);
  return ids.length;
}

/** fee_plan_profile_id → number of students assigned. */
export async function countStudentsGroupedByFeePlanProfile(options = {}) {
  const { transaction } = options;
  const rows = await scoped(model.studentModel).findAll({
    attributes: ["feePlanProfileId", [fn("COUNT", col("student_id")), "studentCount"]],
    where: {
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
export async function countStudentFeeInvoicesGroupedByFeePlanProfile(options = {}) {
  const { transaction } = options;
  const itemScope = buildScope(model.feePlanItemModel);

  const rows = await scoped(model.studentFeeInvoiceModel).findAll({
    attributes: [
      [col("feePlanItem.fee_plan_profile_id"), "feePlanProfileId"],
      [fn("COUNT", col("student_fee_invoice.student_fee_invoice_id")), "invoiceCount"],
    ],
    where: {
      feePlanItemId: { [Op.ne]: null },
    },
    include: [
      {
        model: model.feePlanItemModel,
        as: "feePlanItem",
        where: itemScope,
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
export async function countStudentFeeInvoicesGroupedByFeePlanItem(options = {}) {
  const { transaction } = options;
  const rows = await scoped(model.studentFeeInvoiceModel).findAll({
    attributes: ["feePlanItemId", [fn("COUNT", col("student_fee_invoice_id")), "invoiceCount"]],
    where: {
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
  return scoped(model.feePlanItemModel).create(data, { transaction: options.transaction });
}

export async function createFeePlanSubItem(data, options = {}) {
  return scoped(model.feePlanSubItemsModel).create(data, { transaction: options.transaction });
}

/**
 * @param {Array<{
 *   startDate: string,
 *   dueDate: string|null,
 *   subItems: Array<{ feeTypeId: number, amount: number, isMainSubItem: boolean }>
 * }>} installments
 */
export async function createInstallmentsForProfile(feePlanProfileId, installments, options = {}) {
  const { transaction } = options;

  for (const installment of installments) {
    const feePlanItem = await createFeePlanItem(
      {
        createDate: installment.startDate,
        dueDate: installment.dueDate,
        feePlanProfileId,
      },
      { transaction }
    );

    for (const line of installment.subItems) {
      await createFeePlanSubItem(
        {
          amount: line.amount,
          feeTypeId: line.feeTypeId,
          feePlanItemId: feePlanItem.feePlanItemId,
          isMainSubItem: line.isMainSubItem,
        },
        { transaction }
      );
    }
  }
}
