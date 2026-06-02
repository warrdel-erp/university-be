import { Op, fn, col, where as sequelizeWhere } from "sequelize";
import * as model from "../models/index.js";

const studentMemberAttributes = [
  "studentId",
  "firstName",
  "middleName",
  "lastName",
  "scholarNumber",
  "email",
  "phoneNumber",
];

const teacherMemberAttributes = ["employeeId", "employeeName", "employeeCode", "department"];

const inventoryListAttributes = [
  "inventoryId",
  "accessionNumber",
  "status",
];

const inventoryItemInclude = {
  model: model.libraryBookIssueInventoryItemModel,
  as: "inventoryItems",
  attributes: ["libraryBookIssueInventoryItemId", "inventoryId", "returnDate"],
  separate: true,
  order: [["libraryBookIssueInventoryItemId", "DESC"]],
  include: [
    {
      model: model.libraryBookInventoryModel,
      as: "inventory",
      attributes: inventoryListAttributes,
      include: [
        {
          model: model.libraryBookModel,
          as: "bookDetails",
          attributes: ["libraryBookId", "title", "subtitle", "authors", "isbn"],
        },
      ],
    },
  ],
};

const inventoryItemIncludeForList = {
  model: model.libraryBookIssueInventoryItemModel,
  as: "inventoryItems",
  attributes: ["libraryBookIssueInventoryItemId", "inventoryId", "returnDate"],
  required: false,
  include: [
    {
      model: model.libraryBookInventoryModel,
      as: "inventory",
      attributes: inventoryListAttributes,
      required: false,
      include: [
        {
          model: model.libraryBookModel,
          as: "bookDetails",
          attributes: ["libraryBookId", "title", "subtitle", "authors", "isbn"],
          required: false,
        },
      ],
    },
  ],
};

const transactionInclude = [
  {
    model: model.studentModel,
    as: "studentMember",
    attributes: studentMemberAttributes,
    include: [
      {
        model: model.courseModel,
        as: "course",
        attributes: ["courseId", "courseName", "courseCode"],
      },
    ],
    required: false,
  },
  {
    model: model.employeeModel,
    as: "teacherMember",
    attributes: teacherMemberAttributes,
    required: false,
  },
  inventoryItemInclude,
];

const transactionIncludeForList = [
  {
    model: model.studentModel,
    as: "studentMember",
    attributes: studentMemberAttributes,
    include: [
      {
        model: model.courseModel,
        as: "course",
        attributes: ["courseId", "courseName", "courseCode"],
      },
    ],
    required: false,
  },
  {
    model: model.employeeModel,
    as: "teacherMember",
    attributes: teacherMemberAttributes,
    required: false,
  },
  inventoryItemIncludeForList,
];

function toPlainTransaction(row) {
  if (!row) return null;

  const plain = row.get({ plain: true });
  plain.member =
    plain.memberType === "STUDENT" ? plain.studentMember ?? null : plain.teacherMember ?? null;
  delete plain.studentMember;
  delete plain.teacherMember;

  return plain;
}

async function getReturnCountsByTransactionIds(transactionIds, transaction) {
  if (!transactionIds.length) return new Map();

  const pendingRows = await model.libraryBookIssueInventoryItemModel.findAll({
    where: {
      libraryIssueBookTransactionId: { [Op.in]: transactionIds },
      returnDate: null,
    },
    attributes: [
      "libraryIssueBookTransactionId",
      [fn("COUNT", col("library_book_issue_inventory_item_id")), "count"],
    ],
    group: ["libraryIssueBookTransactionId"],
    transaction,
  });

  const returnedRows = await model.libraryBookIssueInventoryItemModel.findAll({
    where: {
      libraryIssueBookTransactionId: { [Op.in]: transactionIds },
      returnDate: { [Op.ne]: null },
    },
    attributes: [
      "libraryIssueBookTransactionId",
      [fn("COUNT", col("library_book_issue_inventory_item_id")), "count"],
    ],
    group: ["libraryIssueBookTransactionId"],
    transaction,
  });

  const countsById = new Map();

  for (const row of pendingRows) {
    countsById.set(row.libraryIssueBookTransactionId, {
      pendingReturnCount: Number(row.get("count")),
      returnedCount: 0,
    });
  }

  for (const row of returnedRows) {
    const transactionId = row.libraryIssueBookTransactionId;
    const counts = countsById.get(transactionId) ?? {
      pendingReturnCount: 0,
      returnedCount: 0,
    };
    counts.returnedCount = Number(row.get("count"));
    countsById.set(transactionId, counts);
  }

  return countsById;
}

