import { Op } from "sequelize";
import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";
import { toMoneyNumber } from "../utility/decimalMoney.js";

const classRoomHierarchyInclude = {
  model: model.classRoomModel,
  as: "classRoom",
  attributes: ["classRoomSectionId", "roomNumber", "floorId"],
  required: false,
  include: [
    {
      model: model.floorModel,
      as: "roomFloor",
      attributes: ["floorId", "name", "buildingId"],
      include: [
        {
          model: model.buildingModel,
          as: "floorBuilding",
          attributes: ["buildingId", "name", "buildingType", "campusId"],
        },
      ],
    },
  ],
};

const issueInventoryItemIncludes = [
  {
    model: model.assetInventoryItemModel,
    as: "inventoryItem",
    attributes: ["assetInventoryItemId", "code", "barcode", "assetId", "classRoomSectionId", "status"],
    include: [
      {
        model: model.assetModel,
        as: "asset",
        attributes: ["assetId", "name", "code", "status", "condition"],
      },
      classRoomHierarchyInclude,
    ],
  },
  {
    model: model.assetReturnTransactionModel,
    as: "returnTransaction",
    attributes: ["assetReturnTransactionId", "returnDate"],
    required: false,
  },
];

const issueIncludes = [
  {
    model: model.assetIssueInventoryItemModel,
    as: "items",
    attributes: {
      exclude: ["createdAt", "updatedAt"],
    },
    include: issueInventoryItemIncludes,
  },
];

const studentMemberInclude = {
  model: model.studentModel,
  as: "studentMember",
  attributes: ["studentId", "firstName", "middleName", "lastName", "scholarNumber", "courseId"],
  required: false,
  include: [
    {
      model: model.courseModel,
      as: "course",
      attributes: ["courseId", "courseName"],
    },
  ],
};

const teacherMemberInclude = {
  model: model.employeeModel,
  as: "teacherMember",
  attributes: ["employeeId", "employeeName", "employeeCode", "department"],
  required: false,
};

const memberIncludes = [studentMemberInclude, teacherMemberInclude];

const paymentPayeeIncludes = [
  {
    model: model.studentModel,
    as: "studentPayee",
    attributes: ["studentId", "firstName", "middleName", "lastName", "scholarNumber", "courseId"],
    required: false,
    include: [
      {
        model: model.courseModel,
        as: "course",
        attributes: ["courseId", "courseName"],
      },
    ],
  },
  {
    model: model.employeeModel,
    as: "employeePayee",
    attributes: ["employeeId", "employeeName", "employeeCode", "department"],
    required: false,
  },
];

const securityPaymentInclude = {
  model: model.paymentItemModel,
  as: "securityPaymentItems",
  attributes: ["paymentItemId", "paymentId", "referenceId", "referenceType", "amount"],
  required: false,
  separate: true,
  include: [
    {
      model: model.studentFeePaymentModel,
      as: "payment",
      attributes: [
        "studentFeePaymentId",
        "paymentType",
        "payeeId",
        "payeeType",
        "amount",
        "paymentMethod",
        "referenceNumber",
        "transactionId",
        "remark",
      ],
      required: true,
      where: { paymentType: "INCOMING" },
    },
  ],
};

const studentFeePaymentAttributes = [
  "studentFeePaymentId",
  "paymentType",
  "payeeId",
  "payeeType",
  "amount",
  "paymentMethod",
  "referenceNumber",
  "transactionId",
  "remark",
];

function scopedStudentFeePaymentWhere(extra = {}) {
  return {
    ...buildScope(model.studentFeePaymentModel),
    ...extra,
  };
}

function buildIssueDetailIncludes({
  includeItems = true,
  includeMember = false,
  includeSecurityPayment = false,
} = {}) {
  const includes = [];

  if (includeItems) {
    includes.push(...issueIncludes);
  }
  if (includeMember) {
    includes.push(...memberIncludes);
  }
  if (includeSecurityPayment) {
    includes.push({
      ...securityPaymentInclude,
      include: [
        {
          model: model.studentFeePaymentModel,
          as: "payment",
          attributes: studentFeePaymentAttributes,
          required: true,
          where: scopedStudentFeePaymentWhere({ paymentType: "INCOMING" }),
        },
      ],
    });
  }

  return includes;
}

