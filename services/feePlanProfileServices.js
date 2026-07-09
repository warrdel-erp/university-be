import sequelize from "../database/sequelizeConfig.js";
import * as repo from "../repository/feePlanProfileRepository.js";
import * as catalogRepo from "../repository/feeTypeCatalogRepository.js";
import * as studentRepo from "../repository/studentRepository.js";
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

function assertFeePlanProfilePublished(profilePlain) {
  if (profilePlain.publishStatus !== "published") {
    throw httpError("Only published fee plans can be assigned to students", 400);
  }
}

function isMainFeePlanSubItem(line) {
  return line?.isMainSubItem === true || line?.isMainSubItem === 1;
}

function splitFeePlanSubItemAmounts(subItems) {
  let amount = 0;
  let supplementalFees = 0;

  for (const line of subItems ?? []) {
    const lineAmount = toMoneyNumber(line.amount);
    if (isMainFeePlanSubItem(line)) {
      amount = decimalAdd(amount, lineAmount);
    } else {
      supplementalFees = decimalAdd(supplementalFees, lineAmount);
    }
  }

  return {
    amount,
    supplementalFees,
    total: decimalAdd(amount, supplementalFees),
  };
}

function mapFeePlanSubItemsForResponse(subItems) {
  return (subItems ?? []).map((line) => ({
    feePlanSubitemId: line.feePlanSubitemId,
    feeTypeId: line.feeTypeId,
    name: line.feeTypeCatalog?.name ?? null,
    ledgerType: line.feeTypeCatalog?.ledgerType ?? null,
    amount: toMoneyNumber(line.amount),
    isMainSubItem: isMainFeePlanSubItem(line),
  }));
}

async function validateCourseSession(courseSessionId, academicYearId, transaction) {
  const mapping = await repo.findSessionCourseMappingForInstitute(courseSessionId, { transaction });
  if (!mapping) {
    throw new Error("courseSessionId not found or not in your institute");
  }

  if (academicYearId === undefined) return;

  const withSession = await repo.findSessionCourseMappingWithSession(courseSessionId, {
    transaction,
  });
  if (withSession.session.academicYearId !== academicYearId) {
    throw new Error("academicYearId does not match the session for this courseSessionId");
  }
}

/** Validates catalogs and maps feePlanItems to repository installment shape. */
async function prepareFeePlanItemsForDb(feePlanItemsInput, transaction) {
  const prepared = [];

  for (const installment of feePlanItemsInput) {
    const subItems = [];

    for (const line of installment.feePlanSubItems) {
      const catalog = await catalogRepo.findFeeTypeCatalogById(line.feeTypeCatalogId, {
        transaction,
      });
      if (!catalog) {
        throw httpError(
          `feeTypeCatalogId ${line.feeTypeCatalogId} not found for this institute`,
          404
        );
      }

      subItems.push({
        feePlanSubitemId: line.feePlanSubitemId ?? null,
        feeTypeId: catalog.feeTypeCatalogId,
        amount: toMoneyNumber(line.amount),
        isMainSubItem: line.isMainItem === true,
      });
    }

    prepared.push({
      startDate: installment.createDate,
      dueDate: installment.dueDate ?? null,
      subItems,
    });
  }

  return prepared;
}

function buildFeePlanItemInvoiceRows(items, invoiceCountByItem) {
  return (items ?? []).map((item, index) => {
    const plain = toPlain(item);
    return {
      sno: index + 1,
      feePlanItemId: plain.feePlanItemId,
      numberOfInvoices: invoiceCountByItem.get(plain.feePlanItemId) ?? 0,
    };
  });
}

function buildListRow(plainProfile, numberOfInvoices, assignedStudentCount, invoiceCountByItem) {
  const items = plainProfile.feePlanItems ?? [];
  let termFees = 0;
  let supplementalFees = 0;
  for (const item of items) {
    const split = splitFeePlanSubItemAmounts(item.feePlanSubItems);
    termFees = decimalAdd(termFees, split.amount);
    supplementalFees = decimalAdd(supplementalFees, split.supplementalFees);
  }

  return {
    feePlanProfileId: plainProfile.feePlanProfileId,
    planName: plainProfile.name,
    planType: plainProfile.planType,
    category: plainProfile.category,
    courseSessionId: plainProfile.courseSessionId,
    term: items.length,
    termFees,
    supplementalFees,
    totalFees: decimalAdd(termFees, supplementalFees),
    numberOfInvoices,
    totalInvoices: numberOfInvoices,
    feePlanItems: buildFeePlanItemInvoiceRows(items, invoiceCountByItem),
    assignedStudentCount,
    publishStatus: plainProfile.publishStatus ?? "draft",
    status: assignedStudentCount > 0 ? "active" : "inactive",
    instituteId: plainProfile.instituteId,
  };
}

