import sequelize from "../database/sequelizeConfig.js";
import * as repo from "../repository/amcServiceTicketRepository.js";
import {
  currentTicketYear,
  formatTicketNumber,
  parseTicketNumberSequence,
} from "../utility/amcServiceTicketCode.js";

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
    throw new Error("assetId not found or not in your institute");
  }
  return asset.assetCategoryId;
}

async function resolveAmcVendorId(amcVendorId, assetCategoryId, instituteId, transaction) {
  if (amcVendorId !== undefined && amcVendorId !== null) {
    const vendor = await repo.findAmcVendorForTicket(amcVendorId, instituteId, { transaction });
    if (!vendor) {
      throw new Error("amcVendorId not found or not in your institute");
    }
    return vendor.amcVendorId;
  }

  const vendor = await repo.findAmcVendorByCategoryId(assetCategoryId, instituteId, { transaction });
  return vendor?.amcVendorId ?? null;
}

function assertOpenTicket(status, actionLabel) {
  if (status !== "OPEN") {
    throw new Error(`Only OPEN tickets can be ${actionLabel}`);
  }
}

function assertTicketNotClosed(status) {
  if (status === "CLOSED") {
    throw new Error("Closed tickets cannot be modified");
  }
}

function assertTicketExists(row) {
  if (!row) {
    throw new Error("Service ticket not found or not in your institute");
  }
  return row;
}

export async function addServiceTicket(body, instituteId) {
  try {
    return await sequelize.transaction(async (transaction) => {
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
  } catch (error) {
    throw new Error(`Failed to create service ticket: ${error.message}`);
  }
}

export async function listServiceTickets(instituteId, query = {}) {
  try {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { rows, count } = await repo.findAndCountServiceTickets(instituteId, {
      ...query,
      page,
      limit,
    });

    return { rows, total: count, page, limit };
  } catch (error) {
    throw new Error(`Failed to fetch service tickets: ${error.message}`);
  }
}

export async function getSingleServiceTicket(serviceTicketId, instituteId) {
  try {
    return await repo.findServiceTicketById(serviceTicketId, instituteId);
  } catch (error) {
    throw new Error(`Failed to fetch service ticket: ${error.message}`);
  }
}

export async function updateServiceTicket(serviceTicketId, body, instituteId) {
  try {
    return await sequelize.transaction(async (transaction) => {
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
          throw new Error("amcVendorId not found or not in your institute");
        }
      }

      if (payload.status === undefined) {
        assertOpenTicket(existing.status, "updated");
      }

      const affected = await repo.updateServiceTicket(serviceTicketId, instituteId, payload, {
        transaction,
      });
      if (!affected) {
        throw new Error("Service ticket not found or not in your institute");
      }

      return repo.findServiceTicketById(serviceTicketId, instituteId, { transaction });
    });
  } catch (error) {
    throw new Error(`Failed to update service ticket: ${error.message}`);
  }
}

export async function deleteServiceTicket(serviceTicketId, instituteId) {
  try {
    return await sequelize.transaction(async (transaction) => {
      const existing = assertTicketExists(
        await repo.findServiceTicketMetaById(serviceTicketId, instituteId, { transaction })
      );

      assertOpenTicket(existing.status, "deleted");

      const ok = await repo.deleteServiceTicket(serviceTicketId, instituteId, { transaction });
      if (!ok) {
        throw new Error("Service ticket not found or not in your institute");
      }

      return true;
    });
  } catch (error) {
    throw new Error(`Failed to delete service ticket: ${error.message}`);
  }
}

export async function previewTicketNumber(instituteId) {
  try {
    return await sequelize.transaction(async (transaction) => {
      const ticketNumber = await resolveNextTicketNumber(instituteId, transaction);

      return {
        ticketNumber,
        year: currentTicketYear(),
      };
    });
  } catch (error) {
    throw new Error(`Failed to preview ticket number: ${error.message}`);
  }
}

export async function getServiceTicketSummary(instituteId) {
  try {
    return await repo.findServiceTicketSummaryStats(instituteId);
  } catch (error) {
    throw new Error(`Failed to fetch service ticket summary: ${error.message}`);
  }
}
