import { Op } from "sequelize";
import sequelize from "../database/sequelizeConfig.js";
import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

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

function buildTicketWhere({ search, status, priority, amcVendorId, assetIds } = {}) {
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

  if (assetIds !== undefined && assetIds.length) {
    where.assetId = { [Op.in]: assetIds };
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

export async function findAssetIdsIssuedToMember(userId, options = {}) {
  const rows = await scoped(model.assetIssueInventoryItemModel).findAll({
    attributes: [[sequelize.col("inventoryItem.asset_id"), "assetId"]],
    where: { assetReturnTransactionId: null },
    include: [
      {
        model: model.assetIssueTransactionModel,
        as: "transaction",
        attributes: [],
        required: true,
        where: {
          memberId: userId,
          memberType: "TEACHER",
          ...buildScope(model.assetIssueTransactionModel),
        },
      },
      {
        model: model.assetInventoryItemModel,
        as: "inventoryItem",
        attributes: [],
        required: true,
        where: buildScope(model.assetInventoryItemModel),
      },
    ],
    group: [sequelize.col("inventoryItem.asset_id")],
    raw: true,
    subQuery: false,
    transaction: options.transaction,
  });

  const assetIds = [];
  for (const row of rows) {
    assetIds.push(row.assetId);
  }

  return assetIds;
}

export async function findAndCountServiceTickets(options = {}) {
  const { search, status, priority, amcVendorId, assetIds, page = 1, limit = 20, transaction } =
    options;

  if (assetIds !== undefined && !assetIds.length) {
    return { rows: [], count: 0 };
  }

  return scoped(model.amcServiceTicketModel).findAndCountAll({
    ...ticketListQuery({ search, status, priority, amcVendorId, assetIds }, { transaction }),
    limit,
    offset: (page - 1) * limit,
  });
}

export async function findServiceTicketById(serviceTicketId, options = {}) {
  const { assetIds, transaction } = options;
  const where = { serviceTicketId };

  if (assetIds !== undefined) {
    if (!assetIds.length) {
      return null;
    }
    where.assetId = { [Op.in]: assetIds };
  }

  return scoped(model.amcServiceTicketModel).findOne({
    ...ticketListQuery({}, { transaction }),
    where,
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
  const { assetIds, transaction } = options;

  if (assetIds !== undefined && !assetIds.length) {
    return {
      openTickets: 0,
      assignedTickets: 0,
      inProgressTickets: 0,
      escalatedTickets: 0,
      resolvedMtd: 0,
    };
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const where = {};
  if (assetIds !== undefined && assetIds.length) {
    where.assetId = { [Op.in]: assetIds };
  }

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
    where,
    raw: true,
    transaction,
  });

  return {
    openTickets: Number(row?.openTickets ?? 0),
    assignedTickets: Number(row?.assignedTickets ?? 0),
    inProgressTickets: Number(row?.inProgressTickets ?? 0),
    escalatedTickets: Number(row?.escalatedTickets ?? 0),
    resolvedMtd: Number(row?.resolvedMtd ?? 0),
  };
}