async function buildFeePlanListRows(list, transaction) {
  const [studentCountByProfile, invoiceCountByProfile, invoiceCountByItem] = await Promise.all([
    repo.countStudentsGroupedByFeePlanProfile({ transaction }),
    repo.countStudentFeeInvoicesGroupedByFeePlanProfile({ transaction }),
    repo.countStudentFeeInvoicesGroupedByFeePlanItem({ transaction }),
  ]);

  return list.map((row) => {
    const plain = toPlain(row);
    const assignedStudentCount = studentCountByProfile.get(plain.feePlanProfileId) ?? 0;
    const numberOfInvoices = invoiceCountByProfile.get(plain.feePlanProfileId) ?? 0;
    return buildListRow(plain, numberOfInvoices, assignedStudentCount, invoiceCountByItem);
  });
}

function formatFeePlanProfileSingleResponse(row, counts) {
  const p = toPlain(row);
  const mapping = p.courseSessionMapping ?? {};
  const course = mapping.courses ?? {};
  const session = mapping.session ?? {};

  let termFees = 0;
  let supplementalFeesTotal = 0;

  const feePlanItems = (p.feePlanItems ?? []).map((item, index) => {
    const split = splitFeePlanSubItemAmounts(item.feePlanSubItems);
    termFees = decimalAdd(termFees, split.amount);
    supplementalFeesTotal = decimalAdd(supplementalFeesTotal, split.supplementalFees);

    return {
      sno: index + 1,
      feePlanItemId: item.feePlanItemId,
      createDate: item.createDate,
      dueDate: item.dueDate ?? null,
      total: split.total,
      numberOfInvoices: counts.invoiceCountByItem.get(item.feePlanItemId) ?? 0,
      feePlanSubItems: mapFeePlanSubItemsForResponse(item.feePlanSubItems),
    };
  });

  return {
    feePlanProfileId: p.feePlanProfileId,
    planName: p.name,
    planType: p.planType,
    category: p.category,
    courseSessionId: p.courseSessionId,
    instituteId: p.instituteId,
    courseId: mapping.courseId ?? course.courseId ?? null,
    courseName: course.courseName ?? null,
    sessionId: mapping.sessionId ?? session.sessionId ?? null,
    sessionName: session.sessionName ?? null,
    assignedStudentCount: counts.assignedStudentCount,
    numberOfInvoices: counts.numberOfInvoices,
    publishStatus: p.publishStatus ?? "draft",
    status: counts.assignedStudentCount > 0 ? "active" : "inactive",
    term: feePlanItems.length,
    termFees,
    supplementalFees: supplementalFeesTotal,
    totalFees: decimalAdd(termFees, supplementalFeesTotal),
    feePlanItems,
  };
}

async function syncFeePlanItemsForUpdate(feePlanProfileId, feePlanItemsInput, transaction) {
  const existingItems = await repo.findFeePlanItemsByProfileId(feePlanProfileId, { transaction });
  const existingIdSet = new Set(existingItems.map((row) => toPlain(row).feePlanItemId));

  for (const input of feePlanItemsInput) {
    if (!existingIdSet.has(input.feePlanItemId)) {
      throw httpError(
        `feePlanItemId ${input.feePlanItemId} does not belong to this fee plan profile`,
        400
      );
    }
  }

  const preparedInstallments = await prepareFeePlanItemsForDb(feePlanItemsInput, transaction);

  for (let index = 0; index < feePlanItemsInput.length; index++) {
    const itemId = feePlanItemsInput[index].feePlanItemId;
    const installment = preparedInstallments[index];

    await repo.updateFeePlanItemById(
      itemId,
      {
        createDate: installment.startDate,
        dueDate: installment.dueDate,
      },
      { transaction }
    );

    const keptSubItemIds = new Set();

    for (const line of installment.subItems) {
      if (line.feePlanSubitemId != null) {
        const subItem = await repo.findFeePlanSubItemForProfile(
          line.feePlanSubitemId,
          feePlanProfileId,
          { transaction }
        );
        if (!subItem) {
          throw httpError(`feePlanSubitemId ${line.feePlanSubitemId} not found`, 404);
        }
        if (toPlain(subItem).feePlanItemId !== itemId) {
          throw httpError(
            `feePlanSubitemId ${line.feePlanSubitemId} does not belong to feePlanItemId ${itemId}`,
            400
          );
        }

        await repo.updateFeePlanSubItemById(
          line.feePlanSubitemId,
          {
            amount: line.amount,
            feeTypeId: line.feeTypeId,
            isMainSubItem: line.isMainSubItem,
          },
          { transaction }
        );
        keptSubItemIds.add(line.feePlanSubitemId);
        continue;
      }

      const created = await repo.createFeePlanSubItem(
        {
          amount: line.amount,
          feeTypeId: line.feeTypeId,
          feePlanItemId: itemId,
          isMainSubItem: line.isMainSubItem,
        },
        { transaction }
      );
      keptSubItemIds.add(toPlain(created).feePlanSubitemId);
    }

    const existingSubItems = await repo.findFeePlanSubItemsByFeePlanItemId(itemId, {
      transaction,
    });
    for (const subItem of existingSubItems) {
      const subItemId = toPlain(subItem).feePlanSubitemId;
      if (!keptSubItemIds.has(subItemId)) {
        await repo.deleteFeePlanSubItemById(subItemId, { transaction });
      }
    }
  }
}

