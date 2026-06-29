import { v4 as uuidv4 } from "uuid";
import sequelize from "../database/sequelizeConfig.js";
import * as repo from "../repository/assetIssueRepository.js";
import * as paymentRepo from "../repository/studentFeePaymentRepository.js";
import { decimalCompare, toMoneyNumber } from "../utility/decimalMoney.js";
import { syncAssetStatusesFromInventory } from "./assetServices.js";

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function toPlain(row) {
  if (!row) return null;
  return typeof row.get === "function" ? row.get({ plain: true }) : row;
}

function buildMemberDetailsFromStudent(memberId, studentRow) {
  const student = toPlain(studentRow);
  return {
    memberId,
    memberType: "STUDENT",
    memberName: [student?.firstName, student?.middleName, student?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || null,
    scholarNumber: student?.scholarNumber ?? null,
    courseId: student?.course?.courseId ?? student?.courseId ?? null,
    courseName: student?.course?.courseName ?? null,
  };
}

function buildMemberDetailsFromEmployee(memberId, employeeRow) {
  const employee = toPlain(employeeRow);
  return {
    memberId,
    memberType: "TEACHER",
    memberName: employee?.employeeName ?? null,
    employeeCode: employee?.employeeCode ?? null,
    department: employee?.department ?? null,
  };
}

function formatInventoryLocationFields(inventory, options = {}) {
  if (!inventory) {
    return {
      classRoomSectionId: null,
      classRoom: null,
      ...(options.includeInventoryStatus !== false ? { inventoryStatus: null } : {}),
    };
  }

  return {
    classRoomSectionId: inventory.classRoomSectionId ?? null,
    classRoom: inventory.classRoom ? toPlain(inventory.classRoom) : null,
    ...(options.includeInventoryStatus !== false
      ? { inventoryStatus: inventory.status ?? null }
      : {}),
  };
}

function formatSecurityPaymentBasic(paymentItemRow) {
  const item = toPlain(paymentItemRow);
  if (!item?.payment) return null;

  const payment = item.payment;
  return {
    studentFeePaymentId: payment.studentFeePaymentId,
    paymentType: payment.paymentType,
    payeeId: payment.payeeId,
    payeeType: payment.payeeType,
    amount: toMoneyNumber(payment.amount),
    paymentMethod: payment.paymentMethod,
    referenceNumber: payment.referenceNumber ?? null,
    transactionId: payment.transactionId ?? null,
    remark: payment.remark ?? null,
    paymentItem: {
      paymentItemId: item.paymentItemId,
      referenceId: item.referenceId,
      referenceType: item.referenceType,
      amount: toMoneyNumber(item.amount),
    },
  };
}

function buildIssueUpdatePayload(body) {
  return Object.fromEntries(
    Object.entries({
      memberId: body.memberId,
      memberType: body.memberType,
      issueDate: body.issueDate,
      dueDate: body.dueDate,
    }).filter(([, value]) => value !== undefined)
  );
}

function extractMemberBasicDetails(issuePlain) {
  if (issuePlain.memberType === "STUDENT") {
    return buildMemberDetailsFromStudent(issuePlain.memberId, issuePlain.studentMember);
  }

  return buildMemberDetailsFromEmployee(issuePlain.memberId, issuePlain.teacherMember);
}

async function getIssueItemStats(assetIssueTransactionId, transaction) {
  const statsByIssueId = await repo.countIssueItemStatsByTransactionIds(
    [assetIssueTransactionId],
    { transaction }
  );

  return (
    statsByIssueId[assetIssueTransactionId] ?? {
      issuedTotalItems: 0,
      returnedTotalItems: 0,
    }
  );
}

function extractSecurityPaymentRow(issuePlain) {
  const paymentItems = issuePlain.securityPaymentItems;
  if (!paymentItems?.length) {
    return null;
  }

  return paymentItems[0];
}

function extractSecurityAmount(securityPaymentRow) {
  if (!securityPaymentRow) {
    return 0;
  }

  const plain = toPlain(securityPaymentRow);
  return toMoneyNumber(plain.payment?.amount ?? plain.amount);
}

function resolvePayeeDetailsFromPayment(payment) {
  if (!payment) {
    return null;
  }

  if (payment.payeeType === "STUDENT") {
    return buildMemberDetailsFromStudent(payment.payeeId, payment.studentPayee);
  }

  return buildMemberDetailsFromEmployee(payment.payeeId, payment.employeePayee);
}

function resolveIssueItemStatus(itemPlain) {
  return itemPlain.assetReturnTransactionId != null ? "returned" : "issued";
}

function formatIssueItemBasic(item, options = {}) {
  const plain = toPlain(item);
  if (!plain) return null;

  const inventory = plain.inventoryItem;
  const asset = inventory?.asset;

  return {
    assetIssueInventoryItemId: plain.assetIssueInventoryItemId,
    assetInventoryItemId: plain.assetInventoryItemId,
    itemStatus: resolveIssueItemStatus(plain),
    inventoryCode: inventory?.code ?? null,
    inventoryBarcode: inventory?.barcode ?? null,
    ...formatInventoryLocationFields(inventory, options),
    asset: asset
      ? {
          assetId: asset.assetId,
          name: asset.name,
          code: asset.code,
          status: asset.status,
          condition: asset.condition,
        }
      : null,
    damageNotes: plain.damageNotes ?? null,
    returnCondition: plain.returnCondition ?? null,
    returnTransaction: plain.returnTransaction
      ? {
          assetReturnTransactionId: plain.returnTransaction.assetReturnTransactionId,
          returnDate: plain.returnTransaction.returnDate,
        }
      : null,
  };
}

function formatIssueItems(items, options = {}) {
  const formattedItems = [];

  for (const item of items ?? []) {
    const formattedItem = formatIssueItemBasic(item, options);
    if (formattedItem) {
      formattedItems.push(formattedItem);
    }
  }

  return formattedItems;
}

function formatAssetIssueRecord(
  issuePlain,
  memberBasicDetails,
  securityPaymentRow = null,
  itemStats = null,
  securityAmountOverride = null,
  options = {}
) {
  const record = {
    assetIssueTransactionId: issuePlain.assetIssueTransactionId,
    instituteId: issuePlain.instituteId,
    memberId: issuePlain.memberId,
    memberType: issuePlain.memberType,
    issueDate: issuePlain.issueDate,
    dueDate: issuePlain.dueDate,
    securityAmount:
      securityAmountOverride ?? extractSecurityAmount(securityPaymentRow),
    memberBasicDetails,
    issuedTotalItems: itemStats?.issuedTotalItems ?? 0,
    returnedTotalItems: itemStats?.returnedTotalItems ?? 0,
    items: formatIssueItems(issuePlain.items, options),
  };

  if (securityPaymentRow !== null) {
    record.securityPayment = formatSecurityPaymentBasic(securityPaymentRow);
  }

  return record;
}

function formatAssetIssuePaymentRecord(paymentItemRow, meta, payeeDetails = null) {
  const formatted = formatSecurityPaymentBasic(paymentItemRow);
  if (!formatted) {
    return null;
  }

  return {
    paymentPurpose: meta.paymentPurpose,
    assetIssueTransactionId: meta.assetIssueTransactionId ?? null,
    assetReturnTransactionId: meta.assetReturnTransactionId ?? null,
    payeeDetails,
    ...formatted,
  };
}

async function validateMember(memberType, memberId, transaction) {
  if (memberType === "STUDENT") {
    const student = await repo.findStudentById(memberId, { transaction });
    if (!student) {
      throw httpError("memberId student not found in your institute", 404);
    }
    return;
  }

  const teacher = await repo.findTeacherById(memberId, { transaction });
  if (!teacher) {
    throw httpError("memberId employee not found in your institute", 404);
  }
}

function assertDueDateOnOrAfterIssueDate(issueDate, dueDate) {
  if (dueDate < issueDate) {
    throw httpError("dueDate must be on or after issueDate", 400);
  }
}

function throwInventoryValidationError(validationError) {
  if (!validationError) {
    return;
  }

  if (validationError.code === "EMPTY") {
    throw httpError("At least one inventory item is required", 400);
  }

  if (validationError.code === "MISSING") {
    throw httpError(
      `assetInventoryItemId ${validationError.assetInventoryItemId} not found in your institute`,
      404
    );
  }

  if (validationError.code === "NOT_ASSIGNED") {
    throw httpError(
      `assetInventoryItemId ${validationError.assetInventoryItemId} is not assigned to any class room section and cannot be issued`,
      400
    );
  }

  throw httpError(
    `assetInventoryItemId ${validationError.assetInventoryItemId} is already issued and not returned`,
    409
  );
}

async function validateIssueInventoryItems(items, transaction) {
  const inventoryItemIds = repo.extractInventoryItemIds(items);
  const validationError = await repo.findIssueInventoryItemValidationError(inventoryItemIds, {
    transaction,
  });
  throwInventoryValidationError(validationError);
}

async function createSecurityPaymentForAssetIssue(
  { assetIssueTransactionId, memberId, memberType, securityAmount, paymentMethod, createdBy },
  transaction
) {
  const amount = toMoneyNumber(securityAmount);
  if (decimalCompare(amount, 0) <= 0) {
    return null;
  }

  const payeeType = memberType === "STUDENT" ? "STUDENT" : "OTHER";

  const referenceNumber = uuidv4();
  const transactionId = uuidv4();

  const payment = await paymentRepo.createStudentFeePayment(
    {
      paymentType: "INCOMING",
      payeeId: memberId,
      payeeType,
      amount,
      paymentMethod: paymentMethod ?? "cash",
      referenceNumber,
      transactionId,
      receivedBy: null,
      remark: `Asset issue security deposit (transaction #${assetIssueTransactionId})`,
      createdBy,
    },
    { transaction }
  );

  const paymentItem = await paymentRepo.createPaymentItem(
    {
      paymentId: payment.studentFeePaymentId,
      referenceId: assetIssueTransactionId,
      referenceType: "ASSET_SECURITY",
      amount,
    },
    { transaction }
  );

  return {
    studentFeePayment: toPlain(payment),
    paymentItem: toPlain(paymentItem),
  };
}

export async function createAssetIssue(body, createdBy) {
  const row = await sequelize.transaction(async (transaction) => {
    assertDueDateOnOrAfterIssueDate(body.issueDate, body.dueDate);
    await validateMember(body.memberType, body.memberId, transaction);
    await validateIssueInventoryItems(body.items, transaction);

    const inventoryItemIds = repo.extractInventoryItemIds(body.items);
    const issueAssetIds = await repo.findDistinctAssetIdsByInventoryItemIds(inventoryItemIds, {
      transaction,
    });

    const issue = await repo.createAssetIssue(
      {
        memberId: body.memberId,
        memberType: body.memberType,
        issueDate: body.issueDate,
        dueDate: body.dueDate,
      },
      { transaction }
    );

    await repo.createAssetIssueInventoryItems(
      repo.buildAssetIssueInventoryItemRows(issue.assetIssueTransactionId, body.items),
      { transaction }
    );
    await syncAssetStatusesFromInventory(issueAssetIds, { transaction });

    if (body.securityAmount !== undefined) {
      await createSecurityPaymentForAssetIssue(
        {
          assetIssueTransactionId: issue.assetIssueTransactionId,
          memberId: body.memberId,
          memberType: body.memberType,
          securityAmount: body.securityAmount,
          paymentMethod: body.paymentMethod,
          createdBy,
        },
        transaction
      );
    }

    const issueRow = await repo.findAssetIssueById(issue.assetIssueTransactionId, {
      transaction,
      includeMember: true,
      includeSecurityPayment: true,
    });
    const issuePlain = toPlain(issueRow);

    return formatAssetIssueRecord(
      issuePlain,
      extractMemberBasicDetails(issuePlain),
      extractSecurityPaymentRow(issuePlain),
      await getIssueItemStats(issue.assetIssueTransactionId, transaction)
    );
  });

  return row;
}

export async function listAssetIssues(query) {
  const {
    rows,
    total,
    page,
    limit,
    itemStatsByIssueId,
    securityAmountByIssueId,
  } = await repo.findAssetIssuesPaginated(
    { search: query.search },
    { page: query.page, limit: query.limit }
  );

  const enrichedAssetIssues = [];
  for (const row of rows) {
    const issue = toPlain(row);
    const issueId = issue.assetIssueTransactionId;

    enrichedAssetIssues.push(
      formatAssetIssueRecord(
        issue,
        extractMemberBasicDetails(issue),
        null,
        itemStatsByIssueId[issueId],
        securityAmountByIssueId[issueId] ?? 0,
        { includeInventoryStatus: false }
      )
    );
  }

  return {
    data: { assetIssues: enrichedAssetIssues },
    pagination: { page, limit, total },
  };
}

export async function getAssetIssuePaymentsById(assetIssueTransactionId) {
  const [issue, paymentRows] = await Promise.all([
    repo.findAssetIssueById(assetIssueTransactionId, {
      includeItems: false,
      includeMember: true,
    }),
    repo.findAssetIssuePaymentsWithPayeesByIssueId(assetIssueTransactionId),
  ]);

  if (!issue) {
    throw httpError("Asset issue not found", 404);
  }

  const issuePlain = toPlain(issue);
  const memberBasicDetails = extractMemberBasicDetails(issuePlain);
  const payments = [];

  for (const paymentRow of paymentRows) {
    const paymentItemPlain = toPlain(paymentRow);
    const payment = paymentItemPlain.payment;
    const isSecurity = paymentItemPlain.referenceType === "ASSET_SECURITY";
    const record = formatAssetIssuePaymentRecord(
      paymentRow,
      isSecurity
        ? {
            paymentPurpose: "ASSET_SECURITY",
            assetIssueTransactionId,
          }
        : {
            paymentPurpose: "RETURN_SETTLEMENT",
            assetIssueTransactionId,
            assetReturnTransactionId: paymentItemPlain.referenceId,
          },
      resolvePayeeDetailsFromPayment(payment)
    );

    if (record) {
      payments.push(record);
    }
  }

  return {
    assetIssueTransactionId,
    issueDate: issuePlain.issueDate,
    dueDate: issuePlain.dueDate,
    memberId: issuePlain.memberId,
    memberType: issuePlain.memberType,
    memberBasicDetails,
    payments,
  };
}

export async function getSingleAssetIssue(assetIssueTransactionId) {
  const issue = await repo.findAssetIssueById(assetIssueTransactionId, {
    includeMember: true,
    includeSecurityPayment: true,
  });

  if (!issue) {
    throw httpError("Asset issue not found", 404);
  }

  const issuePlain = toPlain(issue);
  const itemStats = await getIssueItemStats(assetIssueTransactionId);

  return formatAssetIssueRecord(
    issuePlain,
    extractMemberBasicDetails(issuePlain),
    extractSecurityPaymentRow(issuePlain),
    itemStats
  );
}

export async function updateAssetIssue(assetIssueTransactionId, body) {
  const data = await sequelize.transaction(async (transaction) => {
    const existing = await repo.findAssetIssueById(assetIssueTransactionId, { transaction });
    if (!existing) {
      throw httpError("Asset issue not found", 404);
    }

    const existingPlain = toPlain(existing);
    const issuePayload = buildIssueUpdatePayload(body);
    const finalMemberType = issuePayload.memberType ?? existingPlain.memberType;
    const finalMemberId = issuePayload.memberId ?? existingPlain.memberId;

    if (issuePayload.memberType !== undefined || issuePayload.memberId !== undefined) {
      await validateMember(finalMemberType, finalMemberId, transaction);
    }

    const finalIssueDate = issuePayload.issueDate ?? existingPlain.issueDate;
    const finalDueDate = issuePayload.dueDate ?? existingPlain.dueDate;
    if (issuePayload.issueDate !== undefined || issuePayload.dueDate !== undefined) {
      assertDueDateOnOrAfterIssueDate(finalIssueDate, finalDueDate);
    }

    if (Object.keys(issuePayload).length > 0) {
      const affected = await repo.updateAssetIssue(assetIssueTransactionId, issuePayload, {
        transaction,
      });
      if (!affected) {
        throw httpError("Asset issue update failed", 500);
      }
    }

    const updated = await repo.findAssetIssueById(assetIssueTransactionId, {
      transaction,
      includeMember: true,
      includeSecurityPayment: true,
    });
    const updatedPlain = toPlain(updated);

    return formatAssetIssueRecord(
      updatedPlain,
      extractMemberBasicDetails(updatedPlain),
      extractSecurityPaymentRow(updatedPlain),
      await getIssueItemStats(assetIssueTransactionId, transaction)
    );
  });

  return data;
}
