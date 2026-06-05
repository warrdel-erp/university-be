import { Op } from "sequelize";
import * as model from "../models/index.js";

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

function buildIssueDetailIncludes({
  includeItems = true,
  includeMember = false,
  includeSecurityPayment = false,
  instituteId = null,
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
          where: {
            instituteId,
            paymentType: "INCOMING",
          },
        },
      ],
    });
  }

  return includes;
}

export async function createAssetIssue(payload, options = {}) {
  return model.assetIssueTransactionModel.create(payload, { transaction: options.transaction });
}

export async function createAssetIssueInventoryItems(payload, options = {}) {
  return model.assetIssueInventoryItemModel.bulkCreate(payload, { transaction: options.transaction });
}

export async function updateAssetIssue(assetIssueTransactionId, instituteId, payload, options = {}) {
  const [affected] = await model.assetIssueTransactionModel.update(payload, {
    where: { assetIssueTransactionId, instituteId },
    transaction: options.transaction,
  });
  return affected;
}

export async function findAssetIssueById(assetIssueTransactionId, instituteId, options = {}) {
  const {
    transaction,
    includeItems = true,
    includeMember = false,
    includeSecurityPayment = false,
  } = options;

  return model.assetIssueTransactionModel.findOne({
    attributes: {
      exclude: ["createdAt", "updatedAt"],
    },
    where: { assetIssueTransactionId, instituteId },
    include: buildIssueDetailIncludes({
      includeItems,
      includeMember,
      includeSecurityPayment,
      instituteId,
    }),
    transaction,
  });
}

export async function findOpenIssueLinesByInventoryIds(inventoryItemIds, options = {}) {
  if (!inventoryItemIds.length) return [];
  return model.assetIssueInventoryItemModel.findAll({
    attributes: ["assetIssueInventoryItemId", "assetInventoryItemId"],
    where: {
      assetInventoryItemId: inventoryItemIds,
      assetReturnTransactionId: null,
    },
    transaction: options.transaction,
  });
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

export async function findReturnTransactionIdsByIssueTransactionId(
  assetIssueTransactionId,
  instituteId,
  options = {}
) {
  const rows = await model.assetIssueInventoryItemModel.findAll({
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
        where: { instituteId },
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

export async function findAssetSecurityPaymentsByIssueIds(
  assetIssueTransactionIds,
  instituteId,
  options = {}
) {
  if (!assetIssueTransactionIds.length) return [];
  return model.paymentItemModel.findAll({
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
        where: { instituteId, paymentType: "INCOMING" },
        include: paymentPayeeIncludes,
      },
    ],
    transaction: options.transaction,
  });
}

export async function findAssetIssuePaymentsWithPayeesByIssueId(
  assetIssueTransactionId,
  instituteId,
  options = {}
) {
  const returnIds = await findReturnTransactionIdsByIssueTransactionId(
    assetIssueTransactionId,
    instituteId,
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

  return model.paymentItemModel.findAll({
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
        where: {
          instituteId,
          [Op.or]: [
            { paymentType: "INCOMING" },
            { remark: { [Op.like]: "Asset return%" } },
          ],
        },
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

export async function findAssetSecurityPaymentByIssueId(
  assetIssueTransactionId,
  instituteId,
  options = {}
) {
  const rows = await findAssetSecurityPaymentsByIssueIds(
    [assetIssueTransactionId],
    instituteId,
    options
  );
  return rows[0] ?? null;
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
    include: issueInventoryItemIncludes,
    order: [["assetIssueInventoryItemId", "ASC"]],
    transaction: options.transaction,
  });
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

function buildAssetIssueWhere(instituteId, filters = {}) {
  const where = { instituteId };
  const search = filters.search?.trim();
  if (!search) {
    return where;
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
    [Op.and]: [{ instituteId }, { [Op.or]: orParts }],
  };
}

export async function findAssetIssuesPaginated(instituteId, filters = {}, pagination = {}, options = {}) {
  const page = Number(pagination.page) || 1;
  const limit = Number(pagination.limit) || 20;
  const offset = (page - 1) * limit;
  const where = buildAssetIssueWhere(instituteId, filters);

  const { count, rows } = await model.assetIssueTransactionModel.findAndCountAll({
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

  return { rows, total: count, page, limit };
}

/** Per issue transaction: total lines issued and lines with a return recorded. */
export async function countIssueItemStatsByTransactionIds(
  assetIssueTransactionIds,
  instituteId,
  options = {}
) {
  if (!assetIssueTransactionIds.length) {
    return {};
  }

  const { transaction } = options;
  const db = model.assetIssueInventoryItemModel.sequelize;

  const rows = await model.assetIssueInventoryItemModel.findAll({
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
        where: { instituteId },
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

export async function findStudentById(studentId, instituteId, options = {}) {
  return model.studentModel.findOne({
    attributes: ["studentId"],
    where: { studentId, instituteId },
    transaction: options.transaction,
  });
}

export async function findStudentMemberDetailsById(studentId, instituteId, options = {}) {
  return model.studentModel.findOne({
    attributes: ["studentId", "firstName", "middleName", "lastName", "scholarNumber", "courseId"],
    where: { studentId, instituteId },
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

export async function findTeacherById(employeeId, instituteId, options = {}) {
  return model.employeeModel.findOne({
    attributes: ["employeeId"],
    where: { employeeId, instituteId },
    transaction: options.transaction,
  });
}

export async function findEmployeeMemberDetailsById(employeeId, instituteId, options = {}) {
  return model.employeeModel.findOne({
    attributes: ["employeeId", "employeeName", "employeeCode", "department"],
    where: { employeeId, instituteId },
    transaction: options.transaction,
  });
}

export async function findStudentMemberDetailsByIds(studentIds, instituteId, options = {}) {
  if (!studentIds.length) return [];
  return model.studentModel.findAll({
    attributes: ["studentId", "firstName", "middleName", "lastName", "scholarNumber", "courseId"],
    where: { studentId: studentIds, instituteId },
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

export async function findEmployeeMemberDetailsByIds(employeeIds, instituteId, options = {}) {
  if (!employeeIds.length) return [];
  return model.employeeModel.findAll({
    attributes: ["employeeId", "employeeName", "employeeCode", "department"],
    where: { employeeId: employeeIds, instituteId },
    transaction: options.transaction,
  });
}

export async function findInstituteInventoryItemsByIds(inventoryItemIds, instituteId, options = {}) {
  return model.assetInventoryItemModel.findAll({
    attributes: ["assetInventoryItemId", "assetId"],
    where: { assetInventoryItemId: inventoryItemIds, instituteId },
    transaction: options.transaction,
  });
}

export async function findInstituteAssetsByIds(assetIds, instituteId, options = {}) {
  return model.assetModel.findAll({
    attributes: ["assetId"],
    where: { assetId: assetIds, instituteId },
    transaction: options.transaction,
  });
}

export async function updateAssetStatusByIds(assetIds, instituteId, status, options = {}) {
  const [affected] = await model.assetModel.update(
    { status },
    {
      where: { assetId: assetIds, instituteId },
      transaction: options.transaction,
    }
  );
  return affected;
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

const issueTransactionIncludeForInstitute = (instituteId) => ({
  model: model.assetIssueTransactionModel,
  as: "transaction",
  attributes: [],
  where: { instituteId },
  required: true,
});

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
