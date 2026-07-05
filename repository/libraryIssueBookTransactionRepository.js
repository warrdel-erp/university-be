import { Op, fn, col, where as sequelizeWhere } from "sequelize";
import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

function studentMemberAttributes() {
  return [
    "studentId",
    "firstName",
    "middleName",
    "lastName",
    "scholarNumber",
    "email",
    "phoneNumber",
  ];
}

function teacherMemberAttributes() {
  return ["userId", "employeeName", "employeeCode", "department"];
}

function inventoryListAttributes() {
  return ["inventoryId", "accessionNumber", "status"];
}

function scopedLibraryInclude(required = true) {
  return {
    model: model.libraryCreationModel,
    as: "library",
    attributes: ["libraryCreationId", "instituteId"],
    where: buildScope(model.libraryCreationModel),
    required,
  };
}

function buildBookDetailsInclude(required = true) {
  return {
    model: model.libraryBookModel,
    as: "bookDetails",
    attributes: ["libraryBookId", "title", "subtitle", "authors", "isbn"],
    required,
    include: [scopedLibraryInclude()],
  };
}

function buildInventoryItemInclude({ forList = false } = {}) {
  return {
    model: model.libraryBookIssueInventoryItemModel,
    as: "inventoryItems",
    attributes: [
      "libraryBookIssueInventoryItemId",
      "inventoryId",
      "libraryReturnBookTransactionId",
    ],
    ...(forList ? {} : { separate: true, order: [["libraryBookIssueInventoryItemId", "DESC"]] }),
    required: true,
    include: [
      {
        model: model.libraryBookInventoryModel,
        as: "inventory",
        attributes: inventoryListAttributes(),
        required: true,
        include: [buildBookDetailsInclude()],
      },
      {
        model: model.libraryReturnBookTransactionModel,
        as: "returnBookTransaction",
        attributes: ["libraryReturnBookTransactionId", "returnDate"],
        required: false,
      },
    ],
  };
}

function buildTransactionInclude({ forList = false } = {}) {
  return [
    {
      model: model.studentModel,
      as: "studentMember",
      attributes: studentMemberAttributes(),
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
      attributes: teacherMemberAttributes(),
      required: false,
    },
    buildInventoryItemInclude({ forList }),
  ];
}

async function assertScopedInventory(inventoryId, transaction) {
  return scoped(model.libraryBookInventoryModel).findOne({
    where: { inventoryId },
    attributes: inventoryListAttributes(),
    include: [buildBookDetailsInclude()],
    transaction,
  });
}

