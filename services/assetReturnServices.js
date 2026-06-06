import { v4 as uuidv4 } from "uuid";
import sequelize from "../database/sequelizeConfig.js";
import * as repo from "../repository/assetIssueRepository.js";
import * as paymentRepo from "../repository/studentFeePaymentRepository.js";
import {
  decimalAdd,
  decimalCompare,
  decimalSubtract,
  decimalSum,
  toMoneyNumber,
} from "../utility/decimalMoney.js";
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

function formatInventoryLocationFields(inventory) {
  if (!inventory) {
    return {
      classRoomSectionId: null,
      inventoryStatus: null,
      classRoom: null,
    };
  }

  return {
    classRoomSectionId: inventory.classRoomSectionId ?? null,
    inventoryStatus: inventory.status ?? null,
    classRoom: inventory.classRoom ? toPlain(inventory.classRoom) : null,
  };
}

function formatAssetBasicForReturn(asset) {
  if (!asset) return null;

  const plain = toPlain(asset);
  const category = plain.assetCategory ? toPlain(plain.assetCategory) : null;

  return {
    assetId: plain.assetId,
    name: plain.name,
    code: plain.code,
    status: plain.status,
    condition: plain.condition,
    description: plain.description ?? null,
    assetCategoryId: plain.assetCategoryId ?? null,
    assetCategoryName: category?.name ?? null,
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

function assertReturnDateOnOrAfterIssueDate(issueDate, returnDate) {
  if (returnDate < issueDate) {
    throw httpError("returnDate must be on or after issueDate", 400);
  }
}

function formatReturnedIssueItem(itemPlain, memberBasicDetails) {
  const inventory = itemPlain.inventoryItem;
  const asset = inventory?.asset;
  const transaction = itemPlain.transaction;

  return {
    assetIssueInventoryItemId: itemPlain.assetIssueInventoryItemId,
    assetInventoryItemId: itemPlain.assetInventoryItemId,
    damageNotes: itemPlain.damageNotes ?? null,
    returnCondition: itemPlain.returnCondition ?? null,
    inventoryCode: inventory?.code ?? null,
    inventoryBarcode: inventory?.barcode ?? null,
    ...formatInventoryLocationFields(inventory),
    asset: formatAssetBasicForReturn(asset),
    assetIssueTransactionId: transaction?.assetIssueTransactionId ?? null,
    issueDate: transaction?.issueDate ?? null,
    dueDate: transaction?.dueDate ?? null,
    memberId: transaction?.memberId ?? null,
    memberType: transaction?.memberType ?? null,
    memberBasicDetails,
  };
}

function formatReturnListItem(itemPlain) {
  const inventory = itemPlain.inventoryItem;
  const asset = inventory?.asset;

  return {
    assetIssueInventoryItemId: itemPlain.assetIssueInventoryItemId,
    assetInventoryItemId: itemPlain.assetInventoryItemId,
    itemStatus: "returned",
    inventoryCode: inventory?.code ?? null,
    inventoryBarcode: inventory?.barcode ?? null,
    classRoomSectionId: inventory?.classRoomSectionId ?? null,
    classRoom: inventory?.classRoom ? toPlain(inventory.classRoom) : null,
    asset: asset
      ? {
          assetId: asset.assetId,
          name: asset.name,
          code: asset.code,
          status: asset.status,
          condition: asset.condition,
        }
      : null,
    damageNotes: itemPlain.damageNotes ?? null,
    returnCondition: itemPlain.returnCondition ?? null,
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

function resolvePayeeDetails(payeeType, payeeId, studentMap, employeeMap) {
  if (payeeType === "STUDENT") {
    return buildMemberDetailsFromStudent(payeeId, studentMap.get(payeeId));
  }
  return buildMemberDetailsFromEmployee(payeeId, employeeMap.get(payeeId));
}

async function loadPayeeLookupMaps(paymentRows, instituteId) {
  const studentIds = [];
  const employeeIds = [];

  for (const row of paymentRows) {
    const payment = toPlain(row)?.payment;
    if (!payment?.payeeId) {
      continue;
    }
    if (payment.payeeType === "STUDENT") {
      studentIds.push(payment.payeeId);
    } else {
      employeeIds.push(payment.payeeId);
    }
  }

  const [studentRows, employeeRows] = await Promise.all([
    repo.findStudentMemberDetailsByIds([...new Set(studentIds)], instituteId),
    repo.findEmployeeMemberDetailsByIds([...new Set(employeeIds)], instituteId),
  ]);

  return {
    studentMap: new Map(studentRows.map((row) => [toPlain(row).studentId, row])),
    employeeMap: new Map(employeeRows.map((row) => [toPlain(row).employeeId, row])),
  };
}

function formatAssetReturnPaymentRecord(paymentItemRow, meta, payeeDetails = null) {
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

function extractMemberBasicDetailsFromTransaction(transaction) {
  if (!transaction) {
    return null;
  }

  if (transaction.memberType === "STUDENT") {
    return buildMemberDetailsFromStudent(transaction.memberId, transaction.studentMember);
  }

  return buildMemberDetailsFromEmployee(transaction.memberId, transaction.teacherMember);
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

function extractPaymentAmount(paymentItemRow) {
  const plain = toPlain(paymentItemRow);
  if (!plain) {
    return 0;
  }

  return toMoneyNumber(plain.payment?.amount ?? plain.amount);
}

function computeReturnSettlementAmounts(
  returnId,
  issueTransactionIds,
  securityAmountByIssueId,
  settlementByReturnId
) {
  const securityAmount = decimalSum(
    [...new Set(issueTransactionIds)].map(
      (issueTransactionId) => securityAmountByIssueId[issueTransactionId] ?? 0
    )
  );

  const settlementPaymentRow = settlementByReturnId.get(returnId);
  if (!settlementPaymentRow) {
    return {
      securityAmount: 0,
      fineAmount: 0,
      paidAmount: 0,
    };
  }

  const payment = toPlain(settlementPaymentRow).payment;
  const paidAmount = extractPaymentAmount(settlementPaymentRow);
  let fineAmount = 0;

  if (payment?.paymentType === "INCOMING") {
    fineAmount = decimalAdd(securityAmount, paidAmount);
  } else if (payment?.paymentType === "OUTGOING") {
    fineAmount = decimalSubtract(securityAmount, paidAmount);
  }

  return {
    securityAmount,
    fineAmount,
    paidAmount,
  };
}

function formatAssetReturnTransactionRecord(returnPlain, returnedItems, settlementAmounts = null) {
  return {
    assetReturnTransactionId: returnPlain.assetReturnTransactionId,
    returnDate: returnPlain.returnDate,
    securityAmount: settlementAmounts?.securityAmount ?? 0,
    fineAmount: settlementAmounts?.fineAmount ?? 0,
    paidAmount: settlementAmounts?.paidAmount ?? 0,
    itemLength: returnedItems.length,
    item: returnedItems,
  };
}

function formatSettlementPaymentBasic(paymentRow, paymentItemRow, settlementMeta) {
  const formatted = formatSecurityPaymentBasic({
    ...toPlain(paymentItemRow),
    payment: toPlain(paymentRow),
  });
  if (!formatted) {
    return null;
  }

  return {
    ...formatted,
    settlement: settlementMeta,
  };
}

async function settleSecurityDepositOnReturn(
  {
    assetReturnTransactionId,
    securityAmount,
    fineAmount,
    paymentMethod,
    issueLines,
    instituteId,
    createdBy,
  },
  transaction
) {
  const payloadSecurity = toMoneyNumber(securityAmount);
  const payloadFine = toMoneyNumber(fineAmount);

  const issueTransactionIds = [
    ...new Set(issueLines.map((row) => toPlain(row).transaction.assetIssueTransactionId)),
  ];

  const depositByIssueId = await repo.findSecurityAmountByIssueIds(
    issueTransactionIds,
    instituteId,
    { transaction }
  );

  const missingDepositIssueIds = issueTransactionIds.filter(
    (issueTransactionId) => depositByIssueId[issueTransactionId] === undefined
  );
  if (missingDepositIssueIds.length) {
    throw httpError("Security deposit not found for this asset issue", 404);
  }

  const savedSecurity = decimalSum(
    issueTransactionIds.map((issueTransactionId) => depositByIssueId[issueTransactionId])
  );

  if (decimalCompare(payloadSecurity, savedSecurity) !== 0) {
    throw httpError(
      `securityAmount does not match recorded security deposit. Expected ${savedSecurity}, received ${payloadSecurity}`,
      400
    );
  }

  const memberKeys = new Set(
    issueLines.map(
      (row) => `${toPlain(row).transaction.memberType}:${toPlain(row).transaction.memberId}`
    )
  );
  if (memberKeys.size !== 1) {
    throw httpError(
      "Returned items must belong to the same member for security settlement",
      400
    );
  }

  const firstTxn = toPlain(issueLines[0]).transaction;
  const settlementMeta = {
    securityAmount: savedSecurity,
    fineAmount: payloadFine,
    settlementAmount: 0,
    paymentType: null,
  };

  const fineCompare = decimalCompare(payloadFine, savedSecurity);
  if (fineCompare === 0) {
    return { settlementPayment: null, settlement: settlementMeta };
  }

  const isAdditionalCollection = fineCompare > 0;
  const settlementAmount = isAdditionalCollection
    ? decimalSubtract(payloadFine, savedSecurity)
    : decimalSubtract(savedSecurity, payloadFine);

  if (decimalCompare(settlementAmount, 0) <= 0) {
    return { settlementPayment: null, settlement: settlementMeta };
  }

  const payeeType = firstTxn.memberType === "STUDENT" ? "STUDENT" : "OTHER";
  const paymentType = isAdditionalCollection ? "INCOMING" : "OUTGOING";
  const remark = isAdditionalCollection
    ? `Asset return fine (return #${assetReturnTransactionId})`
    : `Asset return security refund (return #${assetReturnTransactionId})`;

  const payment = await paymentRepo.createStudentFeePayment(
    {
      paymentType,
      payeeId: firstTxn.memberId,
      payeeType,
      amount: settlementAmount,
      paymentMethod: paymentMethod ?? "cash",
      referenceNumber: uuidv4(),
      transactionId: uuidv4(),
      receivedBy: null,
      remark,
      instituteId,
      createdBy,
    },
    { transaction }
  );

  const paymentItem = await paymentRepo.createPaymentItem(
    {
      paymentId: payment.studentFeePaymentId,
      referenceId: assetReturnTransactionId,
      referenceType: "OTHER",
      amount: settlementAmount,
    },
    { transaction }
  );

  settlementMeta.settlementAmount = settlementAmount;
  settlementMeta.paymentType = paymentType;

  return {
    settlementPayment: formatSettlementPaymentBasic(payment, paymentItem, settlementMeta),
    settlement: settlementMeta,
  };
}

async function processAssetReturnItems(returnDate, items, instituteId, transaction, options = {}) {
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
  const affected = await repo.returnIssueInventoryItems(
    items,
    returnTxn.assetReturnTransactionId,
    { transaction }
  );
  if (affected !== uniqueItemIds.length) {
    throw httpError("Failed to record return for one or more items", 500);
  }

  const assetIds = [...new Set(issueLines.map((row) => toPlain(row).inventoryItem.assetId))];
  await syncAssetStatusesFromInventory(assetIds, instituteId, { transaction });

  const updatedItems = await repo.findIssueInventoryItemsByIds(uniqueItemIds, { transaction });

  let settlementPayment = null;
  let settlement = null;

  if (options.securityAmount !== undefined) {
    const settlementResult = await settleSecurityDepositOnReturn(
      {
        assetReturnTransactionId: returnTxn.assetReturnTransactionId,
        securityAmount: options.securityAmount,
        fineAmount: options.fineAmount,
        paymentMethod: options.paymentMethod,
        issueLines,
        instituteId,
        createdBy: options.createdBy,
      },
      transaction
    );
    settlementPayment = settlementResult.settlementPayment;
    settlement = settlementResult.settlement;
  }

  return {
    returnTransaction: toPlain(returnTxn),
    items: updatedItems.map(toPlain),
    settlementPayment,
    settlement,
  };
}

export async function returnAssetIssueItems(body, instituteId, createdBy) {
  return await sequelize.transaction(async (transaction) => {
    return await processAssetReturnItems(body.returnDate, body.items, instituteId, transaction, {
      securityAmount: body.securityAmount,
      fineAmount: body.fineAmount,
      paymentMethod: body.paymentMethod,
      createdBy,
    });
  });
}

export async function listAssetReturnTransactions(instituteId, query) {
  const {
    rows,
    total,
    page,
    limit,
    issueItemRows,
    settlementByReturnId,
    securityAmountByIssueId,
    issueTransactionIdsByReturnId,
  } = await repo.findAssetReturnTransactionsListBundle(instituteId, {
    page: query.page,
    limit: query.limit,
  });

  const returnRows = rows.map(toPlain);
  const itemsByReturnId = new Map();

  for (const row of issueItemRows) {
    const item = toPlain(row);
    const returnId = item.assetReturnTransactionId;

    if (!itemsByReturnId.has(returnId)) {
      itemsByReturnId.set(returnId, []);
    }

    itemsByReturnId.get(returnId).push(formatReturnListItem(item));
  }

  const assetReturnTransactions = returnRows.map((returnRow) => {
    const returnId = returnRow.assetReturnTransactionId;
    const settlementAmounts = computeReturnSettlementAmounts(
      returnId,
      issueTransactionIdsByReturnId.get(returnId) ?? [],
      securityAmountByIssueId,
      settlementByReturnId
    );

    return formatAssetReturnTransactionRecord(
      returnRow,
      itemsByReturnId.get(returnId) ?? [],
      settlementAmounts
    );
  });

  return {
    data: { assetReturnTransactions },
    pagination: { page, limit, total },
  };
}

export async function getAssetReturnPaymentsById(assetReturnTransactionId, instituteId) {
  const [returnRow, settlementPaymentRows, issueItemRows] = await Promise.all([
    repo.findAssetReturnTransactionByIdForInstitute(assetReturnTransactionId, instituteId),
    repo.findReturnSettlementPaymentsByReturnIds([assetReturnTransactionId], instituteId),
    repo.findReturnedIssueItemsByReturnTransactionIds([assetReturnTransactionId], instituteId, {
      includeMember: true,
    }),
  ]);

  if (!returnRow) {
    throw httpError("Asset return transaction not found", 404);
  }

  const returnPlain = toPlain(returnRow);
  const returnId = returnPlain.assetReturnTransactionId;
  const firstTxn = toPlain(issueItemRows[0])?.transaction ?? null;
  const memberBasicDetails = extractMemberBasicDetailsFromTransaction(firstTxn);

  const payments = settlementPaymentRows
    .map((row) =>
      formatAssetReturnPaymentRecord(
        row,
        {
          paymentPurpose: "RETURN_SETTLEMENT",
          assetReturnTransactionId: returnId,
        },
        resolvePayeeDetailsFromPayment(toPlain(row).payment)
      )
    )
    .filter(Boolean);

  return {
    assetReturnTransactionId: returnId,
    returnDate: returnPlain.returnDate,
    memberId: firstTxn?.memberId ?? null,
    memberType: firstTxn?.memberType ?? null,
    memberBasicDetails,
    payments,
  };
}
