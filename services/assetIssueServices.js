import { v4 as uuidv4 } from "uuid";
import sequelize from "../database/sequelizeConfig.js";
import * as repo from "../repository/assetIssueRepository.js";
import * as paymentRepo from "../repository/studentFeePaymentRepository.js";
import { decimalCompare, toMoneyNumber } from "../utility/decimalMoney.js";
import { syncAssetStatusFromInventory } from "./assetServices.js";

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
    ...formatInventoryLocationFields(inventory),
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

function formatAssetIssueRecord(
  issuePlain,
  memberBasicDetails,
  securityPaymentRow = null,
  itemStats = null
) {
  const record = {
    assetIssueTransactionId: issuePlain.assetIssueTransactionId,
    instituteId: issuePlain.instituteId,
    memberId: issuePlain.memberId,
    memberType: issuePlain.memberType,
    issueDate: issuePlain.issueDate,
    dueDate: issuePlain.dueDate,
    memberBasicDetails,
    issuedTotalItems: itemStats?.issuedTotalItems ?? 0,
    returnedTotalItems: itemStats?.returnedTotalItems ?? 0,
    items: (issuePlain.items ?? []).map(formatIssueItemBasic),
  };

  if (securityPaymentRow !== null) {
    record.securityPayment = formatSecurityPaymentBasic(securityPaymentRow);
  }

  return record;
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

    if (body.securityAmount !== undefined) {
      await createSecurityPaymentForAssetIssue(
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
    const issuePlain = toPlain(issueRow);
    const memberBasicDetails = await getMemberDetails(
      issuePlain.memberType,
      issuePlain.memberId,
      instituteId,
      transaction
    );
    const [securityPaymentRow, itemStatsByTransactionId] = await Promise.all([
      repo.findAssetSecurityPaymentByIssueId(issue.assetIssueTransactionId, instituteId, {
        transaction,
      }),
      repo.countIssueItemStatsByTransactionIds([issue.assetIssueTransactionId], instituteId, {
        transaction,
      }),
    ]);

    return formatAssetIssueRecord(
      issuePlain,
      memberBasicDetails,
      securityPaymentRow,
      itemStatsByTransactionId[issue.assetIssueTransactionId]
    );
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
  const transactionIds = assetIssues.map((issue) => issue.assetIssueTransactionId);
  const studentIds = [];
  const employeeIds = [];

  for (const issue of assetIssues) {
    if (issue.memberType === "STUDENT") {
      studentIds.push(issue.memberId);
    } else if (issue.memberType === "TEACHER") {
      employeeIds.push(issue.memberId);
    }
  }

  const [studentRows, employeeRows, itemStatsByTransactionId] = await Promise.all([
    repo.findStudentMemberDetailsByIds([...new Set(studentIds)], instituteId),
    repo.findEmployeeMemberDetailsByIds([...new Set(employeeIds)], instituteId),
    repo.countIssueItemStatsByTransactionIds(transactionIds, instituteId),
  ]);

  const studentMap = new Map(studentRows.map((row) => [toPlain(row).studentId, row]));
  const employeeMap = new Map(employeeRows.map((row) => [toPlain(row).employeeId, row]));

  const enrichedAssetIssues = assetIssues.map((issue) => {
    const memberBasicDetails =
      issue.memberType === "STUDENT"
        ? buildMemberDetailsFromStudent(issue.memberId, studentMap.get(issue.memberId))
        : buildMemberDetailsFromEmployee(issue.memberId, employeeMap.get(issue.memberId));

    return formatAssetIssueRecord(
      issue,
      memberBasicDetails,
      null,
      itemStatsByTransactionId[issue.assetIssueTransactionId]
    );
  });

  return {
    data: { assetIssues: enrichedAssetIssues },
    pagination: { page, limit, total },
  };
}

export async function getAssetIssuePaymentsById(assetIssueTransactionId, instituteId) {
  const issue = await repo.findAssetIssueById(assetIssueTransactionId, instituteId);
  if (!issue) {
    throw httpError("Asset issue not found", 404);
  }

  const issuePlain = toPlain(issue);
  const returnIds = await repo.findReturnTransactionIdsByIssueTransactionId(
    assetIssueTransactionId,
    instituteId
  );

  const [securityPaymentRows, settlementPaymentRows, memberBasicDetails] = await Promise.all([
    repo.findAssetSecurityPaymentsByIssueIds([assetIssueTransactionId], instituteId),
    repo.findReturnSettlementPaymentsByReturnIds(returnIds, instituteId),
    getMemberDetails(issuePlain.memberType, issuePlain.memberId, instituteId),
  ]);

  const allPaymentRows = [...securityPaymentRows, ...settlementPaymentRows];
  const { studentMap, employeeMap } = await loadPayeeLookupMaps(allPaymentRows, instituteId);

  const payments = [];

  const securityRow = securityPaymentRows[0];
  if (securityRow) {
    const payment = toPlain(securityRow).payment;
    const record = formatAssetIssuePaymentRecord(
      securityRow,
      {
        paymentPurpose: "ASSET_SECURITY",
        assetIssueTransactionId,
      },
      payment
        ? resolvePayeeDetails(payment.payeeType, payment.payeeId, studentMap, employeeMap)
        : null
    );
    if (record) {
      payments.push(record);
    }
  }

  for (const settlementRow of settlementPaymentRows) {
    const settlementPlain = toPlain(settlementRow);
    const returnId = settlementPlain.referenceId;
    const payment = settlementPlain.payment;
    const record = formatAssetIssuePaymentRecord(
      settlementRow,
      {
        paymentPurpose: "RETURN_SETTLEMENT",
        assetIssueTransactionId,
        assetReturnTransactionId: returnId,
      },
      payment
        ? resolvePayeeDetails(payment.payeeType, payment.payeeId, studentMap, employeeMap)
        : null
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
    const [securityPaymentRow, itemStatsByTransactionId] = await Promise.all([
      repo.findAssetSecurityPaymentByIssueId(assetIssueTransactionId, instituteId, { transaction }),
      repo.countIssueItemStatsByTransactionIds([assetIssueTransactionId], instituteId, {
        transaction,
      }),
    ]);

    return formatAssetIssueRecord(
      issuePlain,
      memberBasicDetails,
      securityPaymentRow,
      itemStatsByTransactionId[assetIssueTransactionId]
    );
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
    const [securityPaymentRow, itemStatsByTransactionId] = await Promise.all([
      repo.findAssetSecurityPaymentByIssueId(assetIssueTransactionId, instituteId, { transaction }),
      repo.countIssueItemStatsByTransactionIds([assetIssueTransactionId], instituteId, {
        transaction,
      }),
    ]);

    return formatAssetIssueRecord(
      updatedPlain,
      memberBasicDetails,
      securityPaymentRow,
      itemStatsByTransactionId[assetIssueTransactionId]
    );
  });

  return data;
}