export async function createAssetIssue(payload, options = {}) {
  return scoped(model.assetIssueTransactionModel).create(payload, { transaction: options.transaction });
}

export async function createAssetIssueInventoryItems(payload, options = {}) {
  return model.assetIssueInventoryItemModel.bulkCreate(payload, { transaction: options.transaction });
}

export async function updateAssetIssue(assetIssueTransactionId, payload, options = {}) {
  const [affected] = await scoped(model.assetIssueTransactionModel).update(payload, {
    where: { assetIssueTransactionId },
    transaction: options.transaction,
  });
  return affected;
}

export async function findAssetIssueById(assetIssueTransactionId, options = {}) {
  const {
    transaction,
    includeItems = true,
    includeMember = false,
    includeSecurityPayment = false,
  } = options;

  return scoped(model.assetIssueTransactionModel).findOne({
    attributes: {
      exclude: ["createdAt", "updatedAt"],
    },
    where: { assetIssueTransactionId },
    include: buildIssueDetailIncludes({
      includeItems,
      includeMember,
      includeSecurityPayment,
    }),
    transaction,
  });
}

export async function findOpenIssueLinesByInventoryIds(inventoryItemIds, options = {}) {
  if (!inventoryItemIds.length) return [];
  return scoped(model.assetIssueInventoryItemModel).findAll({
    attributes: ["assetIssueInventoryItemId", "assetInventoryItemId"],
    where: {
      assetInventoryItemId: inventoryItemIds,
      assetReturnTransactionId: null,
    },
    transaction: options.transaction,
  });
}

export async function findReturnTransactionIdsByIssueTransactionId(
  assetIssueTransactionId,
  options = {}
) {
  const issueScope = buildScope(model.assetIssueTransactionModel);

  const rows = await scoped(model.assetIssueInventoryItemModel).findAll({
    attributes: ["assetReturnTransactionId"],
    where: {
      assetIssueTransactionId,
      assetReturnTransactionId: { [Op.ne]: null },
    },
    include: [
      {
        model: model.assetIssueTransactionModel,
        as: "transaction",
        attributes: [],
        where: issueScope,
        required: true,
      },
    ],
    transaction: options.transaction,
  });

  return [
    ...new Set(
      rows
        .map((row) => row.assetReturnTransactionId)
        .filter((returnId) => returnId != null)
    ),
  ];
}

export async function findAssetSecurityPaymentsByIssueIds(assetIssueTransactionIds, options = {}) {
  if (!assetIssueTransactionIds.length) return [];
  return scoped(model.paymentItemModel).findAll({
    attributes: ["paymentItemId", "paymentId", "referenceId", "referenceType", "amount"],
    where: {
      referenceId: assetIssueTransactionIds,
      referenceType: "ASSET_SECURITY",
    },
    include: [
      {
        model: model.studentFeePaymentModel,
        as: "payment",
        attributes: studentFeePaymentAttributes,
        required: true,
        where: scopedStudentFeePaymentWhere({ paymentType: "INCOMING" }),
        include: paymentPayeeIncludes,
      },
    ],
    transaction: options.transaction,
  });
}

