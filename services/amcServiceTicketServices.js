import sequelize from "../database/sequelizeConfig.js";
import * as repo from "../repository/amcServiceTicketRepository.js";
import { resolveIssueMemberFromUserId } from "../repository/assetIssueRepository.js";
import {
  currentTicketYear,
  formatTicketNumber,
  parseTicketNumberSequence,
} from "../utility/amcServiceTicketCode.js";

async function resolveNextTicketNumber(transaction) {
  const year = currentTicketYear();
  const latest = await repo.findLatestTicketNumberByYear(year, { transaction });
  const parsed = parseTicketNumberSequence(latest?.ticketNumber);
  const nextSequence = parsed?.year === year ? parsed.sequence + 1 : 1;

  return formatTicketNumber(year, nextSequence);
}

async function resolveAssetCategoryId(assetId, transaction) {
  const asset = await repo.findAssetForTicket(assetId, { transaction });
  if (!asset) {
    throw new Error("assetId not found or not in your institute");
  }
  return asset.assetCategoryId;
}

async function resolveAmcVendorId(amcVendorId, assetCategoryId, transaction) {
  if (amcVendorId !== undefined && amcVendorId !== null) {
    const vendor = await repo.findAmcVendorForTicket(amcVendorId, { transaction });
    if (!vendor) {
      throw new Error("amcVendorId not found or not in your institute");
    }
    return vendor.amcVendorId;
  }

  const vendor = await repo.findAmcVendorByCategoryId(assetCategoryId, { transaction });
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

function assertAssetIssuedToMember(assetId, assetIds) {
  const numericAssetId = Number(assetId);
  let found = false;

  for (const id of assetIds) {
    if (Number(id) === numericAssetId) {
      found = true;
      break;
    }
  }

  if (!found) {
    const err = new Error("assetId not found in your issued assets");
    err.statusCode = 400;
    throw err;
  }
}

export async function addServiceTicket(body) {
  try {
    return await sequelize.transaction(async (transaction) => {
      const assetCategoryId = await resolveAssetCategoryId(body.assetId, transaction);
      const amcVendorId = await resolveAmcVendorId(
        body.amcVendorId,
        assetCategoryId,
        transaction
      );
      const ticketNumber = await resolveNextTicketNumber(transaction);

      const created = await repo.createServiceTicket(
        {
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

      return repo.findServiceTicketById(created.serviceTicketId, { transaction });
    });
  } catch (error) {
    throw new Error(`Failed to create service ticket: ${error.message}`);
  }
}

async function resolveMemberDetails(userId) {
  const member = await resolveIssueMemberFromUserId(userId);
  if (!member) {
    return { memberId: null, memberType: null };
  }
  return member;
}

export async function addMyServiceTicket(userId, body) {
  try {
    const { memberId, memberType } = await resolveMemberDetails(userId);
    if (!memberId) {
      throw new Error("User does not have a valid member record.");
    }
    const assetIds = await repo.findAssetIdsIssuedToMember(memberId, memberType);
    assertAssetIssuedToMember(body.assetId, assetIds);
    return await addServiceTicket(body);
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    throw new Error(`Failed to create service ticket: ${error.message}`);
  }
}

export async function listServiceTickets(query = {}) {
  try {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { rows, count } = await repo.findAndCountServiceTickets({
      ...query,
      page,
      limit,
    });

    return { rows, total: count, page, limit };
  } catch (error) {
    throw new Error(`Failed to fetch service tickets: ${error.message}`);
  }
}

export async function listMyServiceTickets(userId, query = {}) {
  try {
    const { memberId, memberType } = await resolveMemberDetails(userId);
    if (!memberId) {
      return { rows: [], total: 0, page: query.page ?? 1, limit: query.limit ?? 20 };
    }
    const assetIds = await repo.findAssetIdsIssuedToMember(memberId, memberType);
    return await listServiceTickets({ ...query, assetIds });
  } catch (error) {
    throw new Error(`Failed to fetch service tickets: ${error.message}`);
  }
}

export async function getSingleServiceTicket(serviceTicketId) {
  try {
    return await repo.findServiceTicketById(serviceTicketId);
  } catch (error) {
    throw new Error(`Failed to fetch service ticket: ${error.message}`);
  }
}

export async function getMySingleServiceTicket(userId, serviceTicketId) {
  try {
    const { memberId, memberType } = await resolveMemberDetails(userId);
    if (!memberId) {
      return null;
    }
    const assetIds = await repo.findAssetIdsIssuedToMember(memberId, memberType);
    return await repo.findServiceTicketById(serviceTicketId, { assetIds });
  } catch (error) {
    throw new Error(`Failed to fetch service ticket: ${error.message}`);
  }
}

export async function updateServiceTicket(serviceTicketId, body) {
  try {
    return await sequelize.transaction(async (transaction) => {
      const existing = assertTicketExists(
        await repo.findServiceTicketMetaById(serviceTicketId, { transaction })
      );

      assertTicketNotClosed(existing.status);

      const { serviceTicketId: _id, ...payload } = body;

      if (payload.amcVendorId !== undefined && payload.amcVendorId !== null) {
        const vendor = await repo.findAmcVendorForTicket(payload.amcVendorId, {
          transaction,
        });
        if (!vendor) {
          throw new Error("amcVendorId not found or not in your institute");
        }
      }

      if (payload.status === undefined) {
        assertOpenTicket(existing.status, "updated");
      }

      const affected = await repo.updateServiceTicket(serviceTicketId, payload, {
        transaction,
      });
      if (!affected) {
        throw new Error("Service ticket not found or not in your institute");
      }

      return repo.findServiceTicketById(serviceTicketId, { transaction });
    });
  } catch (error) {
    throw new Error(`Failed to update service ticket: ${error.message}`);
  }
}

export async function deleteServiceTicket(serviceTicketId) {
  try {
    return await sequelize.transaction(async (transaction) => {
      const existing = assertTicketExists(
        await repo.findServiceTicketMetaById(serviceTicketId, { transaction })
      );

      assertOpenTicket(existing.status, "deleted");

      const ok = await repo.deleteServiceTicket(serviceTicketId, { transaction });
      if (!ok) {
        throw new Error("Service ticket not found or not in your institute");
      }

      return true;
    });
  } catch (error) {
    throw new Error(`Failed to delete service ticket: ${error.message}`);
  }
}

export async function previewTicketNumber() {
  try {
    return await sequelize.transaction(async (transaction) => {
      const ticketNumber = await resolveNextTicketNumber(transaction);

      return {
        ticketNumber,
        year: currentTicketYear(),
      };
    });
  } catch (error) {
    throw new Error(`Failed to preview ticket number: ${error.message}`);
  }
}

export async function getMyServiceTicketSummary(userId) {
  try {
    const { memberId, memberType } = await resolveMemberDetails(userId);
    if (!memberId) {
      return await repo.findServiceTicketSummaryStats({ assetIds: [] });
    }
    const assetIds = await repo.findAssetIdsIssuedToMember(memberId, memberType);
    return await repo.findServiceTicketSummaryStats({ assetIds });
  } catch (error) {
    throw new Error(`Failed to fetch service ticket summary: ${error.message}`);
  }
}

export async function getServiceTicketSummary() {
  try {
    return await repo.findServiceTicketSummaryStats();
  } catch (error) {
    throw new Error(`Failed to fetch service ticket summary: ${error.message}`);
  }
}