async function assertScopedIssueTransaction(libraryIssueBookTransactionId, transaction) {
  return scoped(model.libraryIssueBookTransactionModel).findOne({
    where: { libraryIssueBookTransactionId },
    include: [buildInventoryItemInclude()],
    transaction,
  });
}

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

  const pendingRows = await scoped(model.libraryBookIssueInventoryItemModel).findAll({
    where: {
      libraryIssueBookTransactionId: { [Op.in]: transactionIds },
      libraryReturnBookTransactionId: null,
    },
    attributes: [
      "libraryIssueBookTransactionId",
      [fn("COUNT", col("library_book_issue_inventory_item_id")), "count"],
    ],
    group: ["libraryIssueBookTransactionId"],
    transaction,
  });

  const returnedRows = await scoped(model.libraryBookIssueInventoryItemModel).findAll({
    where: {
      libraryIssueBookTransactionId: { [Op.in]: transactionIds },
      libraryReturnBookTransactionId: { [Op.ne]: null },
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
  return scoped(model.studentModel).findByPk(studentId, {
    attributes: studentMemberAttributes(),
    transaction,
  });
}

export async function findTeacherMemberById(userId, transaction) {
  return scoped(model.employeeModel).findByPk(userId, {
    attributes: teacherMemberAttributes(),
    transaction,
  });
}

export async function countStudentMemberById(studentId, transaction) {
  return scoped(model.studentModel).count({
    where: { studentId },
    transaction,
  });
}

export async function countTeacherMemberById(userId, transaction) {
  return scoped(model.employeeModel).count({
    where: { userId },
    transaction,
  });
}

export async function findInventoriesByIds(inventoryIds, transaction) {
  if (!inventoryIds.length) return [];
  return scoped(model.libraryBookInventoryModel).findAll({
    where: { inventoryId: { [Op.in]: inventoryIds } },
    attributes: inventoryListAttributes(),
    include: [buildBookDetailsInclude()],
    transaction,
  });
}

export async function countExistingInventoriesByIds(inventoryIds, transaction) {
  if (!inventoryIds.length) return 0;
  return scoped(model.libraryBookInventoryModel).count({
    where: { inventoryId: { [Op.in]: inventoryIds } },
    include: [buildBookDetailsInclude()],
    transaction,
  });
}

export async function findActiveIssueItemsByTransactionId(
  libraryIssueBookTransactionId,
  transaction,
) {
  const issueTransaction = await assertScopedIssueTransaction(
    libraryIssueBookTransactionId,
    transaction,
  );
  if (!issueTransaction) {
    return [];
  }

  return scoped(model.libraryBookIssueInventoryItemModel).findAll({
    where: { libraryIssueBookTransactionId, libraryReturnBookTransactionId: null },
    transaction,
  });
}

export async function findActiveIssueItemsForReturn(
  libraryIssueBookTransactionId,
  { libraryBookIssueInventoryItemIds, inventoryIds },
  transaction,
) {
  const issueTransaction = await assertScopedIssueTransaction(
    libraryIssueBookTransactionId,
    transaction,
  );
  if (!issueTransaction) {
    return [];
  }

  const where = {
    libraryIssueBookTransactionId,
    libraryReturnBookTransactionId: null,
  };

  if (libraryBookIssueInventoryItemIds?.length) {
    where.libraryBookIssueInventoryItemId = { [Op.in]: libraryBookIssueInventoryItemIds };
  } else if (inventoryIds?.length) {
    where.inventoryId = { [Op.in]: inventoryIds };
  } else {
    return [];
  }

  return scoped(model.libraryBookIssueInventoryItemModel).findAll({ where, transaction });
}

export async function returnAllActiveIssueItemsForTransaction(
  libraryIssueBookTransactionId,
  returnDate,
  transaction,
) {
  const issueTransaction = await assertScopedIssueTransaction(
    libraryIssueBookTransactionId,
    transaction,
  );
  if (!issueTransaction) {
    return { matchedCount: 0 };
  }

  const activeItems = await scoped(model.libraryBookIssueInventoryItemModel).findAll({
    where: { libraryIssueBookTransactionId, libraryReturnBookTransactionId: null },
    attributes: ["libraryBookIssueInventoryItemId", "inventoryId"],
    transaction,
  });

  if (!activeItems.length) return { matchedCount: 0 };

  const itemIds = activeItems.map((item) => item.libraryBookIssueInventoryItemId);
  const inventoryIds = activeItems.map((item) => item.inventoryId);
  const returnBookTransaction = await createLibraryReturnBookTransaction({ returnDate }, transaction);

  await markIssueItemsReturned(itemIds, returnBookTransaction.libraryReturnBookTransactionId, transaction);
  await markInventoriesAvailable(inventoryIds, transaction);

  return { matchedCount: itemIds.length };
}

export async function returnIssueItemsForTransaction(
  libraryIssueBookTransactionId,
  returnItems,
  transaction,
) {
  if (!returnItems.length) return { matchedCount: 0 };

  const issueTransaction = await assertScopedIssueTransaction(
    libraryIssueBookTransactionId,
    transaction,
  );
  if (!issueTransaction) {
    return { matchedCount: 0 };
  }

  let matchedCount = 0;
  const returnTransactionIdByDate = new Map();

  for (const returnItem of returnItems) {
    const where = { libraryIssueBookTransactionId, libraryReturnBookTransactionId: null };

    if (returnItem.libraryBookIssueInventoryItemId) {
      where.libraryBookIssueInventoryItemId = returnItem.libraryBookIssueInventoryItemId;
    } else {
      where.inventoryId = returnItem.inventoryId;
    }

    const issueItem = await scoped(model.libraryBookIssueInventoryItemModel).findOne({
      where,
      attributes: ["libraryBookIssueInventoryItemId", "inventoryId"],
      transaction,
    });

    if (!issueItem) continue;

    const scopedInventory = await assertScopedInventory(issueItem.inventoryId, transaction);
    if (!scopedInventory) continue;

    const returnDate = returnItem.returnDate;
    let libraryReturnBookTransactionId = returnTransactionIdByDate.get(returnDate);

    if (!libraryReturnBookTransactionId) {
      const returnBookTransaction = await createLibraryReturnBookTransaction({ returnDate }, transaction);
      libraryReturnBookTransactionId = returnBookTransaction.libraryReturnBookTransactionId;
      returnTransactionIdByDate.set(returnDate, libraryReturnBookTransactionId);
    }

    await markIssueItemsReturned(
      [issueItem.libraryBookIssueInventoryItemId],
      libraryReturnBookTransactionId,
      transaction,
    );
    await markInventoriesAvailable([issueItem.inventoryId], transaction);
    matchedCount += 1;
  }

  return { matchedCount };
}

export async function markInventoriesIssued(inventoryIds, payload, transaction) {
  if (!inventoryIds.length) return 0;

  const scopedRows = await scoped(model.libraryBookInventoryModel).findAll({
    where: {
      inventoryId: { [Op.in]: inventoryIds },
      status: "available",
    },
    attributes: ["inventoryId"],
    include: [buildBookDetailsInclude()],
    transaction,
  });

  const scopedIds = scopedRows.map((row) => row.inventoryId);
  if (!scopedIds.length) return 0;

  const [affected] = await scoped(model.libraryBookInventoryModel).update(payload, {
    where: {
      inventoryId: { [Op.in]: scopedIds },
      status: "available",
    },
    transaction,
  });
  return affected;
}

export async function markInventoriesAvailable(inventoryIds, transaction) {
  if (!inventoryIds.length) return;

  const scopedIds = [];
  for (const inventoryId of inventoryIds) {
    const row = await assertScopedInventory(inventoryId, transaction);
    if (row) {
      scopedIds.push(inventoryId);
    }
  }

  if (!scopedIds.length) return;

  return scoped(model.libraryBookInventoryModel).update(
    {
      status: "available",
      issueDate: null,
      dueDate: null,
      studentId: null,
      userId: null,
    },
    {
      where: { inventoryId: { [Op.in]: scopedIds } },
      transaction,
    },
  );
}

export async function markIssueItemsReturned(
  libraryBookIssueInventoryItemIds,
  libraryReturnBookTransactionId,
  transaction,
) {
  if (!libraryBookIssueInventoryItemIds.length) return;
  return scoped(model.libraryBookIssueInventoryItemModel).update(
    { libraryReturnBookTransactionId },
    {
      where: {
        libraryBookIssueInventoryItemId: { [Op.in]: libraryBookIssueInventoryItemIds },
        libraryReturnBookTransactionId: null,
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
  const issueTransaction = await assertScopedIssueTransaction(
    libraryIssueBookTransactionId,
    transaction,
  );
  if (!issueTransaction) {
    return;
  }

  const activeInventoryRows = await scoped(model.libraryBookIssueInventoryItemModel).findAll({
    where: { libraryIssueBookTransactionId, libraryReturnBookTransactionId: null },
    attributes: ["inventoryId"],
    raw: true,
    transaction,
  });
  const inventoryIds = activeInventoryRows.map((row) => row.inventoryId);
  if (!inventoryIds.length) return;

  const scopedIds = [];
  for (const inventoryId of inventoryIds) {
    const row = await assertScopedInventory(inventoryId, transaction);
    if (row) {
      scopedIds.push(inventoryId);
    }
  }

  if (!scopedIds.length) return;

  return scoped(model.libraryBookInventoryModel).update(
    { dueDate },
    {
      where: { inventoryId: { [Op.in]: scopedIds } },
      transaction,
    },
  );
}

export async function createLibraryIssueBookTransaction(data, transaction) {
  return scoped(model.libraryIssueBookTransactionModel).create(data, { transaction });
}

export async function createLibraryReturnBookTransaction(data, transaction) {
  const [row] = await model.libraryReturnBookTransactionModel.findOrCreate({
    where: { returnDate: data.returnDate },
    defaults: { returnDate: data.returnDate },
    transaction,
  });
  return row;
}

export async function bulkCreateLibraryBookIssueInventoryItems(rows, transaction) {
  if (!rows.length) return [];

  for (const inventoryId of [...new Set(rows.map((row) => row.inventoryId))]) {
    const inventory = await assertScopedInventory(inventoryId, transaction);
    if (!inventory) {
      throw new Error("Inventory not found");
    }
  }

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

  const { rows, count } = await scoped(model.libraryIssueBookTransactionModel).findAndCountAll({
    where,
    include: buildTransactionInclude({ forList: true }),
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
  const row = await scoped(model.libraryIssueBookTransactionModel).findOne({
    where: { libraryIssueBookTransactionId },
    include: buildTransactionInclude(),
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
  const existing = await assertScopedIssueTransaction(libraryIssueBookTransactionId, transaction);
  if (!existing) {
    return [0];
  }

  return scoped(model.libraryIssueBookTransactionModel).update(data, {
    where: { libraryIssueBookTransactionId },
    transaction,
  });
}

export async function getLibraryBookInventoryIssueHistoryByInventoryId(inventoryId) {
  const inventoryRow = await scoped(model.libraryBookInventoryModel).findOne({
    where: { inventoryId },
    attributes: ["inventoryId", "accessionNumber", "status", "condition"],
    include: [buildBookDetailsInclude()],
  });

  if (!inventoryRow) {
    return null;
  }

  const issueRows = await scoped(model.libraryBookIssueInventoryItemModel).findAll({
    where: { inventoryId },
    attributes: [
      "libraryBookIssueInventoryItemId",
      "inventoryId",
      "libraryReturnBookTransactionId",
      "libraryIssueBookTransactionId",
      "createdAt",
    ],
    include: [
      {
        model: model.libraryReturnBookTransactionModel,
        as: "returnBookTransaction",
        attributes: ["libraryReturnBookTransactionId", "returnDate"],
        required: false,
      },
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
            attributes: ["userId", "employeeName", "employeeCode", "department"],
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

export async function getLibraryMembersList(query = {}) {
  const memberType = query.memberType;
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  const offset = (page - 1) * limit;
  const members = [];

  if (!memberType || memberType === "STUDENT") {
    const students = await scoped(model.studentModel).findAll({
      attributes: studentMemberAttributes(),
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
    const teachers = await scoped(model.employeeModel).findAll({
      attributes: [...teacherMemberAttributes(), "userId"],
      order: [["userId", "DESC"]],
    });

    const userIds = teachers.map((teacher) => teacher.userId).filter(Boolean);
    const users = userIds.length
      ? await scoped(model.userModel).findAll({
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
          memberId: plain.userId,
          email: user?.email ?? null,
          mobile: user?.phone ?? null,
          ...teacherData,
        };
      }),
    );
  }

  const data = [];
  for (let index = offset; index < offset + limit && index < members.length; index += 1) {
    data.push(members[index]);
  }

  return {
    data,
    paginationData: {
      total: members.length,
      page,
      limit,
    },
  };
}

export async function getLibraryReturnBookTransactions(query = {}) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  const offset = (page - 1) * limit;
  const search = query.search?.trim().toLowerCase();
  const rows = await scoped(model.libraryReturnBookTransactionModel).findAll({
    attributes: ["libraryReturnBookTransactionId", "returnDate", "createdAt", "updatedAt"],
    include: [
      {
        model: model.libraryBookIssueInventoryItemModel,
        as: "inventoryItems",
        attributes: ["libraryBookIssueInventoryItemId", "inventoryId", "libraryIssueBookTransactionId"],
        required: true,
        include: [
          {
            model: model.libraryBookInventoryModel,
            as: "inventory",
            attributes: ["inventoryId", "accessionNumber", "status", "condition"],
            required: true,
            include: [buildBookDetailsInclude()],
          },
          {
            model: model.libraryIssueBookTransactionModel,
            as: "issueBookTransaction",
            attributes: ["libraryIssueBookTransactionId", "memberId", "memberType", "issueDate", "dueDate"],
            required: true,
            include: [
              {
                model: model.studentModel,
                as: "studentMember",
                attributes: studentMemberAttributes(),
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
                attributes: teacherMemberAttributes(),
                required: false,
              },
            ],
          },
        ],
      },
    ],
    order: [
      ["libraryReturnBookTransactionId", "DESC"],
      [
        { model: model.libraryBookIssueInventoryItemModel, as: "inventoryItems" },
        "libraryBookIssueInventoryItemId",
        "DESC",
      ],
    ],
  });

  const returnTransactions = [];

  for (const row of rows) {
    const plain = row.get({ plain: true });
    const issueTransactions = [];
    const issueTransactionById = new Map();

    for (const item of plain.inventoryItems) {
      const transaction = item.issueBookTransaction;
      const issueTransactionId = transaction?.libraryIssueBookTransactionId;
      if (issueTransactionId === undefined || issueTransactionId === null) continue;

      let issueTransactionEntry = issueTransactionById.get(issueTransactionId);
      if (!issueTransactionEntry) {
        issueTransactionEntry = {
          libraryIssueBookTransactionId: issueTransactionId,
          memberId: transaction.memberId,
          memberType: transaction.memberType,
          issueDate: transaction.issueDate,
          dueDate: transaction.dueDate,
          member:
            transaction.memberType === "STUDENT"
              ? transaction.studentMember ?? null
              : transaction.teacherMember ?? null,
          returnedBooks: [],
        };
        issueTransactionById.set(issueTransactionId, issueTransactionEntry);
        issueTransactions.push(issueTransactionEntry);
      }

      issueTransactionEntry.returnedBooks.push({
        libraryBookIssueInventoryItemId: item.libraryBookIssueInventoryItemId,
        inventoryId: item.inventoryId,
        book: item.inventory,
      });
    }

    let totalReturnedBooks = 0;
    for (const issueTransaction of issueTransactions) {
      totalReturnedBooks += issueTransaction.returnedBooks.length;
    }

    returnTransactions.push({
      libraryReturnBookTransactionId: plain.libraryReturnBookTransactionId,
      returnDate: plain.returnDate,
      totalReturnedBooks,
      totalIssueTransactions: issueTransactions.length,
      issueTransactions,
    });
  }

  const filteredReturnTransactions = [];
  if (!search) {
    for (const returnTransaction of returnTransactions) {
      filteredReturnTransactions.push(returnTransaction);
    }
  } else {
    for (const returnTransaction of returnTransactions) {
      let isMatched = false;

      if (
        String(returnTransaction.libraryReturnBookTransactionId).toLowerCase().includes(search) ||
        String(returnTransaction.returnDate ?? "").toLowerCase().includes(search)
      ) {
        isMatched = true;
      }

      if (!isMatched) {
        for (const issueTransaction of returnTransaction.issueTransactions) {
          if (
            String(issueTransaction.libraryIssueBookTransactionId).toLowerCase().includes(search) ||
            String(issueTransaction.memberId).toLowerCase().includes(search) ||
            String(issueTransaction.memberType ?? "").toLowerCase().includes(search) ||
            String(issueTransaction.issueDate ?? "").toLowerCase().includes(search) ||
            String(issueTransaction.dueDate ?? "").toLowerCase().includes(search)
          ) {
            isMatched = true;
            break;
          }

          const member = issueTransaction.member;
          if (member) {
            if (
              String(member.firstName ?? "").toLowerCase().includes(search) ||
              String(member.middleName ?? "").toLowerCase().includes(search) ||
              String(member.lastName ?? "").toLowerCase().includes(search) ||
              String(member.employeeName ?? "").toLowerCase().includes(search) ||
              String(member.scholarNumber ?? "").toLowerCase().includes(search) ||
              String(member.employeeCode ?? "").toLowerCase().includes(search)
            ) {
              isMatched = true;
              break;
            }
          }

          for (const returnedBook of issueTransaction.returnedBooks) {
            const book = returnedBook.book;
            const bookDetails = book?.bookDetails;
            if (
              String(returnedBook.libraryBookIssueInventoryItemId).toLowerCase().includes(search) ||
              String(returnedBook.inventoryId).toLowerCase().includes(search) ||
              String(book?.accessionNumber ?? "").toLowerCase().includes(search) ||
              String(bookDetails?.title ?? "").toLowerCase().includes(search) ||
              String(bookDetails?.subtitle ?? "").toLowerCase().includes(search) ||
              String(bookDetails?.authors ?? "").toLowerCase().includes(search) ||
              String(bookDetails?.isbn ?? "").toLowerCase().includes(search)
            ) {
              isMatched = true;
              break;
            }
          }

          if (isMatched) break;
        }
      }

      if (isMatched) {
        filteredReturnTransactions.push(returnTransaction);
      }
    }
  }

  const data = [];
  for (
    let index = offset;
    index < offset + limit && index < filteredReturnTransactions.length;
    index += 1
  ) {
    data.push(filteredReturnTransactions[index]);
  }

  return {
    data,
    paginationData: {
      total: filteredReturnTransactions.length,
      page,
      limit,
    },
  };
}
