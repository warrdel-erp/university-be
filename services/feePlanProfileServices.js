import sequelize from "../database/sequelizeConfig.js";
import * as repo from "../repository/feePlanProfileRepository.js";
import * as catalogRepo from "../repository/feeTypeCatalogRepository.js";
import { decimalAdd, decimalSum, toMoneyNumber } from "../utility/decimalMoney.js";

function toPlain(row) {
  if (!row) return null;
  return typeof row.get === "function" ? row.get({ plain: true }) : row;
}


function assertUniqueCatalogIdsPerInstallment(feeTypeCatalogs, installmentName) {
  const ids = (feeTypeCatalogs ?? []).map((c) => c.feeTypeCatalogId);
  if (new Set(ids).size !== ids.length) {
    throw new Error(
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
    throw new Error("courseSessionId not found or not in your institute");
  }

  if (academicYearId === undefined) return;

  const withSession = await repo.findSessionCourseMappingWithSession(courseSessionId, instituteId, {
    transaction,
  });
  if (withSession.session.acedmicYearId !== academicYearId) {
    throw new Error("academicYearId does not match the session for this courseSessionId");
  }
}

/** Validates catalogs and maps request installments to repository shape. */
async function prepareInstallmentsForDb(feePlanItemsInput, instituteId, transaction) {
  const prepared = [];

  for (const installment of feePlanItemsInput) {
    assertUniqueCatalogIdsPerInstallment(installment.feeTypeCatalogs, installment.name);

    const additionalFees = [];
    for (const line of installment.feeTypeCatalogs ?? []) {
      const catalog = await catalogRepo.findFeeTypeCatalogById(
        line.feeTypeCatalogId,
        instituteId,
        { transaction }
      );
      if (!catalog) {
        throw new Error(
          `feeTypeCatalogId ${line.feeTypeCatalogId} not found for this institute`,
        );
      }
      additionalFees.push({
        feeTypeCatalogId: catalog.feeTypeCatalogId,
        amount: toMoneyNumber(line.amount),
      });
    }

    const dueDate = installment.dueDate ?? null;

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

function buildFeePlanItemInvoiceRows(items, invoiceCountByItem) {
  return (items ?? []).map((item) => {
    const plain = toPlain(item);
    return {
      feePlanItemId: plain.feePlanItemId,
      termName: plain.termName ?? null,
      numberOfInvoices: invoiceCountByItem.get(plain.feePlanItemId) ?? 0,
    };
  });
}

function buildListRow(plainProfile, numberOfInvoices, assignedStudentCount, invoiceCountByItem) {
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
    courseSessionId: plainProfile.courseSessionId,
    term: items.length,
    termFees,
    additionalFees,
    totalFees: decimalAdd(termFees, additionalFees),
    numberOfInvoices,
    totalInvoices: numberOfInvoices,
    feePlanItems: buildFeePlanItemInvoiceRows(items, invoiceCountByItem),
    assignedStudentCount,
    status: assignedStudentCount > 0 ? "active" : "inactive",
    instituteId: plainProfile.instituteId,
  };
}

async function buildFeePlanListRows(list, instituteId, transaction) {
  const [studentCountByProfile, invoiceCountByProfile, invoiceCountByItem] = await Promise.all([
    repo.countStudentsGroupedByFeePlanProfile(instituteId, { transaction }),
    repo.countStudentFeeInvoicesGroupedByFeePlanProfile(instituteId, { transaction }),
    repo.countStudentFeeInvoicesGroupedByFeePlanItem(instituteId, { transaction }),
  ]);

  return list.map((row) => {
    const plain = toPlain(row);
    const assignedStudentCount = studentCountByProfile.get(plain.feePlanProfileId) ?? 0;
    const numberOfInvoices = invoiceCountByProfile.get(plain.feePlanProfileId) ?? 0;
    return buildListRow(plain, numberOfInvoices, assignedStudentCount, invoiceCountByItem);
  });
}

export function formatFeePlanProfileDetail(row) {
  return toPlain(row);
}

function formatFeePlanProfileSingleResponse(row, counts) {
  const p = toPlain(row);
  const mapping = p.courseSessionMapping ?? {};
  const course = mapping.courses ?? {};
  const session = mapping.session ?? {};

  const feePlanItems = (p.feePlanItems ?? []).map((item) => {
    const termAmount = toMoneyNumber(item.amount);
    let additionalFees = 0;
    const itemAdditionalFees = (item.itemAdditionalFees ?? []).map((af) => {
      const lineAmount = toMoneyNumber(af.amount);
      additionalFees = decimalAdd(additionalFees, lineAmount);
      const catalog = af.feeTypeCatalog ?? {};

      return {
        additionalFeeId: af.additionalFeeId,
        feeTypeCatalogId: af.feeTypeCatalogId,
        name: catalog.name ?? null,
        amount: lineAmount,
      };
    });

    return {
      feePlanItemId: item.feePlanItemId,
      termName: item.termName ?? null,
      createDate: item.createDate,
      dueDate: item.dueDate ?? null,
      amount: termAmount,
      additionalFees,
      total: decimalAdd(termAmount, additionalFees),
      numberOfInvoices: counts.invoiceCountByItem.get(item.feePlanItemId) ?? 0,
      itemAdditionalFees,
    };
  });

  const termFees = decimalSum(feePlanItems.map((item) => item.amount));
  const additionalFeesTotal = decimalSum(feePlanItems.map((item) => item.additionalFees));

  return {
    feePlanProfileId: p.feePlanProfileId,
    planName: p.name,
    planType: p.planType,
    courseSessionId: p.courseSessionId,
    instituteId: p.instituteId,
    courseId: mapping.courseId ?? course.courseId ?? null,
    courseName: course.courseName ?? null,
    sessionId: mapping.sessionId ?? session.sessionId ?? null,
    sessionName: session.sessionName ?? null,
    assignedStudentCount: counts.assignedStudentCount,
    numberOfInvoices: counts.numberOfInvoices,
    status: counts.assignedStudentCount > 0 ? "active" : "inactive",
    term: feePlanItems.length,
    termFees,
    additionalFees: additionalFeesTotal,
    totalFees: decimalAdd(termFees, additionalFeesTotal),
    feePlanItems,
  };
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

    if (body.feePlanItems !== undefined) {
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
      throw new Error("courseSessionId not found or not in your institute");
    }

    const list = await repo.findFeePlanProfilesByInstitute(instituteId, {
      courseSessionId,
      transaction,
    });

    const feePlans = await buildFeePlanListRows(list, instituteId, transaction);
    return { courseSessionId, feePlans };
  });
}

