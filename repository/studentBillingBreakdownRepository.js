import { Op } from "sequelize";
import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

/**
 * Find student by studentId with course and session details
 */
export async function findStudentById(studentId, options = {}) {
  return scoped(model.studentModel, {
    scopeConfig: { academicYear: false },
  }).findOne({
    where: { studentId: Number(studentId) },
    attributes: [
      "studentId",
      "firstName",
      "middleName",
      "lastName",
      "scholarNumber",
      "enrollNumber",
      "admissionNumber",
      "batchId",
      "courseId",
      "sessionId",
      "instituteId",
      "universityId",
    ],
    include: [
      {
        model: model.courseModel,
        as: "course",
        attributes: ["courseId", "courseName", "courseCode", "courseDuration", "termType"],
        required: false,
      },
      {
        model: model.sessionModel,
        as: "studentSession",
        attributes: ["sessionId", "sessionName"],
        required: false,
      },
    ],
    transaction: options.transaction,
  });
}

/**
 * Find batch by batchId
 */
export async function findBatchById(batchId, options = {}) {
  return model.batchModel.findByPk(Number(batchId), {
    attributes: ["batchId", "batch", "sessionId", "status"],
    transaction: options.transaction,
  });
}

/**
 * Find fee plan item with all sub-items and fee type catalog info
 */
