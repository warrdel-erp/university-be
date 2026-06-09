import sequelize from "../database/sequelizeConfig.js";
import * as repo from "../repository/amcContractRepository.js";
import { parseMoneyInput } from "../utility/decimalMoney.js";
import {
  currentContractYear,
  formatContractNumber,
  parseContractNumberSequence,
} from "../utility/amcContractCode.js";

function updatePayload(body) {
  const payload = {};

  if (body.contractName !== undefined) payload.contractName = body.contractName;
  if (body.contractType !== undefined) payload.contractType = body.contractType;
  if (body.startDate !== undefined) payload.startDate = body.startDate;
  if (body.endDate !== undefined) payload.endDate = body.endDate;
  if (body.paymentTerms !== undefined) payload.paymentTerms = body.paymentTerms;
  if (body.serviceVisitFrequency !== undefined) {
    payload.serviceVisitFrequency = body.serviceVisitFrequency;
  }
  if (body.slaResponseHours !== undefined) payload.slaResponseHours = body.slaResponseHours;
  if (body.slaResolutionHours !== undefined) payload.slaResolutionHours = body.slaResolutionHours;
  if (body.description !== undefined) payload.description = body.description;

  return payload;
}

function resolveContractValue(body) {
  if (body.contractValue === undefined) {
    return undefined;
  }

  const value = parseMoneyInput(body.contractValue);
  if (Number.isNaN(value)) {
    throw new Error("contractValue must be a valid money value");
  }

  return value;
}

async function resolveNextContractNumber(instituteId, transaction) {
  const year = currentContractYear();
  const yearSuffix = String(year).slice(-2);
  const prefix = `AMC${yearSuffix}`;

  const latest = await repo.findLatestContractNumberByPrefix(instituteId, prefix, { transaction });
  const parsed = parseContractNumberSequence(latest?.contractNumber);
  const nextSequence =
    parsed?.yearSuffix === yearSuffix ? parsed.sequence + 1 : 1;

  return formatContractNumber(year, nextSequence);
}

async function assertVendorAvailable(amcVendorId, instituteId, transaction, excludeAmcContractId) {
  const vendor = await repo.findAmcVendorForContract(amcVendorId, instituteId, { transaction });
  if (!vendor) {
    throw new Error("amcVendorId not found or not in your institute");
  }

  const duplicate = await repo.findContractByVendorId(amcVendorId, instituteId, {
    transaction,
    excludeAmcContractId,
  });

  if (duplicate) {
    throw new Error(
      "A contract already exists for this vendor. Only one contract per vendor category is allowed."
    );
  }

  return vendor;
}

function assertDraftContract(approvalStatus, actionLabel) {
  if (approvalStatus !== "DRAFT") {
    throw new Error(`Only DRAFT contracts can be ${actionLabel}`);
  }
}

function assertContractExists(row) {
  if (!row) {
    throw new Error("AMC contract not found or not in your institute");
  }
  return row;
}

export async function addAmcContract(body, instituteId) {
  const contractValue = resolveContractValue(body);
  if (contractValue === null || contractValue === undefined) {
    throw new Error("contractValue is required");
  }

  const transaction = await sequelize.transaction();

  try {
    await assertVendorAvailable(body.amcVendorId, instituteId, transaction);

    const contractNumber = await resolveNextContractNumber(instituteId, transaction);

    const created = await repo.createAmcContract(
      {
        instituteId,
        contractNumber,
        contractName: body.contractName,
        approvalStatus: "DRAFT",
        amcVendorId: body.amcVendorId,
        contractType: body.contractType,
        startDate: body.startDate,
        endDate: body.endDate,
        contractValue,
        paymentTerms: body.paymentTerms,
        serviceVisitFrequency: body.serviceVisitFrequency,
        slaResponseHours: body.slaResponseHours,
        slaResolutionHours: body.slaResolutionHours,
        description: body.description ?? null,
      },
      { transaction }
    );

    const row = await repo.findAmcContractById(created.amcContractId, instituteId, { transaction });

    await transaction.commit();

    return row;
  } catch (error) {
    await transaction.rollback();
    throw new Error(`Failed to create AMC contract: ${error.message}`);
  }
}

export async function listAmcContracts(instituteId, query = {}) {
  try {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { rows, count } = await repo.findAndCountAmcContracts(instituteId, { ...query, page, limit });

    return {
      rows,
      total: count,
      page,
      limit,
    };
  } catch (error) {
    throw new Error(`Failed to fetch AMC contracts: ${error.message}`);
  }
}

