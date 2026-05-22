import * as libraryMemberService from "../repository/libraryMemberRepository.js";
import * as libraryIssueBook from "../repository/libraryIssueBookRepository.js";
import * as libraryAddItemRepository from "../repository/libraryAddItemRepository.js";
import * as libraryCreationRepository from "../repository/libraryCreationRepository.js";
import sequelize from "../database/sequelizeConfig.js";
import moment from "moment";

const httpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const assertUniqueLibraryMember = async (
  { studentId, employeeId },
  excludeLibraryMemberId,
  transaction,
) => {
  if (studentId) {
    const existingStudent = await libraryMemberService.findByStudentId(
      studentId,
      excludeLibraryMemberId,
      transaction,
    );
    if (existingStudent) {
      throw httpError(
        "Student is already registered as a library member",
        409,
      );
    }
  }

  if (employeeId) {
    const existingEmployee = await libraryMemberService.findByEmployeeId(
      employeeId,
      excludeLibraryMemberId,
      transaction,
    );
    if (existingEmployee) {
      throw httpError(
        "Employee is already registered as a library member",
        409,
      );
    }
  }
};

const buildMemberCardId = (memberType, lastMemberId) => {
  const staticPrefix = "ASA-L1";
  const typePrefix = memberType.slice(0, 3).toUpperCase();

  if (!lastMemberId) {
    return `${staticPrefix}-${typePrefix}-00001`;
  }

  const lastNumber = parseInt(lastMemberId.split("-")[3], 10) || 0;
  return `${staticPrefix}-${typePrefix}-${String(lastNumber + 1).padStart(5, "0")}`;
};

export async function addMember(memberData, user) {
  try {
    await assertUniqueLibraryMember(memberData, null);

    const last = await libraryMemberService.getPreviousMemberId();
    const lastMemberId = last?.dataValues?.member_id ?? last?.memberId ?? "";

    const payload = {
      ...memberData,
      memberId: buildMemberCardId(memberData.memberType, lastMemberId),
      createdBy: user.userId,
      updatedBy: user.userId,
    };

    return await libraryMemberService.addMember(payload);
  } catch (error) {
    console.error("Error adding member:", error);
    if (error.statusCode) {
      throw error;
    }
    throw httpError("Unable to add member", 500);
  }
}

export async function getMemberDetails(user) {
  return libraryMemberService.getMemberDetails(user.universityId);
}

export async function getSingleMemberDetails(libraryCreationId, user) {
  const members = await libraryMemberService.getSingleMemberDetails(
    libraryCreationId,
    user.universityId,
  );

  if (!members?.length) {
    throw httpError("Member not found", 404);
  }

  return members;
}

export async function updateMember(memberData, user) {
  const { libraryMemberId, ...updateFields } = memberData;

  await assertUniqueLibraryMember(updateFields, libraryMemberId);

  const libraryMember =
    await libraryMemberService.getPreviousMemberIdByLibraryMemberId(
      libraryMemberId,
    );
  const lastMemberId =
    libraryMember?.memberId ?? libraryMember?.dataValues?.member_id ?? "";

  if (lastMemberId && updateFields.memberType) {
    const typePrefix = updateFields.memberType.slice(0, 3).toUpperCase();
    const segments = lastMemberId.split("-");
    const serial = segments[segments.length - 1];
    updateFields.memberId = `${segments[0]}-${segments[1]}-${typePrefix}-${serial}`;
  }

  updateFields.updatedBy = user.userId;
  return libraryMemberService.updateMember(libraryMemberId, updateFields);
}

export async function deleteMember(libraryMemberId) {
  const member = await libraryMemberService.findMemberById(libraryMemberId);
  if (!member) {
    throw httpError("Library member not found", 404);
  }

  const issueCount = await libraryIssueBook.countIssuesByMemberId(libraryMemberId);
  if (issueCount > 0) {
    throw httpError(
      "Cannot delete member with issued books. Return or delete all book issues first.",
      409,
    );
  }

  const deleted = await libraryMemberService.deleteMember(libraryMemberId);
  if (!deleted) {
    throw httpError("Library member not found", 404);
  }

  return { libraryMemberId };
}

