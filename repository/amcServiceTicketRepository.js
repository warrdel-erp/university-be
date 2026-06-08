import { Op } from "sequelize";
import sequelize from "../database/sequelizeConfig.js";
import * as model from "../models/index.js";

const ticketListInclude = [
  {
    model: model.assetModel,
    as: "ticketAsset",
    attributes: [],
    required: true,
  },
  {
    model: model.amcVendorModel,
    as: "ticketVendor",
    attributes: [],
    required: false,
  },
  {
    model: model.assetCategoryModel,
    as: "ticketAssetCategory",
    attributes: [],
    required: true,
  },
];

function buildTicketWhere(instituteId, { search, status, priority, amcVendorId } = {}) {
  const where = { instituteId };

  if (status) {
    where.status = status;
  }

  if (priority) {
    where.priority = priority;
  }

  if (amcVendorId) {
    where.amcVendorId = amcVendorId;
  }

  if (search) {
    const term = `%${search}%`;
    where[Op.or] = [
      { ticketNumber: { [Op.like]: term } },
      { issue: { [Op.like]: term } },
      { problemDescription: { [Op.like]: term } },
      { "$ticketAsset.name$": { [Op.like]: term } },
      { "$ticketAsset.code$": { [Op.like]: term } },
      { "$ticketVendor.vendor_name$": { [Op.like]: term } },
      { "$ticketVendor.vendor_code$": { [Op.like]: term } },
    ];
  }

  return where;
}

function ticketListQuery(instituteId, filters, options = {}) {
  return {
    attributes: {
      include: [
        [sequelize.col("ticketAsset.name"), "assetName"],
        [sequelize.col("ticketAsset.code"), "assetCode"],
        [sequelize.col("ticketVendor.vendor_name"), "vendorName"],
        [sequelize.col("ticketVendor.vendor_code"), "vendorCode"],
        [sequelize.col("ticketAssetCategory.name"), "assetCategoryName"],
      ],
    },
    where: buildTicketWhere(instituteId, filters),
    include: ticketListInclude,
    order: [["serviceTicketId", "DESC"]],
    raw: true,
    subQuery: false,
    transaction: options.transaction,
  };
}

export async function findAssetForTicket(assetId, instituteId, options = {}) {
  return model.assetModel.findOne({
    attributes: ["assetId", "assetCategoryId"],
    where: { assetId, instituteId },
    transaction: options.transaction,
  });
}

export async function findAmcVendorForTicket(amcVendorId, instituteId, options = {}) {
  return model.amcVendorModel.findOne({
    attributes: ["amcVendorId", "assetCategoryId"],
    where: { amcVendorId, instituteId },
    transaction: options.transaction,
  });
}

export async function findAmcVendorByCategoryId(assetCategoryId, instituteId, options = {}) {
  return model.amcVendorModel.findOne({
    attributes: ["amcVendorId"],
    where: { assetCategoryId, instituteId },
    transaction: options.transaction,
  });
}

export async function findLatestTicketNumberByYear(instituteId, year, options = {}) {
  return model.amcServiceTicketModel.findOne({
    attributes: ["ticketNumber"],
    where: {
      instituteId,
      ticketNumber: { [Op.like]: `TKT-${year}-%` },
    },
    order: [["ticketNumber", "DESC"]],
    transaction: options.transaction,
  });
}

export async function createServiceTicket(data, options = {}) {
  return model.amcServiceTicketModel.create(data, { transaction: options.transaction });
}

export async function findAndCountServiceTickets(instituteId, options = {}) {
  const { search, status, priority, amcVendorId, page = 1, limit = 20, transaction } = options;

  return model.amcServiceTicketModel.findAndCountAll({
    ...ticketListQuery(instituteId, { search, status, priority, amcVendorId }, { transaction }),
    limit,
    offset: (page - 1) * limit,
  });
}

export async function findServiceTicketById(serviceTicketId, instituteId, options = {}) {
  return model.amcServiceTicketModel.findOne({
    ...ticketListQuery(instituteId, {}, options),
    where: { serviceTicketId, instituteId },
  });
}

export async function findServiceTicketMetaById(serviceTicketId, instituteId, options = {}) {
  return model.amcServiceTicketModel.findOne({
    attributes: ["serviceTicketId", "status"],
    where: { serviceTicketId, instituteId },
    raw: true,
    transaction: options.transaction,
  });
}

export async function updateServiceTicket(serviceTicketId, instituteId, payload, options = {}) {
  const [affected] = await model.amcServiceTicketModel.update(payload, {
    where: { serviceTicketId, instituteId },
    transaction: options.transaction,
  });
  return affected;
}

export async function deleteServiceTicket(serviceTicketId, instituteId, options = {}) {
  const deleted = await model.amcServiceTicketModel.destroy({
    where: { serviceTicketId, instituteId },
    transaction: options.transaction,
  });
  return deleted > 0;
}

export async function findServiceTicketSummaryStats(instituteId, options = {}) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const row = await model.amcServiceTicketModel.findOne({
    attributes: [
      [
        sequelize.fn("SUM", sequelize.literal("CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END")),
        "openTickets",
      ],
      [
        sequelize.fn("SUM", sequelize.literal("CASE WHEN status = 'ASSIGNED' THEN 1 ELSE 0 END")),
        "assignedTickets",
      ],
      [
        sequelize.fn(
          "SUM",
          sequelize.literal("CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END")
        ),
        "inProgressTickets",
      ],
      [
        sequelize.fn("SUM", sequelize.literal("CASE WHEN status = 'ESCALATED' THEN 1 ELSE 0 END")),
        "escalatedTickets",
      ],
      [
        sequelize.fn(
          "SUM",
          sequelize.literal(
            `CASE WHEN status = 'RESOLVED' AND updated_at >= '${monthStart.toISOString()}' THEN 1 ELSE 0 END`
          )
        ),
        "resolvedMtd",
      ],
    ],
    where: { instituteId },
    raw: true,
    transaction: options.transaction,
  });

  return {
    openTickets: Number(row?.openTickets ?? 0),
    assignedTickets: Number(row?.assignedTickets ?? 0),
    inProgressTickets: Number(row?.inProgressTickets ?? 0),
    escalatedTickets: Number(row?.escalatedTickets ?? 0),
    resolvedMtd: Number(row?.resolvedMtd ?? 0),
  };
}