export async function getSingleAmcContract(amcContractId, instituteId) {
  try {
    return await repo.findAmcContractById(amcContractId, instituteId);
  } catch (error) {
    throw new Error(`Failed to fetch AMC contract: ${error.message}`);
  }
}

export async function updateAmcContract(amcContractId, body, instituteId) {
  const transaction = await sequelize.transaction();

  try {
    const existing = assertContractExists(
      await repo.findAmcContractMetaById(amcContractId, instituteId, { transaction })
    );

    assertDraftContract(existing.approvalStatus, "updated");

    const payload = updatePayload(body);
    const contractValue = resolveContractValue(body);
    if (contractValue !== undefined) {
      payload.contractValue = contractValue;
    }

    const nextStartDate = payload.startDate ?? existing.startDate;
    const nextEndDate = payload.endDate ?? existing.endDate;
    if (nextEndDate < nextStartDate) {
      throw new Error("endDate must be on or after startDate");
    }

    if (Object.keys(payload).length) {
      const affected = await repo.updateAmcContract(amcContractId, instituteId, payload, {
        transaction,
      });
      if (!affected) {
        throw new Error("AMC contract not found or not in your institute");
      }
    }

    const row = await repo.findAmcContractById(amcContractId, instituteId, { transaction });

    await transaction.commit();

    return row;
  } catch (error) {
    await transaction.rollback();
    throw new Error(`Failed to update AMC contract: ${error.message}`);
  }
}

export async function deleteAmcContract(amcContractId, instituteId) {
  const transaction = await sequelize.transaction();

  try {
    const existing = assertContractExists(
      await repo.findAmcContractMetaById(amcContractId, instituteId, { transaction })
    );

    assertDraftContract(existing.approvalStatus, "deleted");

    const ok = await repo.deleteAmcContract(amcContractId, instituteId, { transaction });
    if (!ok) {
      throw new Error("AMC contract not found or not in your institute");
    }

    await transaction.commit();
    return true;
  } catch (error) {
    await transaction.rollback();
    throw new Error(`Failed to delete AMC contract: ${error.message}`);
  }
}

export async function submitAmcContractForApproval(amcContractId, instituteId) {
  const transaction = await sequelize.transaction();

  try {
    const existing = assertContractExists(
      await repo.findAmcContractMetaById(amcContractId, instituteId, { transaction })
    );

    assertDraftContract(existing.approvalStatus, "submitted for approval");

    await repo.updateAmcContract(
      amcContractId,
      instituteId,
      { approvalStatus: "PUBLISHED" },
      { transaction }
    );

    const row = await repo.findAmcContractById(amcContractId, instituteId, { transaction });

    await transaction.commit();

    return row;
  } catch (error) {
    await transaction.rollback();
    throw new Error(`Failed to submit AMC contract for approval: ${error.message}`);
  }
}

export async function approveAmcContract(amcContractId, instituteId) {
  const transaction = await sequelize.transaction();

  try {
    const existing = assertContractExists(
      await repo.findAmcContractMetaById(amcContractId, instituteId, { transaction })
    );

    if (existing.approvalStatus !== "PUBLISHED") {
      throw new Error("Only PUBLISHED contracts can be approved");
    }

    await repo.updateAmcContract(
      amcContractId,
      instituteId,
      { approvalStatus: "APPROVED" },
      { transaction }
    );

    const row = await repo.findAmcContractById(amcContractId, instituteId, { transaction });

    await transaction.commit();

    return row;
  } catch (error) {
    await transaction.rollback();
    throw new Error(`Failed to approve AMC contract: ${error.message}`);
  }
}

export async function getAmcContractSummary(instituteId) {
  try {
    return await repo.findContractSummaryStats(instituteId);
  } catch (error) {
    throw new Error(`Failed to fetch AMC contract summary: ${error.message}`);
  }
}

export async function previewContractNumber(instituteId) {
  const transaction = await sequelize.transaction();

  try {
    const contractNumber = await resolveNextContractNumber(instituteId, transaction);

    await transaction.commit();

    return {
      contractNumber,
      year: currentContractYear(),
    };
  } catch (error) {
    await transaction.rollback();
    throw new Error(`Failed to preview contract number: ${error.message}`);
  }
}
