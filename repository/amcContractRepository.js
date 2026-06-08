import { Op } from "sequelize";
import sequelize from "../database/sequelizeConfig.js";
import * as model from "../models/index.js";
import {
  buildExpiryStatusWhere,
  NEAR_EXPIRY_DAYS,
} from "../utility/amcContractStatus.js";

function contractListInclude() {
  return {
    model: model.amcVendorModel,
    as: "contractVendor",
    attributes: [],
    required: true,
    include: [
      {
        model: model.assetCategoryModel,
        as: "vendorCategory",
        attributes: [],
        required: true,
      },
    ],
  };
}

function contractListAttributes() {
  return [
    [sequelize.col("amc_contract.amc_contract_id"), "amcContractId"],
    [sequelize.col("amc_contract.contract_number"), "contractNumber"],
    [sequelize.col("amc_contract.contract_name"), "contractName"],
    [sequelize.col("amc_contract.approval_status"), "approvalStatus"],
    [sequelize.col("amc_contract.amc_vendor_id"), "amcVendorId"],
    [sequelize.col("contractVendor.vendor_name"), "vendorName"],
    [sequelize.col("contractVendor.vendor_code"), "vendorCode"],
    [sequelize.col("contractVendor.asset_category_id"), "assetCategoryId"],
    [sequelize.col("contractVendor.vendorCategory.name"), "vendorCategory"],
    [sequelize.col("amc_contract.contract_type"), "contractType"],
    [sequelize.col("amc_contract.start_date"), "startDate"],
    [sequelize.col("amc_contract.end_date"), "endDate"],
    [sequelize.col("amc_contract.contract_value"), "contractValue"],
    [sequelize.col("amc_contract.payment_terms"), "paymentTerms"],
    [sequelize.col("amc_contract.service_visit_frequency"), "serviceVisitFrequency"],
    [sequelize.col("amc_contract.sla_response_hours"), "slaResponseHours"],
    [sequelize.col("amc_contract.sla_resolution_hours"), "slaResolutionHours"],
    [sequelize.col("amc_contract.description"), "description"],
    [
      sequelize.literal(`(
        CASE
          WHEN amc_contract.end_date < CURDATE() THEN 'EXPIRED'
          WHEN amc_contract.end_date <= DATE_ADD(CURDATE(), INTERVAL ${NEAR_EXPIRY_DAYS} DAY) THEN 'NEAR_EXPIRY'
          ELSE 'ACTIVE'
        END
      )`),
      "status",
    ],
    [sequelize.literal("0"), "totalAssetsCovered"],
    [sequelize.col("amc_contract.institute_id"), "instituteId"],
    [sequelize.col("amc_contract.created_at"), "createdAt"],
    [sequelize.col("amc_contract.updated_at"), "updatedAt"],
  ];
}

function buildContractWhere(instituteId, { search, approvalStatus, status } = {}) {
  const where = {
    instituteId,
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

export async function findAmcVendorForContract(amcVendorId, instituteId, options = {}) {
  return model.amcVendorModel.findOne({
    attributes: ["amcVendorId", "vendorName", "vendorCode", "assetCategoryId"],
    where: { amcVendorId, instituteId },
    transaction: options.transaction,
  });
}

export async function findContractByVendorId(amcVendorId, instituteId, options = {}) {
  const { excludeAmcContractId, transaction } = options;

  const where = { amcVendorId, instituteId };
  if (excludeAmcContractId !== undefined) {
    where.amcContractId = { [Op.ne]: excludeAmcContractId };
  }

  return model.amcContractModel.findOne({
    attributes: ["amcContractId", "contractNumber"],
    where,
    transaction,
  });
}

export async function findLatestContractNumberByPrefix(instituteId, prefix, options = {}) {
  return model.amcContractModel.findOne({
    attributes: ["contractNumber"],
    where: {
      instituteId,
      contractNumber: { [Op.like]: `${prefix}%` },
    },
    order: [["contractNumber", "DESC"]],
    transaction: options.transaction,
  });
}

export async function createAmcContract(data, options = {}) {
  return model.amcContractModel.create(data, { transaction: options.transaction });
}

export async function findAndCountAmcContracts(instituteId, options = {}) {
  const { search, approvalStatus, status, page = 1, limit = 20, transaction } = options;
  const offset = (page - 1) * limit;

  return model.amcContractModel.findAndCountAll({
    attributes: contractListAttributes(),
    where: buildContractWhere(instituteId, { search, approvalStatus, status }),
    include: [contractListInclude()],
    order: [["amcContractId", "DESC"]],
    limit,
    offset,
    raw: true,
    transaction,
    subQuery: false,
  });
}

export async function findAmcContractById(amcContractId, instituteId, options = {}) {
  return model.amcContractModel.findOne({
    attributes: contractListAttributes(),
    where: { amcContractId, instituteId },
    include: [contractListInclude()],
    raw: true,
    transaction: options.transaction,
  });
}

export async function findAmcContractMetaById(amcContractId, instituteId, options = {}) {
  return model.amcContractModel.findOne({
    attributes: ["amcContractId", "approvalStatus", "startDate", "endDate"],
    where: { amcContractId, instituteId },
    raw: true,
    transaction: options.transaction,
  });
}

export async function updateAmcContract(amcContractId, instituteId, payload, options = {}) {
  const [affected] = await model.amcContractModel.update(payload, {
    where: { amcContractId, instituteId },
    transaction: options.transaction,
  });
  return affected;
}

export async function deleteAmcContract(amcContractId, instituteId, options = {}) {
  const deleted = await model.amcContractModel.destroy({
    where: { amcContractId, instituteId },
    transaction: options.transaction,
  });
  return deleted > 0;
}

export async function findContractSummaryStats(instituteId, options = {}) {
  const baseWhere = { instituteId };
  const { transaction } = options;

  const [totalContracts, sumRow, expiredContracts, nearExpiryContracts, activeContracts] =
    await Promise.all([
      model.amcContractModel.count({ where: baseWhere, transaction }),
      model.amcContractModel.findOne({
        attributes: [[sequelize.fn("SUM", sequelize.col("contract_value")), "totalContractsValue"]],
        where: baseWhere,
        raw: true,
        transaction,
      }),
      model.amcContractModel.count({
        where: { ...baseWhere, ...buildExpiryStatusWhere("EXPIRED", Op) },
        transaction,
      }),
      model.amcContractModel.count({
        where: { ...baseWhere, ...buildExpiryStatusWhere("NEAR_EXPIRY", Op) },
        transaction,
      }),
      model.amcContractModel.count({
        where: { ...baseWhere, ...buildExpiryStatusWhere("ACTIVE", Op) },
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