export async function updateFeePlanProfile(body) {
  const { feePlanProfileId } = body;

  await sequelize.transaction(async (transaction) => {
    const profile = await repo.findFeePlanProfileByIdForInstitute(feePlanProfileId, { transaction });
    if (!profile) {
      throw httpError("Fee plan profile not found", 404);
    }

    const profilePlain = toPlain(profile);
    const courseSessionId = body.courseSessionId ?? profilePlain.courseSessionId;

    if (body.courseSessionId !== undefined || body.academicYearId !== undefined) {
      await validateCourseSession(courseSessionId, body.academicYearId, transaction);
    }

    const profileUpdates = {};
    if (body.name !== undefined) profileUpdates.name = body.name;
    if (body.planType !== undefined) profileUpdates.planType = body.planType;
    if (body.category !== undefined) profileUpdates.category = body.category;
    if (body.courseSessionId !== undefined) profileUpdates.courseSessionId = body.courseSessionId;
    if (body.publishStatus !== undefined) profileUpdates.publishStatus = body.publishStatus;

    if (Object.keys(profileUpdates).length > 0) {
      await repo.updateFeePlanProfileById(feePlanProfileId, profileUpdates, { transaction });
    }

    if (body.feePlanItems !== undefined) {
      await syncFeePlanItemsForUpdate(feePlanProfileId, body.feePlanItems, transaction);
    }
  });

  return getSingleFeePlanProfile(feePlanProfileId);
}

export async function publishFeePlanProfile(feePlanProfileId) {
  await sequelize.transaction(async (transaction) => {
    const profile = await repo.findFeePlanProfileById(feePlanProfileId, {
      forDetail: true,
      transaction,
    });
    if (!profile) {
      throw httpError("Fee plan profile not found", 404);
    }

    const plain = toPlain(profile);
    if (plain.publishStatus === "published") {
      throw httpError("Fee plan is already published", 400);
    }

    const items = plain.feePlanItems ?? [];
    if (!items.length) {
      throw httpError("Fee plan must have at least one term before publishing", 400);
    }

    const missingSubItems = items.some((item) => !(item.feePlanSubItems?.length));
    if (missingSubItems) {
      throw httpError(
        "Each fee plan term must have at least one fee line before publishing",
        400
      );
    }

    await repo.updateFeePlanProfileById(
      feePlanProfileId,
      { publishStatus: "published" },
      { transaction }
    );
  });

  return getSingleFeePlanProfile(feePlanProfileId);
}

export async function addFeePlanProfile(body) {
  const mapId = body.courseSessionId;

  const feePlanProfileId = await sequelize.transaction(async (transaction) => {
    await validateCourseSession(mapId, body.academicYearId, transaction);

    const profile = await repo.createFeePlanProfile(
      {
        name: body.name,
        planType: body.planType,
        category: body.category,
        courseSessionId: mapId,
        publishStatus: body.publishStatus ?? "draft",
      },
      { transaction }
    );

    if (body.feePlanItems !== undefined) {
      const installments = await prepareFeePlanItemsForDb(body.feePlanItems, transaction);
      await repo.createInstallmentsForProfile(profile.feePlanProfileId, installments, {
        transaction,
      });
    }

    return profile.feePlanProfileId;
  });

  return getSingleFeePlanProfile(feePlanProfileId);
}

export async function listFeePlanProfiles(courseSessionId) {
  return sequelize.transaction(async (transaction) => {
    const mapping = await repo.findSessionCourseMappingForInstitute(courseSessionId, {
      transaction,
    });
    if (!mapping) {
      throw new Error("courseSessionId not found or not in your institute");
    }

    const list = await repo.findFeePlanProfilesByInstitute({
      courseSessionId,
      transaction,
    });

    const feePlans = await buildFeePlanListRows(list, transaction);
    return { courseSessionId, feePlans };
  });
}