export async function findStudentMemberById(studentId, transaction) {
  return model.studentModel.findByPk(studentId, {
    attributes: studentMemberAttributes,
    transaction,
  });
}

export async function findTeacherMemberById(employeeId, transaction) {
  return model.employeeModel.findByPk(employeeId, {
    attributes: teacherMemberAttributes,
    transaction,
  });
}

export async function countStudentMemberById(studentId, transaction) {
  return model.studentModel.count({
    where: { studentId },
    transaction,
  });
}

export async function countTeacherMemberById(employeeId, transaction) {
  return model.employeeModel.count({
    where: { employeeId },
    transaction,
  });
}

export async function findInventoriesByIds(inventoryIds, transaction) {
  if (!inventoryIds.length) return [];
  return model.libraryBookInventoryModel.findAll({
    where: { inventoryId: { [Op.in]: inventoryIds } },
    attributes: inventoryListAttributes,
    transaction,
  });
}

export async function countExistingInventoriesByIds(inventoryIds, transaction) {
  if (!inventoryIds.length) return 0;
  return model.libraryBookInventoryModel.count({
    where: { inventoryId: { [Op.in]: inventoryIds } },
    transaction,
  });
}

export async function findActiveIssueItemsByTransactionId(
  libraryIssueBookTransactionId,
  transaction,
) {
  return model.libraryBookIssueInventoryItemModel.findAll({
    where: { libraryIssueBookTransactionId, returnDate: null },
    transaction,
  });
}

export async function findActiveIssueItemsForReturn(
  libraryIssueBookTransactionId,
  { libraryBookIssueInventoryItemIds, inventoryIds },
  transaction,
) {
  const where = {
    libraryIssueBookTransactionId,
    returnDate: null,
  };

  if (libraryBookIssueInventoryItemIds?.length) {
    where.libraryBookIssueInventoryItemId = { [Op.in]: libraryBookIssueInventoryItemIds };
  } else if (inventoryIds?.length) {
    where.inventoryId = { [Op.in]: inventoryIds };
  } else {
    return [];
  }

  return model.libraryBookIssueInventoryItemModel.findAll({ where, transaction });
}

export async function returnAllActiveIssueItemsForTransaction(
  libraryIssueBookTransactionId,
  returnDate,
  transaction,
) {
  const activeItems = await model.libraryBookIssueInventoryItemModel.findAll({
    where: { libraryIssueBookTransactionId, returnDate: null },
    attributes: ["libraryBookIssueInventoryItemId", "inventoryId"],
    transaction,
  });

  if (!activeItems.length) return { matchedCount: 0 };

  const itemIds = activeItems.map((item) => item.libraryBookIssueInventoryItemId);
  const inventoryIds = activeItems.map((item) => item.inventoryId);

  await markIssueItemsReturned(itemIds, returnDate, transaction);
  await markInventoriesAvailable(inventoryIds, transaction);

  return { matchedCount: itemIds.length };
}

export async function returnIssueItemsForTransaction(
  libraryIssueBookTransactionId,
  returnItems,
  transaction,
) {
  if (!returnItems.length) return { matchedCount: 0 };

  let matchedCount = 0;

  for (const returnItem of returnItems) {
    const where = { libraryIssueBookTransactionId, returnDate: null };

    if (returnItem.libraryBookIssueInventoryItemId) {
      where.libraryBookIssueInventoryItemId = returnItem.libraryBookIssueInventoryItemId;
    } else {
      where.inventoryId = returnItem.inventoryId;
    }

    const issueItem = await model.libraryBookIssueInventoryItemModel.findOne({
      where,
      attributes: ["libraryBookIssueInventoryItemId", "inventoryId"],
      transaction,
    });

    if (!issueItem) continue;

    await markIssueItemsReturned(
      [issueItem.libraryBookIssueInventoryItemId],
      returnItem.returnDate,
      transaction,
    );
    await markInventoriesAvailable([issueItem.inventoryId], transaction);
    matchedCount += 1;
  }

  return { matchedCount };
}

export async function markInventoriesIssued(inventoryIds, payload, transaction) {
  if (!inventoryIds.length) return 0;
  const [affected] = await model.libraryBookInventoryModel.update(payload, {
    where: {
      inventoryId: { [Op.in]: inventoryIds },
      status: "available",
    },
    transaction,
  });
  return affected;
}

