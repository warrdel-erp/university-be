import sequelize from "../database/sequelizeConfig.js";
import * as repo from "../repository/feePlanProfileRepository.js";
import * as catalogRepo from "../repository/feeTypeCatalogRepository.js";
import { decimalAdd, decimalSum, toMoneyNumber } from "../utility/decimalMoney.js";

function toPlain(row) {
  if (!row) return null;
  return typeof row.get === "function" ? row.get({ plain: true }) : row;
}

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function assertUniqueCatalogIdsPerInstallment(feeTypeCatalogs, installmentName) {
  const ids = (feeTypeCatalogs ?? []).map((c) => c.feeTypeCatalogId);
  if (new Set(ids).size !== ids.length) {
    throw httpError(
      `Duplicate feeTypeCatalogId in feeTypeCatalogs for installment "${installmentName}"`
    );
  }
}

async function validateCourseSession(courseSessionId, instituteId, academicYearId, transaction) {
  const mapping = await repo.findSessionCourseMappingForInstitute(
    courseSessionId,
    instituteId,
    { transaction }
  );
  if (!mapping) {
    throw httpError("courseSessionId not found or not in your institute", 400);
  }

  if (academicYearId == null || academicYearId === "") return;

  const withSession = await repo.findSessionCourseMappingWithSession(courseSessionId, instituteId, {
    transaction,
  });
  const expected = Number(academicYearId);
  const sessionYear = Number(withSession?.session?.acedmicYearId);
  if (!withSession?.session || sessionYear !== expected) {
    throw httpError("academicYearId does not match the session for this courseSessionId", 400);
  }
}

/** Validates catalogs and maps request installments to repository shape. */
async function prepareInstallmentsForDb(feePlanItemsInput, instituteId, transaction) {
  const prepared = [];

  for (const installment of feePlanItemsInput) {
    assertUniqueCatalogIdsPerInstallment(installment.feeTypeCatalogs, installment.name);

    const additionalFees = [];
    const catalogLines = installment.feeTypeCatalogs;
    if (Array.isArray(catalogLines) && catalogLines.length > 0) {
      for (const line of catalogLines) {
        const catalog = await catalogRepo.findFeeTypeCatalogById(
          line.feeTypeCatalogId,
          instituteId,
          { transaction }
        );
        if (!catalog) {
          throw httpError(
            `feeTypeCatalogId ${line.feeTypeCatalogId} not found for this institute`,
            404
          );
        }
        additionalFees.push({
          feeTypeCatalogId: catalog.feeTypeCatalogId,
          amount: toMoneyNumber(line.amount),
        });
      }
    }

    const dueDate =
      installment.dueDate && String(installment.dueDate).trim() !== ""
        ? installment.dueDate
        : null;

    prepared.push({
      name: installment.name,
      startDate: installment.startDate,
      dueDate,
      amount: installment.amount,
      additionalFees,
    });
  }

  return prepared;
}

function buildListRow(plainProfile, totalInvoices) {
  const items = plainProfile.feePlanItems ?? [];
  const termFees = decimalSum(items.map((i) => toMoneyNumber(i.amount)));
  let additionalFees = 0;
  for (const item of items) {
    for (const af of item.itemAdditionalFees ?? []) {
      additionalFees = decimalAdd(additionalFees, toMoneyNumber(af.amount));
    }
  }

  return {
    feePlanProfileId: plainProfile.feePlanProfileId,
    planName: plainProfile.name,
    planType: plainProfile.planType,
    term: items.length,
    termFees,
    additionalFees,
    totalFees: decimalAdd(termFees, additionalFees),
    totalInvoices,
    instituteId: plainProfile.instituteId,
  };
}

export function formatFeePlanProfileDetail(row) {
  return toPlain(row);
}

