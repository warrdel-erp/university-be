import { Op } from "sequelize";
import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";
import { findSecurityAmountByIssueIds } from "./assetIssueRepository.js";

const classRoomHierarchyInclude = {
  model: model.classRoomModel.unscoped(),
  as: "classRoom",
  attributes: ["classRoomSectionId", "roomNumber", "floorId"],
  required: false,
  include: [
    {
      model: model.floorModel.unscoped(),
      as: "roomFloor",
      attributes: ["floorId", "name", "buildingId"],
      include: [
        {
          model: model.buildingModel.unscoped(),
          as: "floorBuilding",
          attributes: ["buildingId", "name", "buildingType", "campusId"],
        },
      ],
    },
  ],
};

const studentMemberInclude = {
  model: model.studentModel.unscoped(),
  as: "studentMember",
  attributes: ["studentId", "firstName", "middleName", "lastName", "scholarNumber", "courseId"],
  required: false,
  include: [
    {
      model: model.courseModel.unscoped(),
      as: "course",
      attributes: ["courseId", "courseName"],
    },
  ],
};

const teacherMemberInclude = {
  model: model.employeeModel.unscoped(),
  as: "teacherMember",
  attributes: ["employeeId", "employeeName", "employeeCode", "department"],
  required: false,
};

const memberIncludes = [studentMemberInclude, teacherMemberInclude];

const paymentPayeeIncludes = [
  {
    model: model.studentModel.unscoped(),
    as: "studentPayee",
    attributes: ["studentId", "firstName", "middleName", "lastName", "scholarNumber", "courseId"],
    required: false,
    include: [
      {
        model: model.courseModel.unscoped(),
        as: "course",
        attributes: ["courseId", "courseName"],
      },
    ],
  },
  {
    model: model.employeeModel.unscoped(),
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
    model: model.assetInventoryItemModel.unscoped(),
    as: "inventoryItem",
    attributes: ["assetInventoryItemId", "code", "barcode", "assetId", "classRoomSectionId", "status"],
    include: [
      {
        model: model.assetModel.unscoped(),
        as: "asset",
        attributes: ["assetId", "name", "code", "status", "condition"],
      },
      classRoomHierarchyInclude,
    ],
  },
  {
    model: model.assetReturnTransactionModel.unscoped(),
    as: "returnTransaction",
    attributes: ["assetReturnTransactionId", "returnDate"],
    required: false,
  },
];

function scopedStudentFeePaymentWhere(extra = {}) {
  return {
    ...extra,
    ...buildScope(model.studentFeePaymentModel),
  };
}

function toPlainRow(row) {
  if (!row) return null;
  return typeof row.get === "function" ? row.get({ plain: true }) : row;
}