export async function markInventoriesAvailable(inventoryIds, transaction) {
  if (!inventoryIds.length) return;
  return model.libraryBookInventoryModel.update(
    {
      status: "available",
      issueDate: null,
      dueDate: null,
      studentId: null,
      employeeId: null,
    },
    {
      where: { inventoryId: { [Op.in]: inventoryIds } },
      transaction,
    },
  );
}

export async function markIssueItemsReturned(libraryBookIssueInventoryItemIds, returnDate, transaction) {
  if (!libraryBookIssueInventoryItemIds.length) return;
  return model.libraryBookIssueInventoryItemModel.update(
    { returnDate },
    {
      where: {
        libraryBookIssueInventoryItemId: { [Op.in]: libraryBookIssueInventoryItemIds },
        returnDate: null,
      },
      transaction,
    },
  );
}

export async function syncOutstandingInventoryDueDate(
  libraryIssueBookTransactionId,
  dueDate,
  transaction,
) {
  const activeInventoryRows = await model.libraryBookIssueInventoryItemModel.findAll({
    where: { libraryIssueBookTransactionId, returnDate: null },
    attributes: ["inventoryId"],
    raw: true,
    transaction,
  });
  const inventoryIds = activeInventoryRows.map((row) => row.inventoryId);
  if (!inventoryIds.length) return;

  return model.libraryBookInventoryModel.update(
    { dueDate },
    {
      where: { inventoryId: { [Op.in]: inventoryIds } },
      transaction,
    },
  );
}

export async function createLibraryIssueBookTransaction(data, transaction) {
  return model.libraryIssueBookTransactionModel.create(data, { transaction });
}

export async function bulkCreateLibraryBookIssueInventoryItems(rows, transaction) {
  if (!rows.length) return [];
  return model.libraryBookIssueInventoryItemModel.bulkCreate(rows, { transaction });
}

export async function getLibraryIssueBookTransactions(query = {}) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  const offset = (page - 1) * limit;
  const search = query.search?.trim();

  const where = {};
  if (search) {
    const likeSearch = `%${search}%`;
    where[Op.or] = [
      { memberType: { [Op.like]: likeSearch } },
      sequelizeWhere(fn("DATE_FORMAT", col("library_issue_book_transaction.issue_date"), "%Y-%m-%d"), {
        [Op.like]: likeSearch,
      }),
      sequelizeWhere(fn("DATE_FORMAT", col("library_issue_book_transaction.due_date"), "%Y-%m-%d"), {
        [Op.like]: likeSearch,
      }),
      sequelizeWhere(col("studentMember.first_name"), { [Op.like]: likeSearch }),
      sequelizeWhere(col("studentMember.middle_name"), { [Op.like]: likeSearch }),
      sequelizeWhere(col("studentMember.last_name"), { [Op.like]: likeSearch }),
      sequelizeWhere(col("studentMember.scholar_number"), { [Op.like]: likeSearch }),
      sequelizeWhere(col("studentMember->course.course_name"), { [Op.like]: likeSearch }),
      sequelizeWhere(col("teacherMember.employee_name"), { [Op.like]: likeSearch }),
      sequelizeWhere(col("teacherMember.employee_code"), { [Op.like]: likeSearch }),
      sequelizeWhere(col("inventoryItems->inventory.accession_number"), { [Op.like]: likeSearch }),
      sequelizeWhere(col("inventoryItems->inventory->bookDetails.title"), { [Op.like]: likeSearch }),
      sequelizeWhere(col("inventoryItems->inventory->bookDetails.authors"), { [Op.like]: likeSearch }),
      sequelizeWhere(col("inventoryItems->inventory->bookDetails.isbn"), { [Op.like]: likeSearch }),
    ];
  }

  const { rows, count } = await model.libraryIssueBookTransactionModel.findAndCountAll({
    where,
    include: transactionIncludeForList,
    order: [["libraryIssueBookTransactionId", "DESC"]],
    distinct: true,
    subQuery: false,
    limit,
    offset,
  });

  const data = rows.map(toPlainTransaction);
  const transactionIds = data.map((row) => row.libraryIssueBookTransactionId);
  const countsById = await getReturnCountsByTransactionIds(transactionIds);

  for (const row of data) {
    const counts = countsById.get(row.libraryIssueBookTransactionId) ?? {
      pendingReturnCount: 0,
      returnedCount: 0,
    };
    row.pendingReturnCount = counts.pendingReturnCount;
    row.returnedCount = counts.returnedCount;
  }

  return {
    data,
    paginationData: {
      total: count,
      page,
      limit,
    },
  };
}

