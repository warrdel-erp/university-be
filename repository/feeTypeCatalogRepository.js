import { Op } from "sequelize";
import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

function catalogIncludeCategory() {
  return [
    {
      model: model.feeTypeCategoryModel,
      as: "feeTypeCategory",
      attributes: ["feeTypeCategoryId", "name", "description", "instituteId"],
      where: buildScope(model.feeTypeCategoryModel),
      required: true,
    },
  ];
}

export async function createFeeTypeCatalog(data, options = {}) {  return scoped(model.feeTypeCatalogModel).create(data, { transaction: options.transaction });
}

export async function findFeeTypeCatalogsByInstitute(options = {}) {
  const {
    transaction,
    page = 1,
    limit = 10,
  } = options;

  const parsedPage = Math.max(Number(page) || 1, 1);
  const parsedLimit = Math.min(
    Math.max(Number(limit) || 10, 1),
    100
  );

  const offset = (parsedPage - 1) * parsedLimit;

  const { rows, count } =
    await scoped(model.feeTypeCatalogModel).findAndCountAll({
      attributes: {
        exclude: ["createdAt", "updatedAt"],
      },

      include: catalogIncludeCategory(),

      order: [["feeTypeCatalogId", "ASC"]],

      limit: parsedLimit,
      offset,

      distinct: true,

      transaction,
    });

  return {
    data: rows,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total: count,
      totalPages: Math.ceil(count / parsedLimit),
    },
  };
}

export async function findFeeTypeCatalogById(feeTypeCatalogId, options = {}) {
  const { transaction } = options;
  return scoped(model.feeTypeCatalogModel).findOne({
    attributes: { exclude: ["createdAt", "updatedAt"] },
    where: { feeTypeCatalogId },
    include: catalogIncludeCategory(),
    transaction,
  });
}

export async function findFeeTypeCatalogsByIds(feeTypeCatalogIds, options = {}) {
  const { transaction } = options;
  if (!feeTypeCatalogIds.length) {
    return [];
  }

  return scoped(model.feeTypeCatalogModel).findAll({
    attributes: { exclude: ["createdAt", "updatedAt"] },
    where: {
      feeTypeCatalogId: { [Op.in]: feeTypeCatalogIds },
    },
    transaction,
  });
}

export async function findFeeTypeCategoryByIdForInstitute(feeTypeCategoryId, options = {}) {
  return scoped(model.feeTypeCategoryModel).findOne({
    attributes: ["feeTypeCategoryId", "instituteId"],
    where: { feeTypeCategoryId },
    transaction: options.transaction,
  });
}

export async function updateFeeTypeCatalog(feeTypeCatalogId, payload, options = {}) {
  const { transaction } = options;
  const [affected] = await scoped(model.feeTypeCatalogModel).update(payload, {
    where: { feeTypeCatalogId },
    transaction,
  });
  return affected;
}

export async function countPlanSubItemsForCatalog(feeTypeCatalogId, options = {}) {
  const { transaction } = options;
  const catalog = await scoped(model.feeTypeCatalogModel).findOne({
    attributes: ["feeTypeCatalogId"],
    where: { feeTypeCatalogId },
    transaction,
  });
  if (!catalog) {
    return 0;
  }

  return scoped(model.feePlanSubItemsModel).count({
    where: { feeTypeId: feeTypeCatalogId },
    transaction,
  });
}

export async function countInvoiceItemsForCatalog(feeTypeCatalogId, options = {}) {
  const { transaction } = options;
  const catalog = await scoped(model.feeTypeCatalogModel).findOne({
    attributes: ["feeTypeCatalogId"],
    where: { feeTypeCatalogId },
    transaction,
  });
  if (!catalog) {
    return 0;
  }

  return scoped(model.studentFeeInvoiceItemsModel).count({
    where: { feeTypeId: feeTypeCatalogId },
    include: [
      {
        model: model.studentFeeInvoiceModel,
        as: "studentFeeInvoice",
        attributes: [],
        required: true,
        where: buildScope(model.studentFeeInvoiceModel),
      },
    ],
    transaction,
  });
}

export async function deleteFeeTypeCatalog(feeTypeCatalogId, options = {}) {
  const { transaction } = options;
  const deleted = await scoped(model.feeTypeCatalogModel).destroy({
    where: { feeTypeCatalogId },
    transaction,
  });
  return deleted > 0;
}
