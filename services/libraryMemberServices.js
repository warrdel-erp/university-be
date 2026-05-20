import * as libraryMemberService from "../repository/libraryMemberRepository.js";
import * as libraryIssueBook from "../repository/libraryIssueBookRepository.js";
import * as libraryAddItemService from "./libraryAddItemServices.js";
import sequelize from "../database/sequelizeConfig.js";
import moment from "moment";

export async function addMember(memberData, createdBy, updatedBy) {
  try {
    const staticPrefix = "ASA-L1";

    const typePrefix = memberData.memberType.slice(0, 3).toUpperCase();

    const last = await libraryMemberService.getPreviousMemberId();
    const lastMemberId = last ? last.dataValues.member_id : "";

    let newMemberId;

    if (lastMemberId) {
      const lastNumber = parseInt(lastMemberId.split("-")[3]) || 0;
      const incrementedNumber = lastNumber + 1;

      newMemberId = `${staticPrefix}-${typePrefix}-${String(incrementedNumber).padStart(5, "0")}`;
    } else {
      newMemberId = `${staticPrefix}-${typePrefix}-00001`;
    }

    memberData.memberId = newMemberId;
    memberData.createdBy = createdBy;
    memberData.updatedBy = updatedBy;

    return await libraryMemberService.addMember(memberData);
  } catch (error) {
    console.error("Error adding member:", error);
    throw new Error("Unable to add member");
  }
}

export async function getMemberDetails(universityId) {
  return await libraryMemberService.getMemberDetails(universityId);
}

export async function getSingleMemberDetails(libraryCreationId, universityId) {
  return await libraryMemberService.getSingleMemberDetails(
    libraryCreationId,
    universityId,
  );
}

export async function deleteMember(libraryMemberId) {
  return await libraryMemberService.deleteMember(libraryMemberId);
}

export async function updateMember(libraryMemberId, memberData, updatedBy) {
  const { libraryMemberId: _id, ...updateFields } = memberData;

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

  updateFields.updatedBy = updatedBy;
  return await libraryMemberService.updateMember(libraryMemberId, updateFields);
}

// Book Issue

export async function bookIssue(
  bookIssueData,
  createdBy,
  updatedBy,
  issuerName,
) {
  const transaction = await sequelize.transaction();

  try {
    const libraryAddItemId = await libraryAddItemService.ensureLibraryAddItemId(
      {
        libraryAddItemId: bookIssueData.libraryAddItemId,
        libraryBookId: bookIssueData.libraryBookId,
        libraryCreationId: bookIssueData.libraryCreationId,
        genre: bookIssueData.genre,
        aisle: bookIssueData.aisle,
        shelf: bookIssueData.shelf,
      },
      createdBy,
      updatedBy,
      transaction,
    );

    const payload = {
      libraryAddItemId,
      libraryMemberId: bookIssueData.libraryMemberId,
      createdBy,
      updatedBy,
      issuedBy: bookIssueData.issuedBy ?? issuerName,
      issueDate: moment(bookIssueData.issueDate).toDate(),
      dueDate: moment(bookIssueData.dueDate).toDate(),
      status: "Issued",
    };

    const result = await libraryIssueBook.bookIssue(payload, transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function getAllIssueBooks(universityId) {
  return await libraryIssueBook.getAllIssueBooks(universityId);
}

export async function getBookByMemberId(libraryMemberId, universityId) {
  return await libraryIssueBook.getBookByMemberId(
    libraryMemberId,
    universityId,
  );
}

export async function deleteBook(libraryIssueBookId) {
  return await libraryIssueBook.deleteBook(libraryIssueBookId);
}

export async function updateBookAndStatus(
  libraryIssueBookId,
  bookIssueData,
  updatedBy,
) {
  const updateData = {
    updatedBy,
    status: bookIssueData.status,
    issueDate: moment(bookIssueData.issueDate).toDate(),
    dueDate: moment(bookIssueData.dueDate).toDate(),
    issuedBy: bookIssueData.issuedBy,
  };

  if (bookIssueData.status === "Returned") {
    updateData.returnDate = moment(bookIssueData.returnDate).toDate();
  }

  if (bookIssueData.status === "Renewed") {
    updateData.returnDate = null;
  }

  return await libraryIssueBook.updateBookAndStatus(
    libraryIssueBookId,
    updateData,
  );
}
