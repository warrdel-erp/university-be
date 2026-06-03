import { v4 as uuidv4 } from "uuid";
import sequelize from "../database/sequelizeConfig.js";
import * as repo from "../repository/assetIssueRepository.js";
import * as assetRepo from "../repository/assetRepository.js";
import * as paymentRepo from "../repository/studentFeePaymentRepository.js";
import { decimalCompare, toMoneyNumber } from "../utility/decimalMoney.js";
import { syncAssetStatusFromInventory } from "../utility/syncAssetStatusFromInventory.js";

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function toPlain(row) {
  if (!row) return null;
  return typeof row.get === "function" ? row.get({ plain: true }) : row;
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

function buildMemberDetailsFromStudent(memberId, studentRow) {
  const student = toPlain(studentRow);
  return {
    memberId,
    memberType: "STUDENT",
    memberName: [student?.firstName, student?.middleName, student?.lastName].filter(Boolean).join(" ").trim() || null,
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

async function getMemberDetails(memberType, memberId, instituteId, transaction) {
  if (memberType === "STUDENT") {
    const student = await repo.findStudentMemberDetailsById(memberId, instituteId, { transaction });
    return buildMemberDetailsFromStudent(memberId, student);
  }

  const employee = await repo.findEmployeeMemberDetailsById(memberId, instituteId, { transaction });
  return buildMemberDetailsFromEmployee(memberId, employee);
}

function formatIssueItemBasic(item) {
  const plain = toPlain(item);
  if (!plain) return null;

  const inventory = plain.inventoryItem;
  const asset = inventory?.asset;

  return {
    assetIssueInventoryItemId: plain.assetIssueInventoryItemId,
    assetInventoryItemId: plain.assetInventoryItemId,
    inventoryCode: inventory?.code ?? null,
    inventoryBarcode: inventory?.barcode ?? null,
    asset: asset
      ? {
          assetId: asset.assetId,
          name: asset.name,
          code: asset.code,
          status: asset.status,
          condition: asset.condition,
        }
      : null,
    returnTransaction: plain.returnTransaction
      ? {
          assetReturnTransactionId: plain.returnTransaction.assetReturnTransactionId,
          returnDate: plain.returnTransaction.returnDate,
        }
      : null,
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

function formatAssetIssueRecord(issuePlain, memberBasicDetails, securityPaymentRow) {
  return {
    assetIssueTransactionId: issuePlain.assetIssueTransactionId,
    instituteId: issuePlain.instituteId,
    memberId: issuePlain.memberId,
    memberType: issuePlain.memberType,
    issueDate: issuePlain.issueDate,
    dueDate: issuePlain.dueDate,
    memberBasicDetails,
    items: (issuePlain.items ?? []).map(formatIssueItemBasic),
    securityPayment: formatSecurityPaymentBasic(securityPaymentRow),
  };
}

function formatReturnedIssueItem(itemPlain, memberBasicDetails) {
  const inventory = itemPlain.inventoryItem;
  const asset = inventory?.asset;
  const transaction = itemPlain.transaction;

  return {
    assetIssueInventoryItemId: itemPlain.assetIssueInventoryItemId,
    assetInventoryItemId: itemPlain.assetInventoryItemId,
    inventoryCode: inventory?.code ?? null,
    inventoryBarcode: inventory?.barcode ?? null,
    asset: asset
      ? {
          assetId: asset.assetId,
          name: asset.name,
          code: asset.code,
          status: asset.status,
          condition: asset.condition,
        }
      : null,
    assetIssueTransactionId: transaction?.assetIssueTransactionId ?? null,
    issueDate: transaction?.issueDate ?? null,
    dueDate: transaction?.dueDate ?? null,
    memberId: transaction?.memberId ?? null,
    memberType: transaction?.memberType ?? null,
    memberBasicDetails,
  };
}

function formatAssetReturnTransactionRecord(returnPlain, returnedItems) {
  return {
    assetReturnTransactionId: returnPlain.assetReturnTransactionId,
    returnDate: returnPlain.returnDate,
    items: returnedItems,
  };
}

async function validateMember(memberType, memberId, instituteId, transaction) {
  if (memberType === "STUDENT") {
    const student = await repo.findStudentById(memberId, instituteId, { transaction });
    if (!student) {
      throw httpError("memberId student not found in your institute", 404);
    }
    return;
  }

  const teacher = await repo.findTeacherById(memberId, instituteId, { transaction });
  if (!teacher) {
    throw httpError("memberId employee not found in your institute", 404);
  }
}

function assertDueDateOnOrAfterIssueDate(issueDate, dueDate) {
  if (dueDate < issueDate) {
    throw httpError("dueDate must be on or after issueDate", 400);
  }
}

function assertReturnDateOnOrAfterIssueDate(issueDate, returnDate) {
  if (returnDate < issueDate) {
    throw httpError("returnDate must be on or after issueDate", 400);
  }
}

async function validateIssueInventoryItems(items, instituteId, transaction) {
  if (!items.length) {
    throw httpError("At least one inventory item is required", 400);
  }

  const inventoryItemIds = [...new Set(items.map((item) => item.assetInventoryItemId))];
  if (inventoryItemIds.length !== items.length) {
    throw httpError("Duplicate assetInventoryItemId in items", 400);
  }

  const inventoryRows = await repo.findInstituteInventoryItemsByIds(
    inventoryItemIds,
    instituteId,
    { transaction }
  );
  const existingInventoryIds = new Set(inventoryRows.map((row) => row.assetInventoryItemId));

  const missingInventoryItemId = inventoryItemIds.find(
    (inventoryItemId) => !existingInventoryIds.has(inventoryItemId)
  );
  if (missingInventoryItemId) {
    throw httpError(`assetInventoryItemId ${missingInventoryItemId} not found in your institute`, 404);
  }

  const openLines = await repo.findOpenIssueLinesByInventoryIds(inventoryItemIds, { transaction });
  if (openLines.length) {
    throw httpError(
      `assetInventoryItemId ${openLines[0].assetInventoryItemId} is already issued and not returned`,
      409
    );
  }
}

async function processAssetReturnItems(returnDate, items, instituteId, transaction) {
  const uniqueItemIds = [...new Set(items.map((item) => item.assetIssueInventoryItemId))];
  if (uniqueItemIds.length !== items.length) {
    throw httpError("Duplicate assetIssueInventoryItemId in items", 400);
  }

  const issueLines = await repo.findIssueInventoryItemsForReturn(uniqueItemIds, instituteId, {
    transaction,
  });
  if (issueLines.length !== uniqueItemIds.length) {
    throw httpError(
      "One or more items are not issued, already returned, or not in your institute",
      404
    );
  }

  for (const row of issueLines) {
    const line = toPlain(row);
    assertReturnDateOnOrAfterIssueDate(line.transaction.issueDate, returnDate);
  }

  const returnTxn = await repo.createAssetReturnTransaction(returnDate, { transaction });
  const affected = await repo.linkIssueItemsToReturnTransaction(
    uniqueItemIds,
    returnTxn.assetReturnTransactionId,
    { transaction }
  );
  if (affected !== uniqueItemIds.length) {
    throw httpError("Failed to record return for one or more items", 500);
  }

  const assetIds = [...new Set(issueLines.map((row) => toPlain(row).inventoryItem.assetId))];
  for (const assetId of assetIds) {
    await syncAssetStatusFromInventory(assetId, instituteId, { transaction });
  }

  const updatedItems = await repo.findIssueInventoryItemsByIds(uniqueItemIds, { transaction });

  return {
    returnTransaction: toPlain(returnTxn),
    items: updatedItems.map(toPlain),
  };
}

async function createSecurityPaymentForAssetIssue(
  {
    assetIssueTransactionId,
    memberId,
    memberType,
    securityAmount,
    paymentMethod,
    instituteId,
    createdBy,
  },
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
      instituteId,
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

export async function createAssetIssue(body, instituteId, createdBy) {
  const row = await sequelize.transaction(async (transaction) => {
    assertDueDateOnOrAfterIssueDate(body.issueDate, body.dueDate);
    await validateMember(body.memberType, body.memberId, instituteId, transaction);
    await validateIssueInventoryItems(body.items, instituteId, transaction);

    const inventoryRows = await repo.findInstituteInventoryItemsByIds(
      [...new Set(body.items.map((item) => item.assetInventoryItemId))],
      instituteId,
      { transaction }
    );
    const issueAssetIds = [...new Set(inventoryRows.map((row) => row.assetId))];

    const issue = await repo.createAssetIssue(
      {
        instituteId,
        memberId: body.memberId,
        memberType: body.memberType,
        issueDate: body.issueDate,
        dueDate: body.dueDate,
      },
      { transaction }
    );

    const issueItems = body.items.map((item) => ({
      assetIssueTransactionId: issue.assetIssueTransactionId,
      assetInventoryItemId: item.assetInventoryItemId,
      assetReturnTransactionId: null,
    }));

    await repo.createAssetIssueInventoryItems(issueItems, { transaction });
    for (const assetId of issueAssetIds) {
      await syncAssetStatusFromInventory(assetId, instituteId, { transaction });
    }

    let securityPayment = null;
    if (body.securityAmount !== undefined) {
      securityPayment = await createSecurityPaymentForAssetIssue(
        {
          assetIssueTransactionId: issue.assetIssueTransactionId,
          memberId: body.memberId,
          memberType: body.memberType,
          securityAmount: body.securityAmount,
          paymentMethod: body.paymentMethod,
          instituteId,
          createdBy,
        },
        transaction
      );
    }

    const issueRow = await repo.findAssetIssueById(
      issue.assetIssueTransactionId,
      instituteId,
      { transaction }
    );
    const plain = toPlain(issueRow);
    if (securityPayment) {
      plain.securityPayment = securityPayment;
    }
    return plain;
  });

  return row;
}

export async function listAssetIssues(instituteId, query) {
  const { rows, total, page, limit } = await repo.findAssetIssuesPaginated(
    instituteId,
    { search: query.search },
    { page: query.page, limit: query.limit }
  );

  const assetIssues = rows.map(toPlain);
  const issueIds = assetIssues.map((issue) => issue.assetIssueTransactionId);
  const studentIds = [
    ...new Set(
      assetIssues
        .filter((issue) => issue.memberType === "STUDENT")
        .map((issue) => issue.memberId)
    ),
  ];
  const employeeIds = [
    ...new Set(
      assetIssues
        .filter((issue) => issue.memberType === "TEACHER")
        .map((issue) => issue.memberId)
    ),
  ];

  const [studentRows, employeeRows, securityPaymentRows] = await Promise.all([
    repo.findStudentMemberDetailsByIds(studentIds, instituteId),
    repo.findEmployeeMemberDetailsByIds(employeeIds, instituteId),
    repo.findAssetSecurityPaymentsByIssueIds(issueIds, instituteId),
  ]);

  const studentMap = new Map(studentRows.map((row) => [toPlain(row).studentId, row]));
  const employeeMap = new Map(employeeRows.map((row) => [toPlain(row).employeeId, row]));
  const securityPaymentMap = new Map(
    securityPaymentRows.map((row) => [toPlain(row).referenceId, row])
  );

  const enrichedAssetIssues = assetIssues.map((issue) => {
    const memberBasicDetails =
      issue.memberType === "STUDENT"
        ? buildMemberDetailsFromStudent(issue.memberId, studentMap.get(issue.memberId))
        : buildMemberDetailsFromEmployee(issue.memberId, employeeMap.get(issue.memberId));

    return formatAssetIssueRecord(
      issue,
      memberBasicDetails,
      securityPaymentMap.get(issue.assetIssueTransactionId)
    );
  });

  return {
    data: { assetIssues: enrichedAssetIssues },
    pagination: { page, limit, total },
  };
}

export async function getSingleAssetIssue(assetIssueTransactionId, instituteId) {
  const data = await sequelize.transaction(async (transaction) => {
    const issue = await repo.findAssetIssueById(assetIssueTransactionId, instituteId, { transaction });
    if (!issue) {
      throw httpError("Asset issue not found", 404);
    }

    const issuePlain = toPlain(issue);
    const memberBasicDetails = await getMemberDetails(
      issuePlain.memberType,
      issuePlain.memberId,
      instituteId,
      transaction
    );
    const securityPaymentRow = await repo.findAssetSecurityPaymentByIssueId(
      assetIssueTransactionId,
      instituteId,
      { transaction }
    );

    return formatAssetIssueRecord(issuePlain, memberBasicDetails, securityPaymentRow);
  });

  return data;
}

export async function updateAssetIssue(assetIssueTransactionId, body, instituteId) {
  const data = await sequelize.transaction(async (transaction) => {
    const existing = await repo.findAssetIssueById(assetIssueTransactionId, instituteId, { transaction });
    if (!existing) {
      throw httpError("Asset issue not found", 404);
    }

    const existingPlain = toPlain(existing);
    const issuePayload = buildIssueUpdatePayload(body);
    const finalMemberType = issuePayload.memberType ?? existingPlain.memberType;
    const finalMemberId = issuePayload.memberId ?? existingPlain.memberId;

    if (issuePayload.memberType !== undefined || issuePayload.memberId !== undefined) {
      await validateMember(finalMemberType, finalMemberId, instituteId, transaction);
    }

    const finalIssueDate = issuePayload.issueDate ?? existingPlain.issueDate;
    const finalDueDate = issuePayload.dueDate ?? existingPlain.dueDate;
    if (issuePayload.issueDate !== undefined || issuePayload.dueDate !== undefined) {
      assertDueDateOnOrAfterIssueDate(finalIssueDate, finalDueDate);
    }

    if (Object.keys(issuePayload).length > 0) {
      const affected = await repo.updateAssetIssue(
        assetIssueTransactionId,
        instituteId,
        issuePayload,
        { transaction }
      );
      if (!affected) {
        throw httpError("Asset issue update failed", 500);
      }
    }

    const updated = await repo.findAssetIssueById(assetIssueTransactionId, instituteId, { transaction });
    const updatedPlain = toPlain(updated);
    const memberBasicDetails = await getMemberDetails(
      updatedPlain.memberType,
      updatedPlain.memberId,
      instituteId,
      transaction
    );
    const securityPaymentRow = await repo.findAssetSecurityPaymentByIssueId(
      assetIssueTransactionId,
      instituteId,
      { transaction }
    );

    return formatAssetIssueRecord(updatedPlain, memberBasicDetails, securityPaymentRow);
  });

  return data;
}

export async function returnAssetIssueItems(body, instituteId) {
  return sequelize.transaction(async (transaction) =>
    processAssetReturnItems(body.returnDate, body.items, instituteId, transaction)
  );
}

export async function listAssetReturnTransactions(instituteId, query) {
  const { rows, total, page, limit } = await repo.findAssetReturnTransactionsPaginated(
    instituteId,
    { page: query.page, limit: query.limit }
  );

  const returnRows = rows.map(toPlain);
  const returnIds = returnRows.map((row) => row.assetReturnTransactionId);

  const issueItemRows = await repo.findReturnedIssueItemsByReturnTransactionIds(
    returnIds,
    instituteId
  );
  const issueItems = issueItemRows.map(toPlain);

  const studentIds = [
    ...new Set(
      issueItems
        .filter((item) => item.transaction?.memberType === "STUDENT")
        .map((item) => item.transaction.memberId)
    ),
  ];
  const employeeIds = [
    ...new Set(
      issueItems
        .filter((item) => item.transaction?.memberType === "TEACHER")
        .map((item) => item.transaction.memberId)
    ),
  ];

  const [studentRows, employeeRows] = await Promise.all([
    repo.findStudentMemberDetailsByIds(studentIds, instituteId),
    repo.findEmployeeMemberDetailsByIds(employeeIds, instituteId),
  ]);

  const studentMap = new Map(studentRows.map((row) => [toPlain(row).studentId, row]));
  const employeeMap = new Map(employeeRows.map((row) => [toPlain(row).employeeId, row]));

  const itemsByReturnId = new Map();
  for (const item of issueItems) {
    const returnId = item.assetReturnTransactionId;
    const txn = item.transaction;
    const memberBasicDetails =
      txn?.memberType === "STUDENT"
        ? buildMemberDetailsFromStudent(txn.memberId, studentMap.get(txn.memberId))
        : buildMemberDetailsFromEmployee(txn.memberId, employeeMap.get(txn.memberId));

    if (!itemsByReturnId.has(returnId)) {
      itemsByReturnId.set(returnId, []);
    }
    itemsByReturnId.get(returnId).push(formatReturnedIssueItem(item, memberBasicDetails));
  }

  const assetReturnTransactions = returnRows.map((returnRow) =>
    formatAssetReturnTransactionRecord(
      returnRow,
      itemsByReturnId.get(returnRow.assetReturnTransactionId) ?? []
    )
  );

  return {
    data: { assetReturnTransactions },
    pagination: { page, limit, total },
  };
}