export async function findAssetIssuePaymentsWithPayeesByIssueId(
  assetIssueTransactionId,
  options = {}
) {
  const returnIds = await findReturnTransactionIdsByIssueTransactionId(
    assetIssueTransactionId,
    options
  );

  const referenceFilters = [
    {
      referenceId: assetIssueTransactionId,
      referenceType: "ASSET_SECURITY",
    },
  ];

  if (returnIds.length) {
    referenceFilters.push({
      referenceId: returnIds,
      referenceType: "OTHER",
    });
  }

  return scoped(model.paymentItemModel).findAll({
    attributes: ["paymentItemId", "paymentId", "referenceId", "referenceType", "amount"],
    where: {
      [Op.or]: referenceFilters,
    },
    include: [
      {
        model: model.studentFeePaymentModel,
        as: "payment",
        attributes: studentFeePaymentAttributes,
        required: true,
        where: scopedStudentFeePaymentWhere({
          [Op.or]: [
            { paymentType: "INCOMING" },
            { remark: { [Op.like]: "Asset return%" } },
          ],
        }),
        include: paymentPayeeIncludes,
      },
    ],
    order: [
      [
        model.paymentItemModel.sequelize.literal(
          "CASE WHEN reference_type = 'ASSET_SECURITY' THEN 0 ELSE 1 END"
        ),
        "ASC",
      ],
      ["paymentItemId", "ASC"],
    ],
    transaction: options.transaction,
  });
}

export async function findAssetSecurityPaymentByIssueId(assetIssueTransactionId, options = {}) {
  const rows = await findAssetSecurityPaymentsByIssueIds([assetIssueTransactionId], options);
  return rows[0] ?? null;
}

export async function updateAssetIssueInventoryItemById(
  assetIssueInventoryItemId,
  assetIssueTransactionId,
  payload,
  options = {}
) {
  const [affected] = await model.assetIssueInventoryItemModel.update(payload, {
    where: { assetIssueInventoryItemId, assetIssueTransactionId },
    transaction: options.transaction,
  });
  return affected;
}

function buildAssetIssueWhere(filters = {}) {
  const search = filters.search?.trim();
  if (!search) {
    return {};
  }

  const pattern = { [Op.like]: `%${search}%` };
  const orParts = [
    { memberType: pattern },
    { "$items.inventoryItem.code$": pattern },
    { "$items.inventoryItem.barcode$": pattern },
    { "$items.inventoryItem.asset.name$": pattern },
    { "$items.inventoryItem.asset.code$": pattern },
  ];

  const numericSearch = Number(search);
  if (search !== "" && !Number.isNaN(numericSearch)) {
    orParts.push({ assetIssueTransactionId: numericSearch }, { memberId: numericSearch });
  }

  return {
    [Op.or]: orParts,
  };
}

function toPlainRow(row) {
  if (!row) return null;
  return typeof row.get === "function" ? row.get({ plain: true }) : row;
}

function extractPaymentAmountFromRow(paymentItemRow) {
  const plain = toPlainRow(paymentItemRow);
  if (!plain) {
    return 0;
  }

  return toMoneyNumber(plain.payment?.amount ?? plain.amount);
}

export async function findAssetIssuesPaginated(filters = {}, pagination = {}, options = {}) {
  const page = Number(pagination.page) || 1;
  const limit = Number(pagination.limit) || 20;
  const offset = (page - 1) * limit;
  const where = buildAssetIssueWhere(filters);

  const { count, rows } = await scoped(model.assetIssueTransactionModel).findAndCountAll({
    attributes: {
      exclude: ["createdAt", "updatedAt"],
    },
    where,
    include: [...issueIncludes, ...memberIncludes],
    order: [["assetIssueTransactionId", "DESC"]],
    limit,
    offset,
    subQuery: false,
    distinct: true,
    col: "asset_issue_transaction_id",
    transaction: options.transaction,
  });

  const issueIds = [];
  for (const row of rows) {
    issueIds.push(row.assetIssueTransactionId);
  }

  if (!issueIds.length) {
    return {
      rows,
      total: count,
      page,
      limit,
      itemStatsByIssueId: {},
      securityAmountByIssueId: {},
    };
  }

  const [itemStatsByIssueId, securityAmountByIssueId] = await Promise.all([
    countIssueItemStatsByTransactionIds(issueIds, options),
    findSecurityAmountByIssueIds(issueIds, options),
  ]);

  return { rows, total: count, page, limit, itemStatsByIssueId, securityAmountByIssueId };
}