export async function addFeePlanProfile(body, instituteId) {
  const mapId = body.courseSessionId;

  const feePlanProfileId = await sequelize.transaction(async (transaction) => {
    await validateCourseSession(mapId, instituteId, body.academicYearId, transaction);

    const profile = await repo.createFeePlanProfile(
      {
        name: body.name,
        planType: body.planType,
        courseSessionId: mapId,
        instituteId,
      },
      { transaction }
    );

    if (body.feePlanItems?.length > 0) {
      const installments = await prepareInstallmentsForDb(body.feePlanItems, instituteId, transaction);
      await repo.createInstallmentsForProfile(
        profile.feePlanProfileId,
        instituteId,
        installments,
        { transaction }
      );
    }

    return profile.feePlanProfileId;
  });

  const full = await repo.findFeePlanProfileById(feePlanProfileId, instituteId);
  return formatFeePlanProfileDetail(full);
}

export async function listFeePlanProfiles(instituteId, courseSessionId) {
  return sequelize.transaction(async (transaction) => {
    const mapping = await repo.findSessionCourseMappingForInstitute(
      courseSessionId,
      instituteId,
      { transaction }
    );
    if (!mapping) {
      throw httpError("courseSessionId not found or not in your institute", 400);
    }

    const list = await repo.findFeePlanProfilesByInstitute(instituteId, {
      courseSessionId,
      transaction,
    });

    const feePlans = [];
    for (const row of list) {
      const plain = toPlain(row);
      const totalInvoices = await repo.countStudentFeeInvoicesForFeePlanProfile(
        plain.feePlanProfileId,
        instituteId,
        { transaction }
      );
      feePlans.push(buildListRow(plain, totalInvoices));
    }

    return { courseSessionId, feePlans };
  });
}

export async function getSingleFeePlanProfile(feePlanProfileId, instituteId) {
  const row = await repo.findFeePlanProfileById(feePlanProfileId, instituteId);
  if (!row) return null;
  return formatFeePlanProfileDetail(row);
}

export async function updateFeePlanProfile(body, instituteId) {
  const { feePlanProfileId, name, planType, courseSessionId, academicYearId, feePlanItems } = body;

  await sequelize.transaction(async (transaction) => {
    const existing = await repo.findFeePlanProfileById(feePlanProfileId, instituteId, {
      transaction,
    });
    if (!existing) {
      throw httpError("Fee plan profile not found or not in your institute", 404);
    }

    const profilePatch = {};
    if (name !== undefined) profilePatch.name = name;
    if (planType !== undefined) profilePatch.planType = planType;
    if (courseSessionId !== undefined) profilePatch.courseSessionId = courseSessionId;

    const mapId = courseSessionId ?? existing.get("courseSessionId");

    if (courseSessionId != null) {
      const mapping = await repo.findSessionCourseMappingForInstitute(
        courseSessionId,
        instituteId,
        { transaction }
      );
      if (!mapping) {
        throw httpError("courseSessionId not found or not in your institute", 400);
      }
    }

    if (academicYearId != null || Object.keys(profilePatch).length > 0) {
      await validateCourseSession(mapId, instituteId, academicYearId, transaction);
    }

    if (Object.keys(profilePatch).length > 0) {
      await repo.updateFeePlanProfile(feePlanProfileId, instituteId, profilePatch, { transaction });
    }

    if ((feePlanItems ?? []).length > 0) {
      const invoiceCount = await repo.countStudentFeeInvoicesForFeePlanProfile(
        feePlanProfileId,
        instituteId,
        { transaction }
      );
      if (invoiceCount > 0) {
        throw httpError(
          "Cannot replace feePlanItems while student fee invoices exist for this fee plan profile",
          409
        );
      }

      await repo.removeInstallmentsForProfile(feePlanProfileId, instituteId, { transaction });

      const installments = await prepareInstallmentsForDb(feePlanItems, instituteId, transaction);
      await repo.createInstallmentsForProfile(feePlanProfileId, instituteId, installments, {
        transaction,
      });
    }
  });

  const fresh = await repo.findFeePlanProfileById(feePlanProfileId, instituteId);
  return formatFeePlanProfileDetail(fresh);
}
