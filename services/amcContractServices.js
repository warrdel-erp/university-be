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

async function resolveNextContractNumber(transaction) {
  const year = currentContractYear();
  const yearSuffix = String(year).slice(-2);
  const prefix = `AMC${yearSuffix}`;

  const latest = await repo.findLatestContractNumberByPrefix(prefix, { transaction });
  const parsed = parseContractNumberSequence(latest?.contractNumber);
  const nextSequence =
    parsed?.yearSuffix === yearSuffix ? parsed.sequence + 1 : 1;

  return formatContractNumber(year, nextSequence);
}

async function assertVendorAvailable(amcVendorId, transaction, excludeAmcContractId) {
  const vendor = await repo.findAmcVendorForContract(amcVendorId, { transaction });
  if (!vendor) {
    throw new Error("amcVendorId not found or not in your institute");
  }

  const duplicate = await repo.findContractByVendorId(amcVendorId, {
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

export async function addAmcContract(body) {
  const contractValue = resolveContractValue(body);
  if (contractValue === null || contractValue === undefined) {
    throw new Error("contractValue is required");
  }

  const transaction = await sequelize.transaction();

  try {
    await assertVendorAvailable(body.amcVendorId, transaction);

    const contractNumber = await resolveNextContractNumber(transaction);

    const created = await repo.createAmcContract(
      {
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

    const row = await repo.findAmcContractById(created.amcContractId, { transaction });

    await transaction.commit();

    return row;
  } catch (error) {
    await transaction.rollback();
    throw new Error(`Failed to create AMC contract: ${error.message}`);
  }
}

export async function listAmcContracts(query = {}) {
  try {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { rows, count } = await repo.findAndCountAmcContracts({ ...query, page, limit });

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

export async function getSingleAmcContract(amcContractId) {
  try {
    return await repo.findAmcContractById(amcContractId);
  } catch (error) {
    throw new Error(`Failed to fetch AMC contract: ${error.message}`);
  }
}

export async function updateAmcContract(amcContractId, body) {
  const transaction = await sequelize.transaction();

  try {
    const existing = assertContractExists(
      await repo.findAmcContractMetaById(amcContractId, { transaction })
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
      const affected = await repo.updateAmcContract(amcContractId, payload, {
        transaction,
      });
      if (!affected) {
        throw new Error("AMC contract not found or not in your institute");
      }
    }

    const row = await repo.findAmcContractById(amcContractId, { transaction });

    await transaction.commit();

    return row;
  } catch (error) {
    await transaction.rollback();
    throw new Error(`Failed to update AMC contract: ${error.message}`);
  }
}

export async function deleteAmcContract(amcContractId) {
  const transaction = await sequelize.transaction();

  try {
    const existing = assertContractExists(
      await repo.findAmcContractMetaById(amcContractId, { transaction })
    );

    assertDraftContract(existing.approvalStatus, "deleted");

    const ok = await repo.deleteAmcContract(amcContractId, { transaction });
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

export async function submitAmcContractForApproval(amcContractId) {
  const transaction = await sequelize.transaction();

  try {
    const existing = assertContractExists(
      await repo.findAmcContractMetaById(amcContractId, { transaction })
    );

    assertDraftContract(existing.approvalStatus, "submitted for approval");

    await repo.updateAmcContract(
      amcContractId,
      { approvalStatus: "PUBLISHED" },
      { transaction }
    );

    const row = await repo.findAmcContractById(amcContractId, { transaction });

    await transaction.commit();

    return row;
  } catch (error) {
    await transaction.rollback();
    throw new Error(`Failed to submit AMC contract for approval: ${error.message}`);
  }
}

export async function approveAmcContract(amcContractId) {
  const transaction = await sequelize.transaction();

  try {
    const existing = assertContractExists(
      await repo.findAmcContractMetaById(amcContractId, { transaction })
    );

    if (existing.approvalStatus !== "PUBLISHED") {
      throw new Error("Only PUBLISHED contracts can be approved");
    }

    await repo.updateAmcContract(
      amcContractId,
      { approvalStatus: "APPROVED" },
      { transaction }
    );

    const row = await repo.findAmcContractById(amcContractId, { transaction });

    await transaction.commit();

    return row;
  } catch (error) {
    await transaction.rollback();
    throw new Error(`Failed to approve AMC contract: ${error.message}`);
  }
}

export async function getAmcContractSummary() {
  try {
    return await repo.findContractSummaryStats();
  } catch (error) {
    throw new Error(`Failed to fetch AMC contract summary: ${error.message}`);
  }
}

export async function previewContractNumber() {
  const transaction = await sequelize.transaction();

  try {
    const contractNumber = await resolveNextContractNumber(transaction);

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
