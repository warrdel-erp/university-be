import * as memberCreation from "../services/libraryMemberServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";


export async function addMember(req, res) {
  try {
    const newMember = await memberCreation.addMember(req.body, req.user);
    return SuccessResponse(res, 201, "Member Add Successfully", newMember);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getMemberDetails(req, res) {
  try {
    const result = await memberCreation.getMemberDetails(req.user, req.query);
    return SuccessResponse(res, 200, "Member Details", result.members, result.pagination);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getSingleMemberDetails(req, res) {
  try {
    const members = await memberCreation.getSingleMemberDetails(
      req.query.libraryCreationId,
      req.user,
    );
    return SuccessResponse(res, 200, "Member Details", members);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function updateMember(req, res) {
  try {
    const updatedMember = await memberCreation.updateMember(req.body, req.user);
    return SuccessResponse(res, 200, "Member Creation update succesfully", updatedMember);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function deleteMember(req, res) {
  try {
    const result = await memberCreation.deleteMember(req.query.libraryMemberId);
    return SuccessResponse(
      res,
      200,
      `Delete successful for Member creation ID ${result.libraryMemberId}`,
      result,
    );
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function bookIssue(req, res) {
  try {
    const result = await memberCreation.bookIssue(req.body, req.user);
    return SuccessResponse(res, 201, "book Issue Successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getAllIssueBooks(req, res) {
  try {
    const result = await memberCreation.getAllIssueBooks(req.user, req.query);
    return SuccessResponse(res, 200, "Issue Books", result.books, result.pagination);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getBookByMemberId(req, res) {
  try {
    const books = await memberCreation.getBookByMemberId(
      req.query.libraryMemberId,
      req.user,
    );
    return SuccessResponse(res, 200, "Issue Books", books);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function updateBookAndStatus(req, res) {
  try {
    const updated = await memberCreation.updateBookAndStatus(req.body, req.user);
    return SuccessResponse(res, 200, "Book update succesfully", updated);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function deleteBook(req, res) {
  try {
    const result = await memberCreation.deleteBook(req.query.libraryIssueBookId);
    return SuccessResponse(
      res,
      200,
      `Delete successful for book issue ID ${result.libraryIssueBookId}`,
      result,
    );
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}
