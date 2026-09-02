import * as services from "../services/libraryIssueBookTransactionServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function createLibraryIssueBookTransaction(req, res) {
  try {
    await services.createLibraryIssueBookTransaction(req.body);
    return SuccessResponse(res, 201, "Library issue book transaction created successfully");
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getLibraryIssueBookTransactions(req, res) {
  try {
    const { data, paginationData } = await services.getLibraryIssueBookTransactions(req.query);
    return SuccessResponse(
      res,
      200,
      "Library issue book transactions fetched successfully",
      data,
      paginationData,
    );
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getMyLibraryIssueBookTransactions(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return ErrorResponse(res, 404, "User ID not found");
    }

    const { data, paginationData } = await services.getMyLibraryIssueBookTransactions(
      userId,
      req.query,
    );

    return SuccessResponse(
      res,
      200,
      "Library issue book transactions fetched successfully",
      data,
      paginationData,
    );
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getLibraryIssueBookTransactionById(req, res) {
  try {
    const data = await services.getLibraryIssueBookTransactionById(
      req.query.libraryIssueBookTransactionId,
    );
    return SuccessResponse(res, 200, "Library issue book transaction fetched successfully", data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function updateLibraryIssueBookTransaction(req, res) {
  try {
    const data = await services.updateLibraryIssueBookTransaction(req.body);
    return SuccessResponse(res, 200, "Library issue book transaction updated successfully", data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getLibraryBookInventoryIssueHistory(req, res) {
  try {
    const data = await services.getLibraryBookInventoryIssueHistory(req.query.inventoryId);
    return SuccessResponse(
      res,
      200,
      "Library book inventory issue history fetched successfully",
      data,
    );
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}



export async function getLibraryMembersList(req, res) {
  try {
    const { data, paginationData } = await services.getLibraryMembersList(req.query);
    return SuccessResponse(res, 200, "Library members list fetched successfully", data, paginationData);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getLibraryReturnBookTransactions(req, res) {
  try {
    const { data, paginationData } = await services.getLibraryReturnBookTransactions(req.query);
    return SuccessResponse(
      res,
      200,
      "Library return book transactions fetched successfully",
      data,
      paginationData,
    );
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}
