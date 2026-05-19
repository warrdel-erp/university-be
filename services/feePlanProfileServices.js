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
    name: (line.feeTypeCatalog ?? {}).name ?? null,
    amount: toMoneyNumber(line.amount),
    isMainSubItem: isMainFeePlanSubItem(line),
  }));
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

/** Validates catalogs and maps feePlanItems to repository installment shape. */
async function prepareFeePlanItemsForDb(feePlanItemsInput, instituteId, transaction) {
  const prepared = [];

  for (const installment of feePlanItemsInput) {
    const subItems = [];

    for (const line of installment.feePlanSubItems) {
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
    courseSessionId: plainProfile.courseSessionId,
    term: items.length,
    termFees,
    supplementalFees,
    totalFees: decimalAdd(termFees, supplementalFees),
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
    supplementalFees: supplementalFeesTotal,
    totalFees: decimalAdd(termFees, supplementalFeesTotal),
    feePlanItems,
  };
}

async function syncFeePlanItemsForUpdate(
  feePlanProfileId,
  instituteId,
  feePlanItemsInput,
  transaction
) {
  const existingItems = await repo.findFeePlanItemsByProfileId(
    feePlanProfileId,
    instituteId,
    { transaction }
  );
  const existingIdSet = new Set(existingItems.map((row) => toPlain(row).feePlanItemId));

  for (const input of feePlanItemsInput) {
    if (!existingIdSet.has(input.feePlanItemId)) {
      throw httpError(
        `feePlanItemId ${input.feePlanItemId} does not belong to this fee plan profile`,
        400
      );
    }
  }

  const preparedInstallments = await prepareFeePlanItemsForDb(
    feePlanItemsInput,
    instituteId,
    transaction
  );

  for (let index = 0; index < feePlanItemsInput.length; index++) {
    const itemId = feePlanItemsInput[index].feePlanItemId;
    const installment = preparedInstallments[index];

    await repo.updateFeePlanItemById(
      itemId,
      instituteId,
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
          instituteId,
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
          instituteId,
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
          instituteId,
          isMainSubItem: line.isMainSubItem,
        },
        { transaction }
      );
      keptSubItemIds.add(toPlain(created).feePlanSubitemId);
    }

    const existingSubItems = await repo.findFeePlanSubItemsByFeePlanItemId(itemId, instituteId, {
      transaction,
    });
    for (const subItem of existingSubItems) {
      const subItemId = toPlain(subItem).feePlanSubitemId;
      if (!keptSubItemIds.has(subItemId)) {
        await repo.deleteFeePlanSubItemById(subItemId, instituteId, { transaction });
      }
    }
  }
}

export async function updateFeePlanProfile(body, instituteId) {
  const { feePlanProfileId } = body;

  await sequelize.transaction(async (transaction) => {
    const profile = await repo.findFeePlanProfileByIdForInstitute(
      feePlanProfileId,
      instituteId,
      { transaction }
    );
    if (!profile) {
      throw httpError("Fee plan profile not found", 404);
    }

    const profilePlain = toPlain(profile);
    const courseSessionId = body.courseSessionId ?? profilePlain.courseSessionId;

    if (body.courseSessionId !== undefined || body.academicYearId !== undefined) {
      await validateCourseSession(courseSessionId, instituteId, body.academicYearId, transaction);
    }

    const profileUpdates = {};
    if (body.name !== undefined) profileUpdates.name = body.name;
    if (body.planType !== undefined) profileUpdates.planType = body.planType;
    if (body.courseSessionId !== undefined) profileUpdates.courseSessionId = body.courseSessionId;

    if (Object.keys(profileUpdates).length > 0) {
      await repo.updateFeePlanProfileById(
        feePlanProfileId,
        instituteId,
        profileUpdates,
        { transaction }
      );
    }

    if (body.feePlanItems !== undefined) {
      await syncFeePlanItemsForUpdate(
        feePlanProfileId,
        instituteId,
        body.feePlanItems,
        transaction
      );
    }
  });

  return getSingleFeePlanProfile(feePlanProfileId, instituteId);
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
      const installments = await prepareFeePlanItemsForDb(body.feePlanItems, instituteId, transaction);
      await repo.createInstallmentsForProfile(
        profile.feePlanProfileId,
        instituteId,
        installments,
        { transaction }
      );
    }

    return profile.feePlanProfileId;
  });

  return getSingleFeePlanProfile(feePlanProfileId, instituteId);
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

/** Assign fee v2 plan to student (students.fee_plan_profile_id). */
export async function assignFeePlanProfileToStudent(body, instituteId) {
  const { studentId, feePlanProfileId } = body;

  return sequelize.transaction(async (transaction) => {
    const profile = await repo.findFeePlanProfileByIdForInstitute(
      feePlanProfileId,
      instituteId,
      { transaction }
    );
    if (!profile) {
      throw httpError("Fee plan profile not found for this institute", 404);
    }

    const student = await studentRepo.findStudentByIdForInstitute(studentId, instituteId, {
      transaction,
    });
    if (!student) {
      throw httpError("Student not found for this institute", 404);
    }

    await studentRepo.updateStudentFeePlanProfileId(
      studentId,
      instituteId,
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
    };
  });
}
