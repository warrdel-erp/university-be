import { Op } from "sequelize";
import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

function feePolicyIncludes() {
  return [
    {
      model: model.feePolicyComponentsModel,
      as: "policyComponents",
      required: false,
      attributes: ["feePolicyComponentId", "feePolicyId", "feeTypeCatalogId"],
      include: [
        {
          model: model.feeTypeCatalogModel,
          as: "feeTypeCatalog",
          attributes: ["feeTypeCatalogId", "name", "amount", "ledgerType", "refundable"],
          required: false,
        },
      ],
    },
    {
      model: model.feePolicyBatchesModel,
      as: "policyBatches",
      required: false,
      attributes: ["feePolicyBatchId", "feePolicyId", "batchId", "year"],
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
  ];
}

export async function createFeePolicy(data, options = {}) {
  return scoped(model.feePolicyModel).create(data, { transaction: options.transaction });
}

export async function bulkCreateFeePolicyComponents(rows, options = {}) {
  if (!rows || !rows.length) return [];
  return model.feePolicyComponentsModel.bulkCreate(rows, { transaction: options.transaction });
}

export async function bulkCreateFeePolicyBatches(rows, options = {}) {
  if (!rows || !rows.length) return [];
  return model.feePolicyBatchesModel.bulkCreate(rows, { transaction: options.transaction });
}

export async function bulkCreateFeePolicySlabs(rows, options = {}) {
  if (!rows || !rows.length) return [];
  return model.feePolicySlabsModel.bulkCreate(rows, { transaction: options.transaction });
}

export async function findFeePolicyById(feePolicyId, options = {}) {
  return scoped(model.feePolicyModel).findOne({
    where: { feePolicyId: Number(feePolicyId) },
    include: feePolicyIncludes(),
    order: [[{ model: model.feePolicySlabsModel, as: "policySlabs" }, "orderIndex", "ASC"]],
    transaction: options.transaction,
  });
}

export async function findFeePolicies({
  publishStatus,
  effect,
  calculationType,
  batchId,
  year,
  search,
  page,
  limit,
} = {}, options = {}) {
  const where = {};

  if (publishStatus && publishStatus !== "all") {
    where.publishStatus = publishStatus;
  }

  if (effect) {
    where.effect = effect;
  }

  if (calculationType) {
    where.calculationType = calculationType;
  }

  if (search && search.trim()) {
    where[Op.or] = [
      { policyName: { [Op.like]: `%${search.trim()}%` } },
      { description: { [Op.like]: `%${search.trim()}%` } },
    ];
  }

  const include = feePolicyIncludes();

  if (batchId || year) {
    const batchInclude = include.find((inc) => inc.as === "policyBatches");
    if (batchInclude) {
      batchInclude.where = {};
      if (batchId) batchInclude.where.batchId = Number(batchId);
      if (year) batchInclude.where.year = Number(year);
      batchInclude.required = true;
    }
  }

  const queryOptions = {
    where,
    include,
    order: [["feePolicyId", "DESC"]],
    distinct: true,
    transaction: options.transaction,
  };

  const isPaginated = page != null || limit != null;
  if (isPaginated) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 10);
    queryOptions.limit = limitNum;
    queryOptions.offset = (pageNum - 1) * limitNum;
  }

  const { count: totalRecords, rows } = await scoped(model.feePolicyModel).findAndCountAll(queryOptions);

  const limitNum = isPaginated ? Math.max(1, Number(limit) || 10) : totalRecords;
  const pageNum = isPaginated ? Math.max(1, Number(page) || 1) : 1;

  return {
    totalRecords,
    totalPages: isPaginated ? Math.ceil(totalRecords / limitNum) || 1 : 1,
    currentPage: pageNum,
    pageSize: limitNum,
    isPaginated,
    rows,
  };
}

export async function updateFeePolicy(feePolicyId, data, options = {}) {
  return scoped(model.feePolicyModel).update(data, {
    where: { feePolicyId: Number(feePolicyId) },
    transaction: options.transaction,
  });
}

export async function deleteFeePolicyComponents(feePolicyId, options = {}) {
  return model.feePolicyComponentsModel.destroy({
    where: { feePolicyId: Number(feePolicyId) },
    transaction: options.transaction,
  });
}

export async function deleteFeePolicyBatches(feePolicyId, options = {}) {
  return model.feePolicyBatchesModel.destroy({
    where: { feePolicyId: Number(feePolicyId) },
    transaction: options.transaction,
  });
}

export async function deleteFeePolicySlabs(feePolicyId, options = {}) {
  return model.feePolicySlabsModel.destroy({
    where: { feePolicyId: Number(feePolicyId) },
    transaction: options.transaction,
  });
}

export async function deleteFeePolicy(feePolicyId, options = {}) {
  return scoped(model.feePolicyModel).destroy({
    where: { feePolicyId: Number(feePolicyId) },
    transaction: options.transaction,
  });
}
