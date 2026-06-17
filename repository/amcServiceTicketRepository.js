import { Op } from "sequelize";
import sequelize from "../database/sequelizeConfig.js";
import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

const ticketListInclude = [
  {
    model: model.assetModel.unscoped(),
    as: "ticketAsset",
    attributes: [],
    required: true,
  },
  {
    model: model.amcVendorModel.unscoped(),
    as: "ticketVendor",
    attributes: [],
    required: false,
  },
  {
    model: model.assetCategoryModel.unscoped(),
    as: "ticketAssetCategory",
    attributes: [],
    required: true,
  },
];

function buildTicketWhere({ search, status, priority, amcVendorId } = {}) {
  const where = {};

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

function ticketListQuery(filters, options = {}) {
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
    where: buildTicketWhere(filters),
    include: ticketListInclude,
    order: [["serviceTicketId", "DESC"]],
    raw: true,
    subQuery: false,
    transaction: options.transaction,
  };
}

export async function findAssetForTicket(assetId, options = {}) {
  return scoped(model.assetModel).findOne({
    attributes: ["assetId", "assetCategoryId"],
    where: { assetId },
    transaction: options.transaction,
  });
}

export async function findAmcVendorForTicket(amcVendorId, options = {}) {
  return scoped(model.amcVendorModel).findOne({
    attributes: ["amcVendorId", "assetCategoryId"],
    where: { amcVendorId },
    transaction: options.transaction,
  });
}

export async function findAmcVendorByCategoryId(assetCategoryId, options = {}) {
  return scoped(model.amcVendorModel).findOne({
    attributes: ["amcVendorId"],
    where: { assetCategoryId },
    transaction: options.transaction,
  });
}

export async function findLatestTicketNumberByYear(year, options = {}) {
  return scoped(model.amcServiceTicketModel).findOne({
    attributes: ["ticketNumber"],
    where: {
      ticketNumber: { [Op.like]: `TKT-${year}-%` },
    },
    order: [["ticketNumber", "DESC"]],
    transaction: options.transaction,
  });
}

export async function createServiceTicket(data, options = {}) {
  return scoped(model.amcServiceTicketModel).create(data, { transaction: options.transaction });
}

export async function findAndCountServiceTickets(options = {}) {
  const { search, status, priority, amcVendorId, page = 1, limit = 20, transaction } = options;

  return scoped(model.amcServiceTicketModel).findAndCountAll({
    ...ticketListQuery({ search, status, priority, amcVendorId }, { transaction }),
    limit,
    offset: (page - 1) * limit,
  });
}

export async function findServiceTicketById(serviceTicketId, options = {}) {
  return scoped(model.amcServiceTicketModel).findOne({
    ...ticketListQuery({}, options),
    where: { serviceTicketId },
  });
}

export async function findServiceTicketMetaById(serviceTicketId, options = {}) {
  return scoped(model.amcServiceTicketModel).findOne({
    attributes: ["serviceTicketId", "status"],
    where: { serviceTicketId },
    raw: true,
    transaction: options.transaction,
  });
}

export async function updateServiceTicket(serviceTicketId, payload, options = {}) {
  const [affected] = await scoped(model.amcServiceTicketModel).update(payload, {
    where: { serviceTicketId },
    transaction: options.transaction,
  });
  return affected;
}

export async function deleteServiceTicket(serviceTicketId, options = {}) {
  const deleted = await scoped(model.amcServiceTicketModel).destroy({
    where: { serviceTicketId },
    transaction: options.transaction,
  });
  return deleted > 0;
}

export async function findServiceTicketSummaryStats(options = {}) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const row = await scoped(model.amcServiceTicketModel).findOne({
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