/** Per issue transaction: total lines issued and lines with a return recorded. */
export async function countIssueItemStatsByTransactionIds(assetIssueTransactionIds, options = {}) {
  if (!assetIssueTransactionIds.length) {
    return {};
  }

  const { transaction } = options;
  const db = model.assetIssueInventoryItemModel.sequelize;
  const issueScope = buildScope(model.assetIssueTransactionModel);

  const rows = await scoped(model.assetIssueInventoryItemModel).findAll({
    attributes: [
      "assetIssueTransactionId",
      [db.fn("COUNT", db.col("asset_issue_inventory_item_id")), "issuedTotalItems"],
      [
        db.fn(
          "SUM",
          db.literal(
            "CASE WHEN asset_issue_inventory_item.asset_return_transaction_id IS NOT NULL THEN 1 ELSE 0 END"
          )
        ),
        "returnedTotalItems",
      ],
    ],
    where: { assetIssueTransactionId: assetIssueTransactionIds },
    include: [
      {
        model: model.assetIssueTransactionModel,
        as: "transaction",
        attributes: [],
        where: issueScope,
        required: true,
      },
    ],
    group: ["assetIssueTransactionId"],
    raw: true,
    subQuery: false,
    transaction,
  });

  const statsByTransactionId = Object.create(null);

  for (const row of rows) {
    const assetIssueTransactionId = Number(row.assetIssueTransactionId);
    statsByTransactionId[assetIssueTransactionId] = {
      issuedTotalItems: Number(row.issuedTotalItems),
      returnedTotalItems: Number(row.returnedTotalItems) || 0,
    };
  }

  return statsByTransactionId;
}

export async function findStudentById(studentId, options = {}) {
  return scoped(model.studentModel).findOne({
    attributes: ["studentId"],
    where: { studentId },
    transaction: options.transaction,
  });
}

export async function findStudentMemberDetailsById(studentId, options = {}) {
  return scoped(model.studentModel).findOne({
    attributes: ["studentId", "firstName", "middleName", "lastName", "scholarNumber", "courseId"],
    where: { studentId },
    include: [
      {
        model: model.courseModel,
        as: "course",
        attributes: ["courseId", "courseName"],
      },
    ],
    transaction: options.transaction,
  });
}

export async function findTeacherById(employeeId, options = {}) {
  return scoped(model.employeeModel).findOne({
    attributes: ["employeeId"],
    where: { employeeId },
    transaction: options.transaction,
  });
}

export async function findEmployeeMemberDetailsById(employeeId, options = {}) {
  return scoped(model.employeeModel).findOne({
    attributes: ["employeeId", "employeeName", "employeeCode", "department"],
    where: { employeeId },
    transaction: options.transaction,
  });
}

export async function findStudentMemberDetailsByIds(studentIds, options = {}) {
  if (!studentIds.length) return [];
  return scoped(model.studentModel).findAll({
    attributes: ["studentId", "firstName", "middleName", "lastName", "scholarNumber", "courseId"],
    where: { studentId: studentIds },
    include: [
      {
        model: model.courseModel,
        as: "course",
        attributes: ["courseId", "courseName"],
      },
    ],
    transaction: options.transaction,
  });
}

export async function findEmployeeMemberDetailsByIds(employeeIds, options = {}) {
  if (!employeeIds.length) return [];
  return scoped(model.employeeModel).findAll({
    attributes: ["employeeId", "employeeName", "employeeCode", "department"],
    where: { employeeId: employeeIds },
    transaction: options.transaction,
  });
}

export function extractInventoryItemIds(items) {
  const inventoryItemIds = [];

  for (const item of items) {
    inventoryItemIds.push(item.assetInventoryItemId);
  }

  return inventoryItemIds;
}

export function buildAssetIssueInventoryItemRows(assetIssueTransactionId, items) {
  const rows = [];

  for (const item of items) {
    rows.push({
      assetIssueTransactionId,
      assetInventoryItemId: item.assetInventoryItemId,
      assetReturnTransactionId: null,
    });
  }

  return rows;
}

