import sequelize from "../database/sequelizeConfig.js";
import * as repo from "../repository/libraryIssueBookTransactionRepository.js";

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function toDateOnlyString(value) {
  if (!value) return value;
  return String(value).slice(0, 10);
}

function assertDueDateOnOrAfterIssueDate(issueDate, dueDate) {
  const issue = toDateOnlyString(issueDate);
  const due = toDateOnlyString(dueDate);
  if (due < issue) {
    throw httpError("dueDate must be on or after issueDate");
  }
}

function assertReturnDateOnOrAfterIssueDate(issueDate, returnDate) {
  const issue = toDateOnlyString(issueDate);
  const returned = toDateOnlyString(returnDate);
  if (returned < issue) {
    throw httpError("returnDate must be on or after issueDate");
  }
}

function getInventoryIds(inventoryItems = []) {
  return inventoryItems.map((item) => item.inventoryId);
}

function assertUniqueInventoryIdsInPayload(inventoryItems) {
  const ids = getInventoryIds(inventoryItems);
  if (new Set(ids).size !== ids.length) {
    throw httpError("Duplicate inventoryId in request");
  }
}

async function normalizeIssueMember(memberId, memberType, transaction) {
  if (memberType === "STUDENT") {
    const studentId = await repo.resolveStudentIssueMemberId(memberId, transaction);
    if (!studentId) {
      throw httpError("Student not found", 404);
    }
    return { memberId: studentId, memberType };
  }

  if (memberType === "TEACHER") {
    const count = await repo.countTeacherMemberById(memberId, transaction);
    if (!count) {
      throw httpError("Teacher not found", 404);
    }
    return { memberId: Number(memberId), memberType };
  }

  throw httpError("memberType must be STUDENT or TEACHER");
}

async function buildMemberInventoryFields(memberId, memberType, transaction) {
  if (memberType === "STUDENT") {
    return { studentId: memberId, employeeId: null };
  }

  const employeeId = await repo.findEmployeeIdByUserId(memberId, transaction);
  if (!employeeId) {
    throw httpError("Teacher not found", 404);
  }

  return { studentId: null, employeeId };
}

async function assertInventoryItemsIssuable(inventoryItems, transaction) {
  if (!inventoryItems?.length) return;

  assertUniqueInventoryIdsInPayload(inventoryItems);

  const inventoryIds = getInventoryIds(inventoryItems);
  const existingCount = await repo.countExistingInventoriesByIds(inventoryIds, transaction);
  if (existingCount !== inventoryIds.length) {
    throw httpError("One or more inventoryId values were not found", 404);
  }
}

async function issueInventoryCopies(
  inventoryIds,
  { memberId, memberType, issueDate, dueDate },
  transaction,
) {
  if (!inventoryIds.length) return;

  const affected = await repo.markInventoriesIssued(
    inventoryIds,
    {
      status: "issued",
      issueDate,
      dueDate,
      ...(await buildMemberInventoryFields(memberId, memberType, transaction)),
    },
    transaction,
  );

  if (affected !== inventoryIds.length) {
    throw httpError("One or more inventory copies are not available");
  }
}

async function processReturnItems(libraryIssueBookTransactionId, returnItems, issueDate, transaction) {
  if (!returnItems?.length) return;

  for (const returnItem of returnItems) {
    assertReturnDateOnOrAfterIssueDate(issueDate, returnItem.returnDate);
  }

  const result = await repo.returnIssueItemsForTransaction(
    libraryIssueBookTransactionId,
    returnItems,
    transaction,
  );
  if (result.matchedCount !== returnItems.length) {
    throw httpError("Each return item must match exactly one active issued book");
  }
}

