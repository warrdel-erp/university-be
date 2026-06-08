import sequelize from "../database/sequelizeConfig.js";
import * as repo from "../repository/amcContractRepository.js";
import { parseMoneyInput } from "../utility/decimalMoney.js";
import {
  currentContractYear,
  formatContractNumber,
  parseContractNumberSequence,
} from "../utility/amcContractCode.js";

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

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
    throw httpError("contractValue must be a valid money value", 400);
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
    throw httpError("amcVendorId not found or not in your institute", 404);
  }

  const duplicate = await repo.findContractByVendorId(amcVendorId, instituteId, {
    transaction,
    excludeAmcContractId,
  });

  if (duplicate) {
    throw httpError(
      "A contract already exists for this vendor. Only one contract per vendor category is allowed.",
      409
    );
  }

  return vendor;
}

function assertDraftContract(approvalStatus, actionLabel) {
  if (approvalStatus !== "DRAFT") {
    throw httpError(`Only DRAFT contracts can be ${actionLabel}`, 400);
  }
}

function assertContractExists(row) {
  if (!row) {
    throw httpError("AMC contract not found or not in your institute", 404);
  }
  return row;
}

export async function addAmcContract(body, instituteId) {
  const contractValue = resolveContractValue(body);
  if (contractValue === null || contractValue === undefined) {
    throw httpError("contractValue is required", 400);
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
    throw error;
  }
}

export async function listAmcContracts(instituteId, query = {}) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const { rows, count } = await repo.findAndCountAmcContracts(instituteId, { ...query, page, limit });

  return {
    rows,
    total: count,
    page,
    limit,
  };
}

export async function getSingleAmcContract(amcContractId, instituteId) {
  return repo.findAmcContractById(amcContractId, instituteId);
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
      throw httpError("endDate must be on or after startDate", 400);
    }

    if (Object.keys(payload).length) {
      const affected = await repo.updateAmcContract(amcContractId, instituteId, payload, {
        transaction,
      });
      if (!affected) {
        throw httpError("AMC contract not found or not in your institute", 404);
      }
    }

    const row = await repo.findAmcContractById(amcContractId, instituteId, { transaction });

    await transaction.commit();

    return row;
  } catch (error) {
    await transaction.rollback();
    throw error;
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
      throw httpError("AMC contract not found or not in your institute", 404);
    }

    await transaction.commit();
    return true;
  } catch (error) {
    await transaction.rollback();
    throw error;
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
    throw error;
  }
}

export async function approveAmcContract(amcContractId, instituteId) {
  const transaction = await sequelize.transaction();

  try {
    const existing = assertContractExists(
      await repo.findAmcContractMetaById(amcContractId, instituteId, { transaction })
    );

    if (existing.approvalStatus !== "PUBLISHED") {
      throw httpError("Only PUBLISHED contracts can be approved", 400);
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
    throw error;
  }
}

export async function getAmcContractSummary(instituteId) {
  return repo.findContractSummaryStats(instituteId);
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
    throw error;
  }
}
