import { Op } from "sequelize";
import * as model from "../models/index.js";
import { findSecurityAmountByIssueIds } from "./assetIssueRepository.js";

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

const returnedIssueInventoryItemIncludes = [
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

function toPlainRow(row) {
  if (!row) return null;
  return typeof row.get === "function" ? row.get({ plain: true }) : row;
}

function buildReturnedIssueItemDetailIncludes(instituteId, includeMember = false) {
  const transactionInclude = {
    model: model.assetIssueTransactionModel,
    as: "transaction",
    attributes: [
      "assetIssueTransactionId",
      "memberId",
      "memberType",
      "issueDate",
      "dueDate",
      "instituteId",
    ],
    required: true,
    where: { instituteId },
  };

  if (includeMember) {
    transactionInclude.include = memberIncludes;
  }

  return [
    {
      model: model.assetInventoryItemModel,
      as: "inventoryItem",
      attributes: ["assetInventoryItemId", "code", "barcode", "assetId", "classRoomSectionId", "status"],
      required: true,
      include: [
        {
          model: model.assetModel,
          as: "asset",
          attributes: [
            "assetId",
            "name",
            "code",
            "status",
            "condition",
            "description",
            "assetCategoryId",
          ],
          required: true,
          include: [
            {
              model: model.assetCategoryModel,
              as: "assetCategory",
              attributes: ["assetCategoryId", "name"],
              required: false,
            },
          ],
        },
        classRoomHierarchyInclude,
      ],
    },
    transactionInclude,
  ];
}

function buildSettlementPaymentByReturnId(settlementPaymentRows) {
  const settlementByReturnId = new Map();

  for (const row of settlementPaymentRows) {
    const plain = toPlainRow(row);
    settlementByReturnId.set(plain.referenceId, row);
  }

  return settlementByReturnId;
}

function buildIssueTransactionIdsByReturnId(issueItemRows) {
  const issueTransactionIdsByReturnId = new Map();

  for (const row of issueItemRows) {
    const item = toPlainRow(row);
    const returnId = item.assetReturnTransactionId;
    const issueTransactionId = item.transaction?.assetIssueTransactionId;

    if (issueTransactionId == null) {
      continue;
    }

    if (!issueTransactionIdsByReturnId.has(returnId)) {
      issueTransactionIdsByReturnId.set(returnId, []);
    }

    issueTransactionIdsByReturnId.get(returnId).push(issueTransactionId);
  }

  return issueTransactionIdsByReturnId;
}

export async function findIssueInventoryItemsForReturn(
  assetIssueInventoryItemIds,
  instituteId,
  options = {}
) {
  if (!assetIssueInventoryItemIds.length) return [];
  return model.assetIssueInventoryItemModel.findAll({
    attributes: [
      "assetIssueInventoryItemId",
      "assetInventoryItemId",
      "assetReturnTransactionId",
    ],
    where: {
      assetIssueInventoryItemId: assetIssueInventoryItemIds,
      assetReturnTransactionId: null,
    },
    include: [
      {
        model: model.assetIssueTransactionModel,
        as: "transaction",
        attributes: [
          "assetIssueTransactionId",
          "issueDate",
          "instituteId",
          "memberId",
          "memberType",
        ],
        where: { instituteId },
        required: true,
      },
      {
        model: model.assetInventoryItemModel,
        as: "inventoryItem",
        attributes: ["assetId"],
        required: true,
      },
    ],
    transaction: options.transaction,
  });
}

export async function createAssetReturnTransaction(returnDate, options = {}) {
  return model.assetReturnTransactionModel.create(
    { returnDate },
    { transaction: options.transaction }
  );
}

export async function returnIssueInventoryItems(items, assetReturnTransactionId, options = {}) {
  let affected = 0;

  for (const item of items) {
    const [count] = await model.assetIssueInventoryItemModel.update(
      {
        assetReturnTransactionId,
        returnCondition: item.returnCondition,
        damageNotes: item.damageNotes ?? null,
      },
      {
        where: {
          assetIssueInventoryItemId: item.assetIssueInventoryItemId,
          assetReturnTransactionId: null,
        },
        transaction: options.transaction,
      }
    );
    affected += count;
  }

  return affected;
}

export async function findReturnSettlementPaymentsByReturnIds(
  assetReturnTransactionIds,
  instituteId,
  options = {}
) {
  if (!assetReturnTransactionIds.length) return [];

  return model.paymentItemModel.findAll({
    attributes: ["paymentItemId", "paymentId", "referenceId", "referenceType", "amount"],
    where: {
      referenceId: assetReturnTransactionIds,
      referenceType: "OTHER",
    },
    include: [
      {
        model: model.studentFeePaymentModel,
        as: "payment",
        attributes: studentFeePaymentAttributes,
        required: true,
        where: {
          instituteId,
          remark: { [Op.like]: "Asset return%" },
        },
        include: paymentPayeeIncludes,
      },
    ],
    transaction: options.transaction,
  });
}

export async function findIssueInventoryItemsByIds(assetIssueInventoryItemIds, options = {}) {
  if (!assetIssueInventoryItemIds.length) return [];
  return model.assetIssueInventoryItemModel.findAll({
    attributes: {
      exclude: ["createdAt", "updatedAt"],
    },
    where: { assetIssueInventoryItemId: assetIssueInventoryItemIds },
    include: returnedIssueInventoryItemIncludes,
    order: [["assetIssueInventoryItemId", "ASC"]],
    transaction: options.transaction,
  });
}

export async function findAssetReturnTransactionByIdForInstitute(
  assetReturnTransactionId,
  instituteId,
  options = {}
) {
  return model.assetReturnTransactionModel.findOne({
    attributes: ["assetReturnTransactionId", "returnDate"],
    where: { assetReturnTransactionId },
    include: [
      {
        model: model.assetIssueInventoryItemModel,
        as: "returnedIssueItems",
        attributes: ["assetIssueInventoryItemId"],
        required: true,
        include: [
          {
            model: model.assetIssueTransactionModel,
            as: "transaction",
            attributes: [],
            where: { instituteId },
            required: true,
          },
        ],
      },
    ],
    transaction: options.transaction,
  });
}

export async function findAssetReturnTransactionsPaginated(
  instituteId,
  pagination = {},
  options = {}
) {
  const page = Number(pagination.page) || 1;
  const limit = Number(pagination.limit) || 20;
  const offset = (page - 1) * limit;

  const { count, rows } = await model.assetReturnTransactionModel.findAndCountAll({
    attributes: ["assetReturnTransactionId", "returnDate"],
    include: [
      {
        model: model.assetIssueInventoryItemModel,
        as: "returnedIssueItems",
        attributes: [],
        required: true,
        include: [
          {
            model: model.assetIssueTransactionModel,
            as: "transaction",
            attributes: [],
            where: { instituteId },
            required: true,
          },
        ],
      },
    ],
    order: [["assetReturnTransactionId", "DESC"]],
    limit,
    offset,
    distinct: true,
    col: "asset_return_transaction_id",
    subQuery: false,
    transaction: options.transaction,
  });

  return { rows, total: count, page, limit };
}

export async function findReturnedIssueItemsByReturnTransactionIds(
  assetReturnTransactionIds,
  instituteId,
  options = {}
) {
  if (!assetReturnTransactionIds.length) return [];

  const { transaction, includeMember = false } = options;

  return model.assetIssueInventoryItemModel.findAll({
    attributes: [
      "assetIssueInventoryItemId",
      "assetInventoryItemId",
      "assetReturnTransactionId",
      "assetIssueTransactionId",
      "damageNotes",
      "returnCondition",
    ],
    where: {
      assetReturnTransactionId: assetReturnTransactionIds,
    },
    include: buildReturnedIssueItemDetailIncludes(instituteId, includeMember),
    order: [
      ["assetReturnTransactionId", "ASC"],
      ["assetIssueInventoryItemId", "ASC"],
    ],
    transaction,
  });
}

export async function findAssetReturnTransactionsListBundle(
  instituteId,
  pagination = {},
  options = {}
) {
  const { rows, total, page, limit } = await findAssetReturnTransactionsPaginated(
    instituteId,
    pagination,
    options
  );
  const returnIds = rows.map((row) => row.assetReturnTransactionId);

  if (!returnIds.length) {
    return {
      rows,
      total,
      page,
      limit,
      issueItemRows: [],
      settlementByReturnId: new Map(),
      securityAmountByIssueId: {},
      issueTransactionIdsByReturnId: new Map(),
    };
  }

  const [issueItemRows, settlementPaymentRows] = await Promise.all([
    findReturnedIssueItemsByReturnTransactionIds(returnIds, instituteId, {
      ...options,
      includeMember: true,
    }),
    findReturnSettlementPaymentsByReturnIds(returnIds, instituteId, options),
  ]);

  const issueTransactionIds = [
    ...new Set(
      issueItemRows
        .map((row) => toPlainRow(row).transaction?.assetIssueTransactionId)
        .filter((issueTransactionId) => issueTransactionId != null)
    ),
  ];

  const securityAmountByIssueId = await findSecurityAmountByIssueIds(
    issueTransactionIds,
    instituteId,
    options
  );

  return {
    rows,
    total,
    page,
    limit,
    issueItemRows,
    settlementByReturnId: buildSettlementPaymentByReturnId(settlementPaymentRows),
    securityAmountByIssueId,
    issueTransactionIdsByReturnId: buildIssueTransactionIdsByReturnId(issueItemRows),
  };
}