export async function listAllFeePlanProfiles(instituteId, planStatus = "all") {
  return sequelize.transaction(async (transaction) => {
    const assignedProfileIds = await repo.findDistinctAssignedFeePlanProfileIds(instituteId, {
      transaction,
    });

    let list;
    if (planStatus === "active") {
      list = await repo.findFeePlanProfilesByInstitute(instituteId, {
        feePlanProfileIds: assignedProfileIds,
        transaction,
      });
    } else if (planStatus === "inactive") {
      list = await repo.findFeePlanProfilesByInstitute(instituteId, {
        excludeFeePlanProfileIds: assignedProfileIds,
        transaction,
      });
    } else {
      list = await repo.findFeePlanProfilesByInstitute(instituteId, { transaction });
    }

    const feePlans = await buildFeePlanListRows(list, instituteId, transaction);

    return { status: planStatus, feePlans };
  });
}

/** Fees Invoice dashboard cards: active = assigned to ≥1 student; inactive = none assigned. */
export async function getFeePlanProfileSummary(instituteId) {
  const [allFeePlans, activeFeePlans] = await Promise.all([
    repo.countFeePlanProfilesByInstitute(instituteId),
    repo.countActiveFeePlanProfilesByInstitute(instituteId),
  ]);
  const inactiveFeePlans = allFeePlans - activeFeePlans;

  return {
    activeFeePlans,
    inactiveFeePlans,
    allFeePlans,
  };
}

export async function getSingleFeePlanProfile(feePlanProfileId, instituteId) {
  const row = await repo.findFeePlanProfileById(feePlanProfileId, instituteId, { forDetail: true });
  if (!row) return null;

  const [studentCountByProfile, invoiceCountByProfile, invoiceCountByItem] = await Promise.all([
    repo.countStudentsGroupedByFeePlanProfile(instituteId),
    repo.countStudentFeeInvoicesGroupedByFeePlanProfile(instituteId),
    repo.countStudentFeeInvoicesGroupedByFeePlanItem(instituteId),
  ]);

  return formatFeePlanProfileSingleResponse(row, {
    assignedStudentCount: studentCountByProfile.get(feePlanProfileId) ?? 0,
    numberOfInvoices: invoiceCountByProfile.get(feePlanProfileId) ?? 0,
    invoiceCountByItem,
  });
}

export async function updateFeePlanProfile(body, instituteId) {
  const { feePlanProfileId, name, planType, courseSessionId, academicYearId, feePlanItems } = body;

  await sequelize.transaction(async (transaction) => {
    const existing = await repo.findFeePlanProfileById(feePlanProfileId, instituteId, {
      transaction,
    });
    if (!existing) {
      throw new Error("Fee plan profile not found or not in your institute");
    }

    const profilePatch = {};
    if (name !== undefined) profilePatch.name = name;
    if (planType !== undefined) profilePatch.planType = planType;
    if (courseSessionId !== undefined) profilePatch.courseSessionId = courseSessionId;

    const mapId = courseSessionId ?? existing.get("courseSessionId");

    if (courseSessionId !== undefined) {
      const mapping = await repo.findSessionCourseMappingForInstitute(
        courseSessionId,
        instituteId,
        { transaction }
      );
      if (!mapping) {
        throw new Error("courseSessionId not found or not in your institute");
      }
    }

    if (academicYearId !== undefined || Object.keys(profilePatch).length > 0) {
      await validateCourseSession(mapId, instituteId, academicYearId, transaction);
    }

    if (Object.keys(profilePatch).length > 0) {
      await repo.updateFeePlanProfile(feePlanProfileId, instituteId, profilePatch, { transaction });
    }

    if (feePlanItems !== undefined) {
      const invoiceCount = await repo.countStudentFeeInvoicesForFeePlanProfile(
        feePlanProfileId,
        instituteId,
        { transaction }
      );
      if (invoiceCount > 0) {
        throw new Error(
          "Cannot replace feePlanItems while student fee invoices exist for this fee plan profile",
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
