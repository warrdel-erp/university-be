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
      "academicPeriod",
      "year",
      "batchId",
      "createDate",
      "dueDate",
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
    ],
    transaction: options.transaction,
  });
}

/**
 * Find active fee policies for a given batch and year
 */
export async function findFeePoliciesForBatchAndYear({ batchId, year, instituteId }, options = {}) {
  const where = {
    publishStatus: "published",
    isActive: true,
  };
  if (instituteId) {
    where.instituteId = instituteId;
  }

  const batchIncludeWhere = {
    batchId: Number(batchId),
  };
  if (year != null) {
    batchIncludeWhere[Op.or] = [{ year: Number(year) }, { year: null }];
  }

  return scoped(model.feePolicyModel).findAll({
    where,
    include: [
      {
        model: model.feePolicyBatchesModel,
        as: "policyBatches",
        required: true,
        where: batchIncludeWhere,
        attributes: ["feePolicyBatchId", "feePolicyId", "batchId", "year"],
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
 * Check if student fee invoice already exists for this student and fee plan item
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

