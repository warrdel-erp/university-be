import { Op } from "sequelize";
import sequelize from "../database/sequelizeConfig.js";
import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";
import {
  buildExpiryStatusWhere,
  deriveContractStatus,
} from "../utility/amcContractStatus.js";

const contractListInclude = [
  {
    model: model.amcVendorModel.unscoped(),
    as: "contractVendor",
    attributes: ["vendorName", "vendorCode", "assetCategoryId"],
    required: true,
    include: [
      {
        model: model.assetCategoryModel.unscoped(),
        as: "vendorCategory",
        attributes: ["name"],
        required: true,
      },
    ],
  },
];

function formatContractRow(row) {
  const plain = typeof row.get === "function" ? row.get({ plain: true }) : row;
  const vendor = plain.contractVendor;

  return {
    amcContractId: plain.amcContractId,
    contractNumber: plain.contractNumber,
    contractName: plain.contractName,
    approvalStatus: plain.approvalStatus,
    amcVendorId: plain.amcVendorId,
    vendorName: vendor?.vendorName ?? null,
    vendorCode: vendor?.vendorCode ?? null,
    assetCategoryId: vendor?.assetCategoryId ?? null,
    vendorCategory: vendor?.vendorCategory?.name ?? null,
    contractType: plain.contractType,
    startDate: plain.startDate,
    endDate: plain.endDate,
    contractValue: plain.contractValue,
    paymentTerms: plain.paymentTerms,
    serviceVisitFrequency: plain.serviceVisitFrequency,
    slaResponseHours: plain.slaResponseHours,
    slaResolutionHours: plain.slaResolutionHours,
    description: plain.description,
    status: deriveContractStatus(plain.endDate),
    totalAssetsCovered: 0,
    instituteId: plain.instituteId,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
}

function buildContractWhere({ search, approvalStatus, status } = {}) {
  const where = {
    ...buildExpiryStatusWhere(status, Op),
  };

  if (approvalStatus) {
    where.approvalStatus = approvalStatus;
  }

  if (search) {
    const term = `%${search}%`;
    where[Op.or] = [
      { contractNumber: { [Op.like]: term } },
      { contractName: { [Op.like]: term } },
      { description: { [Op.like]: term } },
      { contractType: { [Op.like]: term } },
      { paymentTerms: { [Op.like]: term } },
      { serviceVisitFrequency: { [Op.like]: term } },
      { "$contractVendor.vendor_name$": { [Op.like]: term } },
      { "$contractVendor.vendor_code$": { [Op.like]: term } },
      { "$contractVendor.vendorCategory.name$": { [Op.like]: term } },
    ];
  }

  return where;
}

export async function findAmcVendorForContract(amcVendorId, options = {}) {
  return scoped(model.amcVendorModel).findOne({
    attributes: ["amcVendorId", "vendorName", "vendorCode", "assetCategoryId"],
    where: { amcVendorId },
    transaction: options.transaction,
  });
}

export async function findContractByVendorId(amcVendorId, options = {}) {
  const { excludeAmcContractId, transaction } = options;

  const where = { amcVendorId };
  if (excludeAmcContractId !== undefined) {
    where.amcContractId = { [Op.ne]: excludeAmcContractId };
  }

  return scoped(model.amcContractModel).findOne({
    attributes: ["amcContractId", "contractNumber"],
    where,
    transaction,
  });
}

export async function findLatestContractNumberByPrefix(prefix, options = {}) {
  return scoped(model.amcContractModel).findOne({
    attributes: ["contractNumber"],
    where: {
      contractNumber: { [Op.like]: `${prefix}%` },
    },
    order: [["contractNumber", "DESC"]],
    transaction: options.transaction,
  });
}

export async function createAmcContract(data, options = {}) {
  return scoped(model.amcContractModel).create(data, { transaction: options.transaction });
}

export async function findAndCountAmcContracts(options = {}) {
  const { search, approvalStatus, status, page = 1, limit = 20, transaction } = options;
  const offset = (page - 1) * limit;

  const { rows, count } = await scoped(model.amcContractModel).findAndCountAll({
    where: buildContractWhere({ search, approvalStatus, status }),
    include: contractListInclude,
    order: [["amcContractId", "DESC"]],
    limit,
    offset,
    transaction,
    subQuery: false,
  });

  return {
    rows: rows.map(formatContractRow),
    count,
  };
}

export async function findAmcContractById(amcContractId, options = {}) {
  const row = await scoped(model.amcContractModel).findOne({
    where: { amcContractId },
    include: contractListInclude,
    transaction: options.transaction,
  });

  return row ? formatContractRow(row) : null;
}

export async function findAmcContractMetaById(amcContractId, options = {}) {
  return scoped(model.amcContractModel).findOne({
    attributes: ["amcContractId", "approvalStatus", "startDate", "endDate"],
    where: { amcContractId },
    raw: true,
    transaction: options.transaction,
  });
}

export async function updateAmcContract(amcContractId, payload, options = {}) {
  const [affected] = await scoped(model.amcContractModel).update(payload, {
    where: { amcContractId },
    transaction: options.transaction,
  });
  return affected;
}

export async function deleteAmcContract(amcContractId, options = {}) {
  const deleted = await scoped(model.amcContractModel).destroy({
    where: { amcContractId },
    transaction: options.transaction,
  });
  return deleted > 0;
}

export async function findContractSummaryStats(options = {}) {
  const { transaction } = options;

  const [totalContracts, sumRow, expiredContracts, nearExpiryContracts, activeContracts] =
    await Promise.all([
      scoped(model.amcContractModel).count({ transaction }),
      scoped(model.amcContractModel).findOne({
        attributes: [[sequelize.fn("SUM", sequelize.col("contract_value")), "totalContractsValue"]],
        raw: true,
        transaction,
      }),
      scoped(model.amcContractModel).count({
        where: buildExpiryStatusWhere("EXPIRED", Op),
        transaction,
      }),
      scoped(model.amcContractModel).count({
        where: buildExpiryStatusWhere("NEAR_EXPIRY", Op),
        transaction,
      }),
      scoped(model.amcContractModel).count({
        where: buildExpiryStatusWhere("ACTIVE", Op),
        transaction,
      }),
    ]);

  return {
    totalContracts,
    totalContractsValue: sumRow?.totalContractsValue,
    expiredContracts,
    nearExpiryContracts,
    activeContracts,
  };
}