export async function getLibraryIssueBookTransactionById(libraryIssueBookTransactionId, transaction) {
  const row = await model.libraryIssueBookTransactionModel.findOne({
    where: { libraryIssueBookTransactionId },
    include: transactionInclude,
    transaction,
  });
  const plain = toPlainTransaction(row);
  if (!plain) return null;

  const countsById = await getReturnCountsByTransactionIds(
    [plain.libraryIssueBookTransactionId],
    transaction,
  );
  const counts = countsById.get(plain.libraryIssueBookTransactionId) ?? {
    pendingReturnCount: 0,
    returnedCount: 0,
  };
  plain.pendingReturnCount = counts.pendingReturnCount;
  plain.returnedCount = counts.returnedCount;

  return plain;
}

export async function updateLibraryIssueBookTransaction(
  libraryIssueBookTransactionId,
  data,
  transaction,
) {
  return model.libraryIssueBookTransactionModel.update(data, {
    where: { libraryIssueBookTransactionId },
    transaction,
  });
}

export async function getLibraryBookInventoryIssueHistoryByInventoryId(inventoryId) {
  const inventoryRow = await model.libraryBookInventoryModel.findOne({
    where: { inventoryId },
    attributes: ["inventoryId", "accessionNumber", "status", "condition"],
    include: [
      {
        model: model.libraryBookModel,
        as: "bookDetails",
        attributes: ["libraryBookId", "title", "authors", "isbn", "publisher"],
      },
    ],
  });

  if (!inventoryRow) {
    return null;
  }

  const issueRows = await model.libraryBookIssueInventoryItemModel.findAll({
    where: { inventoryId },
    attributes: [
      "libraryBookIssueInventoryItemId",
      "inventoryId",
      "returnDate",
      "libraryIssueBookTransactionId",
      "createdAt",
    ],
    include: [
      {
        model: model.libraryIssueBookTransactionModel,
        as: "issueBookTransaction",
        attributes: [
          "libraryIssueBookTransactionId",
          "memberId",
          "memberType",
          "issueDate",
          "dueDate",
        ],
        include: [
          {
            model: model.studentModel,
            as: "studentMember",
            attributes: [
              "studentId",
              "firstName",
              "middleName",
              "lastName",
              "scholarNumber",
              "enrollNumber",
              "email",
              "phoneNumber",
            ],
            required: false,
            include: [
              {
                model: model.courseModel,
                as: "course",
                attributes: ["courseId", "courseName", "courseCode"],
              },
            ],
          },
          {
            model: model.employeeModel,
            as: "teacherMember",
            attributes: ["employeeId", "employeeName", "employeeCode", "department"],
            required: false,
          },
        ],
      },
    ],
    order: [["libraryBookIssueInventoryItemId", "DESC"]],
  });

  const issueHistory = [];
  for (const row of issueRows) {
    issueHistory.push(row.get({ plain: true }));
  }

  return {
    book: inventoryRow.get({ plain: true }),
    issueCount: issueHistory.length,
    issueHistory,
  };
}

export async function getLibraryMembersList(memberType) {
  const members = [];

  if (!memberType || memberType === "STUDENT") {
    const students = await model.studentModel.findAll({
      attributes: studentMemberAttributes,
      include: [
        {
          model: model.courseModel,
          as: "course",
          attributes: ["courseId", "courseName", "courseCode"],
        },
      ],
      order: [["studentId", "DESC"]],
    });

    members.push(
      ...students.map((student) => {
        const plain = student.get({ plain: true });
        return {
          memberType: "STUDENT",
          memberId: plain.studentId,
          ...plain,
        };
      }),
    );
  }

  if (!memberType || memberType === "TEACHER") {
    const teachers = await model.employeeModel.findAll({
      attributes: [...teacherMemberAttributes, "userId"],
      order: [["employeeId", "DESC"]],
    });

    const userIds = teachers.map((teacher) => teacher.userId).filter(Boolean);
    const users = userIds.length
      ? await model.userModel.findAll({
          attributes: ["userId", "email", "phone"],
          where: { userId: { [Op.in]: userIds } },
        })
      : [];
    const userById = new Map(users.map((user) => [user.userId, user]));

    members.push(
      ...teachers.map((teacher) => {
        const plain = teacher.get({ plain: true });
        const user = userById.get(plain.userId);
        const { userId, ...teacherData } = plain;
        return {
          memberType: "TEACHER",
          memberId: plain.employeeId,
          email: user?.email ?? null,
          mobile: user?.phone ?? null,
          ...teacherData,
        };
      }),
    );
  }

  return members;
}