export async function bookIssue(bookIssueData, user) {
  const transaction = await sequelize.transaction();

  try {
    const memberExists = await libraryMemberService.findMemberById(
      bookIssueData.libraryMemberId,
      transaction,
    );
    if (!memberExists) {
      throw httpError("Library member not found", 404);
    }

    const bookExists = await libraryCreationRepository.bookExistsById(
      bookIssueData.libraryBookId,
      transaction,
    );
    if (!bookExists) {
      throw httpError("Library book not found", 404);
    }

    const libraryAddItemId = bookIssueData.libraryAddItemId ?? null;
    if (
      libraryAddItemId &&
      !(await libraryAddItemRepository.findById(libraryAddItemId, transaction))
    ) {
      throw httpError("Library add item not found", 404);
    }

    const issueDate = moment(bookIssueData.issueDate);
    const dueDate = moment(bookIssueData.dueDate);
    if (!issueDate.isValid() || !dueDate.isValid()) {
      throw httpError("Invalid issueDate or dueDate", 400);
    }

    const result = await libraryIssueBook.bookIssue(
      {
        libraryAddItemId,
        libraryBookId: bookIssueData.libraryBookId,
        libraryMemberId: bookIssueData.libraryMemberId,
        createdBy: user.userId,
        updatedBy: user.userId,
        issuedBy: bookIssueData.issuedBy ?? user.userName,
        receivedBy: bookIssueData.receivedBy ?? user.userName,
        issueDate: issueDate.toDate(),
        dueDate: dueDate.toDate(),
        status: "Issued",
      },
      transaction,
    );

    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function getAllIssueBooks(user) {
  return libraryIssueBook.getAllIssueBooks(user.universityId);
}

export async function getBookByMemberId(libraryMemberId, user) {
  if (!(await libraryMemberService.findMemberById(libraryMemberId))) {
    throw httpError("Library member not found", 404);
  }

  return libraryIssueBook.getBookByMemberId(libraryMemberId, user.universityId);
}

export async function updateBookAndStatus(bookIssueData, user) {
  const { libraryIssueBookId } = bookIssueData;
  const issueDate = moment(bookIssueData.issueDate);
  const dueDate = moment(bookIssueData.dueDate);

  if (!issueDate.isValid() || !dueDate.isValid()) {
    throw httpError("Invalid issueDate or dueDate", 400);
  }

  const updateData = {
    updatedBy: user.userId,
    status: bookIssueData.status,
    issueDate: issueDate.toDate(),
    dueDate: dueDate.toDate(),
    issuedBy: bookIssueData.issuedBy,
  };

  if (bookIssueData.status === "Returned") {
    const returnDate = moment(bookIssueData.returnDate);
    if (!returnDate.isValid()) {
      throw httpError("Invalid returnDate", 400);
    }
    updateData.returnDate = returnDate.toDate();
    updateData.receivedBy = bookIssueData.receivedBy ?? user.userName;
  }

  if (bookIssueData.status === "Renewed") {
    updateData.returnDate = null;
  }

  const updated = await libraryIssueBook.updateBookAndStatus(
    libraryIssueBookId,
    updateData,
  );

  if (!updated) {
    throw httpError("Book issue not found", 404);
  }

  return libraryIssueBook.findIssueBookById(
    libraryIssueBookId,
    user.universityId,
  );
}

export async function deleteBook(libraryIssueBookId) {
  const deleted = await libraryIssueBook.deleteBook(libraryIssueBookId);
  if (!deleted) {
    throw httpError("Book issue not found", 404);
  }

  return { libraryIssueBookId };
}