function buildReturnedIssueItemDetailIncludes(includeMember = false) {
  const issueScope = buildScope(model.assetIssueTransactionModel);

  const transactionInclude = {
    model: model.assetIssueTransactionModel.unscoped(),
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
    where: issueScope,
  };

  if (includeMember) {
    transactionInclude.include = memberIncludes;
  }

  return [
    {
      model: model.assetInventoryItemModel.unscoped(),
      as: "inventoryItem",
      attributes: ["assetInventoryItemId", "code", "barcode", "assetId", "classRoomSectionId", "status"],
      required: true,
      include: [
        {
          model: model.assetModel.unscoped(),
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
              model: model.assetCategoryModel.unscoped(),
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
  options = {}
) {
  if (!assetIssueInventoryItemIds.length) return [];
  const issueScope = buildScope(model.assetIssueTransactionModel);

  return scoped(model.assetIssueInventoryItemModel).findAll({
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
        model: model.assetIssueTransactionModel.unscoped(),
        as: "transaction",
        attributes: [
          "assetIssueTransactionId",
          "issueDate",
          "instituteId",
          "memberId",
          "memberType",
        ],
        where: issueScope,
        required: true,
      },
      {
        model: model.assetInventoryItemModel.unscoped(),
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
  const issueScope = buildScope(model.assetIssueTransactionModel);
  let affected = 0;

  for (const item of items) {
    const line = await scoped(model.assetIssueInventoryItemModel).findOne({
      where: {
        assetIssueInventoryItemId: item.assetIssueInventoryItemId,
        assetReturnTransactionId: null,
      },
      include: [
        {
          model: model.assetIssueTransactionModel.unscoped(),
          as: "transaction",
          attributes: ["assetIssueTransactionId"],
          where: issueScope,
          required: true,
        },
      ],
      transaction: options.transaction,
    });

    if (!line) {
      continue;
    }

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
  options = {}
) {
  if (!assetReturnTransactionIds.length) return [];

  return model.paymentItemModel.unscoped().findAll({
    attributes: ["paymentItemId", "paymentId", "referenceId", "referenceType", "amount"],
    where: {
      referenceId: assetReturnTransactionIds,
      referenceType: "OTHER",
    },
    include: [
      {
        model: model.studentFeePaymentModel.unscoped(),
        as: "payment",
        attributes: studentFeePaymentAttributes,
        required: true,
        where: scopedStudentFeePaymentWhere({
          remark: { [Op.like]: "Asset return%" },
        }),
        include: paymentPayeeIncludes,
      },
    ],
    transaction: options.transaction,
  });
}

export async function findIssueInventoryItemsByIds(assetIssueInventoryItemIds, options = {}) {
  if (!assetIssueInventoryItemIds.length) return [];
  const issueScope = buildScope(model.assetIssueTransactionModel);

  return scoped(model.assetIssueInventoryItemModel).findAll({
    attributes: {
      exclude: ["createdAt", "updatedAt"],
    },
    where: { assetIssueInventoryItemId: assetIssueInventoryItemIds },
    include: [
      {
        model: model.assetIssueTransactionModel.unscoped(),
        as: "transaction",
        attributes: ["assetIssueTransactionId", "issueDate", "instituteId"],
        where: issueScope,
        required: true,
      },
      ...returnedIssueInventoryItemIncludes,
    ],
    order: [["assetIssueInventoryItemId", "ASC"]],
    transaction: options.transaction,
  });
}

export async function findAssetReturnTransactionByIdForInstitute(
  assetReturnTransactionId,
  options = {}
) {
  const issueScope = buildScope(model.assetIssueTransactionModel);

  return model.assetReturnTransactionModel.unscoped().findOne({
    attributes: ["assetReturnTransactionId", "returnDate"],
    where: { assetReturnTransactionId },
    include: [
      {
        model: model.assetIssueInventoryItemModel.unscoped(),
        as: "returnedIssueItems",
        attributes: ["assetIssueInventoryItemId"],
        required: true,
        include: [
          {
            model: model.assetIssueTransactionModel.unscoped(),
            as: "transaction",
            attributes: [],
            where: issueScope,
            required: true,
          },
        ],
      },
    ],
    transaction: options.transaction,
  });
}

export async function findAssetReturnTransactionsPaginated(
  pagination = {},
  options = {}
) {
  const page = Number(pagination.page) || 1;
  const limit = Number(pagination.limit) || 20;
  const offset = (page - 1) * limit;
  const issueScope = buildScope(model.assetIssueTransactionModel);

  const { count, rows } = await model.assetReturnTransactionModel.unscoped().findAndCountAll({
    attributes: ["assetReturnTransactionId", "returnDate"],
    include: [
      {
        model: model.assetIssueInventoryItemModel.unscoped(),
        as: "returnedIssueItems",
        attributes: [],
        required: true,
        include: [
          {
            model: model.assetIssueTransactionModel.unscoped(),
            as: "transaction",
            attributes: [],
            where: issueScope,
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
  options = {}
) {
  if (!assetReturnTransactionIds.length) return [];

  const { transaction, includeMember = false } = options;

  return scoped(model.assetIssueInventoryItemModel).findAll({
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
    include: buildReturnedIssueItemDetailIncludes(includeMember),
    order: [
      ["assetReturnTransactionId", "ASC"],
      ["assetIssueInventoryItemId", "ASC"],
    ],
    transaction,
  });
}

export async function findAssetReturnTransactionsListBundle(
  pagination = {},
  options = {}
) {
  const { rows, total, page, limit } = await findAssetReturnTransactionsPaginated(
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
    findReturnedIssueItemsByReturnTransactionIds(returnIds, {
      ...options,
      includeMember: true,
    }),
    findReturnSettlementPaymentsByReturnIds(returnIds, options),
  ]);

  const issueTransactionIds = [
    ...new Set(
      issueItemRows
        .map((row) => toPlainRow(row).transaction?.assetIssueTransactionId)
        .filter((issueTransactionId) => issueTransactionId != null)
    ),
  ];

  const securityAmountByIssueId = await findSecurityAmountByIssueIds(issueTransactionIds, options);

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