async function findFirstMissingInventoryItemId(inventoryItemIds, options = {}) {
  const rows = await scoped(model.assetInventoryItemModel).findAll({
    attributes: ["assetInventoryItemId"],
    where: { assetInventoryItemId: inventoryItemIds },
    transaction: options.transaction,
  });

  const foundIds = new Set();
  for (const row of rows) {
    foundIds.add(row.assetInventoryItemId);
  }

  for (const inventoryItemId of inventoryItemIds) {
    if (!foundIds.has(inventoryItemId)) {
      return inventoryItemId;
    }
  }

  return null;
}

export async function findIssueInventoryItemValidationError(inventoryItemIds, options = {}) {
  if (!inventoryItemIds.length) {
    return { code: "EMPTY" };
  }

  const { transaction } = options;

  const [foundCount, notAssignedItem, openIssueItem] = await Promise.all([
    scoped(model.assetInventoryItemModel).count({
      where: { assetInventoryItemId: inventoryItemIds },
      transaction,
    }),
    scoped(model.assetInventoryItemModel).findOne({
      attributes: ["assetInventoryItemId"],
      where: {
        assetInventoryItemId: inventoryItemIds,
        status: "NOT_ASSIGNED",
      },
      transaction,
    }),
    scoped(model.assetIssueInventoryItemModel).findOne({
      attributes: ["assetInventoryItemId"],
      where: {
        assetInventoryItemId: inventoryItemIds,
        assetReturnTransactionId: null,
      },
      transaction,
    }),
  ]);

  if (foundCount !== inventoryItemIds.length) {
    const missingInventoryItemId = await findFirstMissingInventoryItemId(inventoryItemIds, options);
    return { code: "MISSING", assetInventoryItemId: missingInventoryItemId };
  }

  if (notAssignedItem) {
    return { code: "NOT_ASSIGNED", assetInventoryItemId: notAssignedItem.assetInventoryItemId };
  }

  if (openIssueItem) {
    return { code: "OPEN_ISSUE", assetInventoryItemId: openIssueItem.assetInventoryItemId };
  }

  return null;
}

export async function findSecurityAmountByIssueIds(assetIssueTransactionIds, options = {}) {
  if (!assetIssueTransactionIds.length) {
    return {};
  }

  const rows = await scoped(model.paymentItemModel).findAll({
    attributes: ["referenceId", "amount"],
    where: {
      referenceId: assetIssueTransactionIds,
      referenceType: "ASSET_SECURITY",
    },
    include: [
      {
        model: model.studentFeePaymentModel,
        as: "payment",
        attributes: ["amount"],
        required: true,
        where: scopedStudentFeePaymentWhere({ paymentType: "INCOMING" }),
      },
    ],
    transaction: options.transaction,
  });

  const securityAmountByIssueId = Object.create(null);

  for (const row of rows) {
    securityAmountByIssueId[row.referenceId] = extractPaymentAmountFromRow(row);
  }

  return securityAmountByIssueId;
}

export async function findDistinctAssetIdsByInventoryItemIds(inventoryItemIds, options = {}) {
  if (!inventoryItemIds.length) {
    return [];
  }

  const rows = await scoped(model.assetInventoryItemModel).findAll({
    attributes: ["assetId"],
    where: { assetInventoryItemId: inventoryItemIds },
    group: ["assetId"],
    transaction: options.transaction,
  });

  const assetIds = [];
  for (const row of rows) {
    assetIds.push(row.assetId);
  }

  return assetIds;
}

export async function findInstituteInventoryItemsByIds(inventoryItemIds, options = {}) {
  return scoped(model.assetInventoryItemModel).findAll({
    attributes: ["assetInventoryItemId", "assetId"],
    where: { assetInventoryItemId: inventoryItemIds },
    transaction: options.transaction,
  });
}

export async function findInstituteAssetsByIds(assetIds, options = {}) {
  return scoped(model.assetModel).findAll({
    attributes: ["assetId"],
    where: { assetId: assetIds },
    transaction: options.transaction,
  });
}

export async function updateAssetStatusByIds(assetIds, status, options = {}) {
  const [affected] = await scoped(model.assetModel).update(
    { status },
    {
      where: { assetId: assetIds },
      transaction: options.transaction,
    }
  );
  return affected;
}