export async function createLibraryIssueBookTransaction(body) {
  const transaction = await sequelize.transaction();
  try {
    const member = await normalizeIssueMember(body.memberId, body.memberType, transaction);
    assertDueDateOnOrAfterIssueDate(body.issueDate, body.dueDate);
    await assertInventoryItemsIssuable(body.inventoryItems, transaction);

    const created = await repo.createLibraryIssueBookTransaction(
      {
        memberId: member.memberId,
        memberType: member.memberType,
        issueDate: body.issueDate,
        dueDate: body.dueDate,
      },
      transaction,
    );

    const inventoryIds = getInventoryIds(body.inventoryItems ?? []);

    if (inventoryIds.length) {
      await repo.bulkCreateLibraryBookIssueInventoryItems(
        inventoryIds.map((inventoryId) => ({
          libraryIssueBookTransactionId: created.libraryIssueBookTransactionId,
          inventoryId,
        })),
        transaction,
      );

      await issueInventoryCopies(
        inventoryIds,
        {
          memberId: member.memberId,
          memberType: member.memberType,
          issueDate: body.issueDate,
          dueDate: body.dueDate,
        },
        transaction,
      );
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function getLibraryIssueBookTransactions(query) {
  return repo.getLibraryIssueBookTransactions(query);
}

export async function getMyLibraryIssueBookTransactions(userId, query) {
  const member = await repo.resolveIssueMemberFromUserId(userId);
  if (!member) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    return {
      data: [],
      paginationData: { total: 0, page, limit },
    };
  }

  return repo.getLibraryIssueBookTransactions({
    ...query,
    memberId: member.memberId,
    memberType: member.memberType,
  });
}

export async function getLibraryIssueBookTransactionById(libraryIssueBookTransactionId) {
  const row = await repo.getLibraryIssueBookTransactionById(
    libraryIssueBookTransactionId,
    undefined,
  );
  if (!row) throw httpError("Library issue book transaction not found", 404);
  return row;
}

export async function updateLibraryIssueBookTransaction(body) {
  const transaction = await sequelize.transaction();
  try {
    const { libraryIssueBookTransactionId, inventoryItems, returnItems, ...updateFields } = body;

    const existing = await repo.getLibraryIssueBookTransactionById(
      libraryIssueBookTransactionId,
      transaction,
    );
    if (!existing) throw httpError("Library issue book transaction not found", 404);

    let memberId = updateFields.memberId ?? existing.memberId;
    let memberType = updateFields.memberType ?? existing.memberType;
    const issueDate = updateFields.issueDate ?? existing.issueDate;
    const dueDate = updateFields.dueDate ?? existing.dueDate;

    if (updateFields.memberId !== undefined || updateFields.memberType !== undefined) {
      const member = await normalizeIssueMember(memberId, memberType, transaction);
      memberId = member.memberId;
      memberType = member.memberType;
      updateFields.memberId = member.memberId;
      updateFields.memberType = member.memberType;
    }

    assertDueDateOnOrAfterIssueDate(issueDate, dueDate);

    if (returnItems !== undefined) {
      await processReturnItems(libraryIssueBookTransactionId, returnItems, issueDate, transaction);
    }

    if (inventoryItems !== undefined) {
      const returnDate = toDateOnlyString(new Date());
      assertReturnDateOnOrAfterIssueDate(issueDate, returnDate);
      await repo.returnAllActiveIssueItemsForTransaction(
        libraryIssueBookTransactionId,
        returnDate,
        transaction,
      );

      await assertInventoryItemsIssuable(inventoryItems, transaction);

      if (inventoryItems.length) {
        const inventoryIds = getInventoryIds(inventoryItems);
        await repo.bulkCreateLibraryBookIssueInventoryItems(
          inventoryIds.map((inventoryId) => ({
            libraryIssueBookTransactionId,
            inventoryId,
          })),
          transaction,
        );

        await issueInventoryCopies(
          inventoryIds,
          { memberId, memberType, issueDate, dueDate },
          transaction,
        );
      }
    } else if (updateFields.dueDate !== undefined) {
      await repo.syncOutstandingInventoryDueDate(libraryIssueBookTransactionId, dueDate, transaction);
    }

    if (Object.keys(updateFields).length) {
      const [updated] = await repo.updateLibraryIssueBookTransaction(
        libraryIssueBookTransactionId,
        updateFields,
        transaction,
      );

      if (!updated) throw httpError("Library issue book transaction not found", 404);
    }

    await transaction.commit();
    return repo.getLibraryIssueBookTransactionById(libraryIssueBookTransactionId);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function getLibraryBookInventoryIssueHistory(inventoryId) {
  const data = await repo.getLibraryBookInventoryIssueHistoryByInventoryId(inventoryId);

  if (!data) {
    throw httpError("Book inventory not found for the given inventoryId", 404);
  }

  return data;
}

export async function getLibraryMembersList(query) {
  return repo.getLibraryMembersList(query);
}

export async function getLibraryReturnBookTransactions(query) {
  return repo.getLibraryReturnBookTransactions(query);
}
