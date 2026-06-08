import sequelize from "../database/sequelizeConfig.js";
import * as repo from "../repository/amcServiceTicketRepository.js";
import {
  currentTicketYear,
  formatTicketNumber,
  parseTicketNumberSequence,
} from "../utility/amcServiceTicketCode.js";

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function resolveNextTicketNumber(instituteId, transaction) {
  const year = currentTicketYear();
  const prefix = `TKT-${year}-`;

  const latest = await repo.findLatestTicketNumberByYear(instituteId, year, { transaction });
  const parsed = parseTicketNumberSequence(latest?.ticketNumber);
  const nextSequence = parsed?.year === year ? parsed.sequence + 1 : 1;

  return formatTicketNumber(year, nextSequence);
}

async function resolveAssetCategoryId(assetId, instituteId, transaction) {
  const asset = await repo.findAssetForTicket(assetId, instituteId, { transaction });
  if (!asset) {
    throw httpError("assetId not found or not in your institute", 404);
  }
  return asset.assetCategoryId;
}

async function resolveAmcVendorId(amcVendorId, assetCategoryId, instituteId, transaction) {
  if (amcVendorId !== undefined && amcVendorId !== null) {
    const vendor = await repo.findAmcVendorForTicket(amcVendorId, instituteId, { transaction });
    if (!vendor) {
      throw httpError("amcVendorId not found or not in your institute", 404);
    }
    return vendor.amcVendorId;
  }

  const vendor = await repo.findAmcVendorByCategoryId(assetCategoryId, instituteId, { transaction });
  return vendor?.amcVendorId ?? null;
}

function assertOpenTicket(status, actionLabel) {
  if (status !== "OPEN") {
    throw httpError(`Only OPEN tickets can be ${actionLabel}`, 400);
  }
}

function assertTicketNotClosed(status) {
  if (status === "CLOSED") {
    throw httpError("Closed tickets cannot be modified", 400);
  }
}

function assertTicketExists(row) {
  if (!row) {
    throw httpError("Service ticket not found or not in your institute", 404);
  }
  return row;
}

export async function addServiceTicket(body, instituteId) {
  return sequelize.transaction(async (transaction) => {
    const assetCategoryId = await resolveAssetCategoryId(body.assetId, instituteId, transaction);
    const amcVendorId = await resolveAmcVendorId(
      body.amcVendorId,
      assetCategoryId,
      instituteId,
      transaction
    );
    const ticketNumber = await resolveNextTicketNumber(instituteId, transaction);

    const created = await repo.createServiceTicket(
      {
        instituteId,
        ticketNumber,
        assetId: body.assetId,
        amcVendorId,
        assetCategoryId,
        issue: body.issue,
        issueType: body.issueType,
        problemDescription: body.problemDescription,
        downtimeStartedAt: body.downtimeStartedAt,
        priority: body.priority ?? "MEDIUM",
        status: "OPEN",
      },
      { transaction }
    );

    return repo.findServiceTicketById(created.serviceTicketId, instituteId, { transaction });
  });
}

export async function listServiceTickets(instituteId, query = {}) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const { rows, count } = await repo.findAndCountServiceTickets(instituteId, {
    ...query,
    page,
    limit,
  });

  return { rows, total: count, page, limit };
}

export async function getSingleServiceTicket(serviceTicketId, instituteId) {
  return repo.findServiceTicketById(serviceTicketId, instituteId);
}

export async function updateServiceTicket(serviceTicketId, body, instituteId) {
  return sequelize.transaction(async (transaction) => {
    const existing = assertTicketExists(
      await repo.findServiceTicketMetaById(serviceTicketId, instituteId, { transaction })
    );

    assertTicketNotClosed(existing.status);

    const { serviceTicketId: _id, ...payload } = body;

    if (payload.amcVendorId !== undefined && payload.amcVendorId !== null) {
      const vendor = await repo.findAmcVendorForTicket(payload.amcVendorId, instituteId, {
        transaction,
      });
      if (!vendor) {
        throw httpError("amcVendorId not found or not in your institute", 404);
      }
    }

    if (payload.status === undefined) {
      assertOpenTicket(existing.status, "updated");
    }

    const affected = await repo.updateServiceTicket(serviceTicketId, instituteId, payload, {
      transaction,
    });
    if (!affected) {
      throw httpError("Service ticket not found or not in your institute", 404);
    }

    return repo.findServiceTicketById(serviceTicketId, instituteId, { transaction });
  });
}

export async function deleteServiceTicket(serviceTicketId, instituteId) {
  return sequelize.transaction(async (transaction) => {
    const existing = assertTicketExists(
      await repo.findServiceTicketMetaById(serviceTicketId, instituteId, { transaction })
    );

    assertOpenTicket(existing.status, "deleted");

    const ok = await repo.deleteServiceTicket(serviceTicketId, instituteId, { transaction });
    if (!ok) {
      throw httpError("Service ticket not found or not in your institute", 404);
    }

    return true;
  });
}

export async function previewTicketNumber(instituteId) {
  return sequelize.transaction(async (transaction) => {
    const ticketNumber = await resolveNextTicketNumber(instituteId, transaction);

    return {
      ticketNumber,
      year: currentTicketYear(),
    };
  });
}

export async function getServiceTicketSummary(instituteId) {
  return repo.findServiceTicketSummaryStats(instituteId);
}