export async function findFeePlanItemWithSubItems(feePlanItemId, options = {}) {
  return scoped(model.feePlanItemModel).findOne({
    where: { feePlanItemId: Number(feePlanItemId) },
    attributes: [
      "feePlanItemId",
      "name",
      "year",
      "batchId",
      "createDate",
      "publishStatus",
      "publishedAt",
      "instituteId",
      "universityId",
    ],
    include: [
      {
        model: model.feePlanSubItemsModel,
        as: "feePlanSubItems",
        attributes: ["feePlanSubitemId", "feePlanItemId", "feeTypeId", "amount", "isMainSubItem"],
        required: false,
        where: buildScope(model.feePlanSubItemsModel),
        include: [
          {
            model: model.feeTypeCatalogModel,
            as: "feeTypeCatalog",
            attributes: [
              "feeTypeCatalogId",
              "name",
              "description",
              "ledgerType",
              "refundable",
              "amount",
            ],
            required: false,
          },
        ],
      },
      {
        model: model.batchModel,
        as: "batch",
        attributes: ["batchId", "batch", "sessionId", "status"],
        required: false,
      },
      {
        model: model.billingScheduleItemsModel,
        as: "billingScheduleItems",
        required: false,
        where: buildScope(model.billingScheduleItemsModel),
        include: [
          {
            model: model.billingScheduleSubItemsModel,
            as: "subItems",
            required: false,
            where: buildScope(model.billingScheduleSubItemsModel),
            include: [
              {
                model: model.feePlanSubItemsModel,
                as: "feePlanSubItem",
                required: false,
                where: buildScope(model.feePlanSubItemsModel),
                include: [
                  {
                    model: model.feeTypeCatalogModel,
                    as: "feeTypeCatalog",
                    attributes: [
                      "feeTypeCatalogId",
                      "name",
                      "description",
                      "ledgerType",
                      "refundable",
                      "amount",
                    ],
                    required: false,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    transaction: options.transaction,
  });
}

/**
 * Find billing schedule item with full hierarchy (sub-items, fee plan, batch)
 */
export async function findBillingScheduleItemWithDetails(billingScheduleItemId, options = {}) {
  return scoped(model.billingScheduleItemsModel).findOne({
    where: { billingScheduleItemId: Number(billingScheduleItemId) },
    include: [
      {
        model: model.feePlanItemModel,
        as: "feePlanItem",
        required: false,
        include: [
          {
            model: model.batchModel,
            as: "batch",
            attributes: ["batchId", "batch", "sessionId", "status"],
            required: false,
          },
        ],
      },
      {
        model: model.billingScheduleSubItemsModel,
        as: "subItems",
        required: false,
        where: buildScope(model.billingScheduleSubItemsModel),
        include: [
          {
            model: model.feePlanSubItemsModel,
            as: "feePlanSubItem",
            required: false,
            where: buildScope(model.feePlanSubItemsModel),
            include: [
              {
                model: model.feeTypeCatalogModel,
                as: "feeTypeCatalog",
                attributes: [
                  "feeTypeCatalogId",
                  "name",
                  "description",
                  "ledgerType",
                  "refundable",
                  "amount",
                ],
                required: false,
              },
            ],
          },
        ],
      },
    ],
    transaction: options.transaction,
  });
}

/**
 * Find students for a given batch, optional studentId filter, and optional search
 */
export async function findStudentsByBatch({ batchId, studentId, search } = {}, options = {}) {
  const where = {};
  if (batchId) {
    where.batchId = Number(batchId);
  }
  if (studentId) {
    where.studentId = Number(studentId);
  }
  if (search) {
    const s = `%${search}%`;
    where[Op.or] = [
      { firstName: { [Op.like]: s } },
      { middleName: { [Op.like]: s } },
      { lastName: { [Op.like]: s } },
      { scholarNumber: { [Op.like]: s } },
      { enrollNumber: { [Op.like]: s } },
      { admissionNumber: { [Op.like]: s } },
    ];
  }

  return scoped(model.studentModel, {
    scopeConfig: { academicYear: false },
  }).findAll({
    where,
    attributes: [
      "studentId",
      "firstName",
      "middleName",
      "lastName",
      "scholarNumber",
      "enrollNumber",
      "admissionNumber",
      "batchId",
      "courseId",
      "sessionId",
      "instituteId",
      "universityId",
    ],
    include: [
      {
        model: model.courseModel,
        as: "course",
        attributes: ["courseId", "courseName", "courseCode", "courseDuration", "termType"],
        required: false,
      },
      {
        model: model.sessionModel,
        as: "studentSession",
        attributes: ["sessionId", "sessionName"],
        required: false,
      },
    ],
    order: [["firstName", "ASC"], ["studentId", "ASC"]],
    transaction: options.transaction,
  });
}

/**
 * Find active fee policies for a given batch, optional course, and year (via feePolicyBatchesModel)
 */
export async function findFeePoliciesForBatchAndYear({ batchId, courseId, year, instituteId } = {}, options = {}) {
  const where = {
    publishStatus: "published",
    isActive: true,
  };
  if (instituteId) {
    where.instituteId = instituteId;
  }

  const batchConditions = [];
  if (batchId) {
    batchConditions.push({ batchId: Number(batchId) });
  }
  if (courseId) {
    batchConditions.push({ courseId: Number(courseId), batchId: null });
  }

  const batchIncludeWhere = {};
  if (batchConditions.length === 1) {
    Object.assign(batchIncludeWhere, batchConditions[0]);
  } else if (batchConditions.length > 1) {
    batchIncludeWhere[Op.or] = batchConditions;
  }

  if (year != null) {
    const yearCond = [{ year: Number(year) }, { year: null }];
    if (batchIncludeWhere[Op.or]) {
      batchIncludeWhere[Op.and] = [{ [Op.or]: yearCond }];
    } else {
      batchIncludeWhere[Op.or] = yearCond;
    }
  }

  return scoped(model.feePolicyModel).findAll({
    where,
    include: [
      {
        model: model.feePolicyBatchesModel,
        as: "policyBatches",
        required: true,
        where: batchIncludeWhere,
        attributes: ["feePolicyBatchId", "feePolicyId", "batchId", "courseId", "year"],
      },
      {
        model: model.feePolicyComponentsModel,
        as: "policyComponents",
        required: false,
        attributes: ["feePolicyComponentId", "feePolicyId", "feeTypeCatalogId"],
        include: [
          {
            model: model.feeTypeCatalogModel,
            as: "feeTypeCatalog",
            attributes: ["feeTypeCatalogId", "name", "refundable"],
            required: false,
          },
        ],
      },
      {
        model: model.feePolicySlabsModel,
        as: "policySlabs",
        required: false,
        attributes: [
          "feePolicySlabId",
          "feePolicyId",
          "relativePeriod",
          "fromUnit",
          "toUnit",
          "slabValue",
          "orderIndex",
        ],
      },
    ],
    order: [["feePolicyId", "ASC"]],
    transaction: options.transaction,
  });
}

/**
 * Find active fee policies assigned to specific students (via feePolicyStudentsModel)
 */
export async function findFeePoliciesForStudents(studentIds, options = {}) {
  if (!studentIds || !studentIds.length) return [];

  return scoped(model.feePolicyStudentsModel).findAll({
    where: {
      studentId: { [Op.in]: studentIds.map(Number) },
    },
    include: [
      {
        model: model.feePolicyModel,
        as: "policy",
        required: true,
        where: {
          publishStatus: "published",
          isActive: true,
        },
        include: [
          {
            model: model.feePolicyComponentsModel,
            as: "policyComponents",
            required: false,
            attributes: ["feePolicyComponentId", "feePolicyId", "feeTypeCatalogId"],
            include: [
              {
                model: model.feeTypeCatalogModel,
                as: "feeTypeCatalog",
                attributes: ["feeTypeCatalogId", "name", "refundable"],
                required: false,
              },
            ],
          },
          {
            model: model.feePolicySlabsModel,
            as: "policySlabs",
            required: false,
            attributes: [
              "feePolicySlabId",
              "feePolicyId",
              "relativePeriod",
              "fromUnit",
              "toUnit",
              "slabValue",
              "orderIndex",
            ],
          },
        ],
      },
    ],
    transaction: options.transaction,
  });
}

/**
 * Find generated student invoices for a fee plan item and a set of student IDs
 */
export async function findInvoicesForPlanAndStudents({ feePlanItemId, studentIds }, options = {}) {
  if (!feePlanItemId || !studentIds || !studentIds.length) return [];

  return scoped(model.studentFeeInvoiceModel).findAll({
    where: {
      feePlanItemId: Number(feePlanItemId),
      studentId: { [Op.in]: studentIds.map(Number) },
      status: "generated",
    },
    attributes: [
      "studentFeeInvoiceId",
      "studentId",
      "feePlanItemId",
      "total",
      "paidAmount",
      "status",
      "paymentStatus",
      "createDate",
      "dueDate",
    ],
    include: [
      {
        model: model.studentFeeInvoiceItemsModel,
        as: "feeInvoiceItems",
        required: false,
        include: [
          {
            model: model.feeTypeCatalogModel,
            as: "feeTypeCatalog",
            attributes: ["feeTypeCatalogId", "name", "refundable"],
            required: false,
          },
        ],
      },
    ],
    transaction: options.transaction,
  });
}

/**
 * Check if student fee invoice already exists for this single student and fee plan item
 */
export async function findExistingInvoiceForStudentAndPlan({ studentId, feePlanItemId }, options = {}) {
  return scoped(model.studentFeeInvoiceModel).findOne({
    where: {
      studentId: Number(studentId),
      feePlanItemId: Number(feePlanItemId),
      status: "generated",
    },
    include: [
      {
        model: model.studentFeeInvoiceItemsModel,
        as: "feeInvoiceItems",
        required: false,
        include: [
          {
            model: model.feeTypeCatalogModel,
            as: "feeTypeCatalog",
            attributes: ["feeTypeCatalogId", "name", "refundable"],
            required: false,
          },
        ],
      },
    ],
    transaction: options.transaction,
  });
}