export async function listAllFeePlanProfiles(planStatus = "all") {
  return sequelize.transaction(async (transaction) => {
    const assignedProfileIds = await repo.findDistinctAssignedFeePlanProfileIds({
      transaction,
    });

    let list;
    if (planStatus === "active") {
      list = await repo.findFeePlanProfilesByInstitute({
        feePlanProfileIds: assignedProfileIds,
        transaction,
      });
    } else if (planStatus === "inactive") {
      list = await repo.findFeePlanProfilesByInstitute({
        excludeFeePlanProfileIds: assignedProfileIds,
        transaction,
      });
    } else {
      list = await repo.findFeePlanProfilesByInstitute({ transaction });
    }

    const feePlans = await buildFeePlanListRows(list, transaction);

    return { status: planStatus, feePlans };
  });
}

/** Fees Invoice dashboard cards: active = assigned to ≥1 student; inactive = none assigned. */
export async function getFeePlanProfileSummary() {
  const [allFeePlans, activeFeePlans] = await Promise.all([
    repo.countFeePlanProfilesByInstitute(),
    repo.countActiveFeePlanProfilesByInstitute(),
  ]);
  const inactiveFeePlans = allFeePlans - activeFeePlans;

  return {
    activeFeePlans,
    inactiveFeePlans,
    allFeePlans,
  };
}

export async function getSingleFeePlanProfile(feePlanProfileId) {
  const row = await repo.findFeePlanProfileById(feePlanProfileId, { forDetail: true });
  if (!row) return null;

  const [studentCountByProfile, invoiceCountByProfile, invoiceCountByItem] = await Promise.all([
    repo.countStudentsGroupedByFeePlanProfile(),
    repo.countStudentFeeInvoicesGroupedByFeePlanProfile(),
    repo.countStudentFeeInvoicesGroupedByFeePlanItem(),
  ]);

  return formatFeePlanProfileSingleResponse(row, {
    assignedStudentCount: studentCountByProfile.get(feePlanProfileId) ?? 0,
    numberOfInvoices: invoiceCountByProfile.get(feePlanProfileId) ?? 0,
    invoiceCountByItem,
  });
}

/**
 * Deletes a fee plan profile (draft or published).
 * Blocked only when assigned to any student or any invoice exists for its terms.
 */
export async function deleteFeePlanProfile(feePlanProfileId) {
  return sequelize.transaction(async (transaction) => {
    const profile = await repo.findFeePlanProfileByIdForInstitute(feePlanProfileId, {
      transaction,
    });
    if (!profile) {
      throw httpError("Fee plan profile not found", 404);
    }

    const assignedStudentCount = await repo.countStudentsForFeePlanProfile(feePlanProfileId, {
      transaction,
    });
    if (assignedStudentCount > 0) {
      throw httpError(
        "Cannot delete fee plan profile assigned to one or more students",
        400
      );
    }

    const invoiceCount = await repo.countStudentFeeInvoicesForFeePlanProfile(feePlanProfileId, {
      transaction,
    });
    if (invoiceCount > 0) {
      throw httpError(
        "Cannot delete fee plan profile that has generated invoices",
        400
      );
    }

    await repo.deleteFeePlanProfileCascade(feePlanProfileId, { transaction });

    return {
      feePlanProfileId: Number(feePlanProfileId),
      publishStatus: toPlain(profile).publishStatus ?? "draft",
      deleted: true,
    };
  });
}

/** Assign fee v2 plan to student (students.fee_plan_profile_id). */
export async function assignFeePlanProfileToStudent(body) {
  const { studentId, feePlanProfileId } = body;

  return sequelize.transaction(async (transaction) => {
    const profile = await repo.findFeePlanProfileByIdForInstitute(feePlanProfileId, {
      transaction,
    });
    if (!profile) {
      throw httpError("Fee plan profile not found for this institute", 404);
    }
    assertFeePlanProfilePublished(toPlain(profile));

    const student = await studentRepo.findStudentByIdForInstitute(studentId, {
      transaction,
    });
    if (!student) {
      throw httpError("Student not found for this institute", 404);
    }

    await studentRepo.updateStudentFeePlanProfileId(
      studentId,
      feePlanProfileId,
      { transaction }
    );

    const plainStudent = toPlain(student);
    const profilePlain = toPlain(profile);

    return {
      studentId,
      feePlanProfileId,
      studentName: [plainStudent.firstName, plainStudent.lastName].filter(Boolean).join(" ").trim() || null,
      scholarNumber: plainStudent.scholarNumber ?? null,
      feePlanName: profilePlain.name ?? null,
      planType: profilePlain.planType ?? null,
      category: profilePlain.category ?? null,
      publishStatus: profilePlain.publishStatus ?? null,
    };
  });
}
