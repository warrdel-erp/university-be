import * as libraryCreation from "../services/libraryCreationServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

import { bulkUploadLibraryBooks } from "../services/libraryBookBulkUploadServices.js";

export async function addLibrary(req, res) {
  try {
    const library = await libraryCreation.addLibrary(req.body, req.user);
    return SuccessResponse(
      res,
      201,
      "Library and floors added successfully",
      library.libraryCreationId,
    );
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getLibraryDetails(req, res) {
  try {
    const libraries = await libraryCreation.getLibraryDetails(req.user);
    return SuccessResponse(res, 200, "Library Details", libraries);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getSingleLibraryDetails(req, res) {
  try {
    const library = await libraryCreation.getSingleLibraryDetails(
      req.query.libraryCreationId,
      req.user,
    );
    return SuccessResponse(res, 200, "Library Details", library);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function updateLibray(req, res) {
  try {
    const updatedLibrary = await libraryCreation.updateLibrary(req.body, req.user);
    return SuccessResponse(res, 200, "Library Creation  update succesfully", updatedLibrary);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function deleteLibray(req, res) {
  try {
    const result = await libraryCreation.deleteLibray(req.query.libraryCreationId);
    return SuccessResponse(
      res,
      200,
      `Delete successful for library creation ID ${result.libraryCreationId}`,
    );
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function addCategory(req, res) {
  try {
    const result = await libraryCreation.addCategory(req.body, req.user);
    return SuccessResponse(res, 201, "Category added successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getAllCategories(req, res) {
  try {
    const categories = await libraryCreation.getAllCategories(req.user);
    return SuccessResponse(res, 200, "Categories fetched successfully", categories);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function updateCategory(req, res) {
  try {
    await libraryCreation.updateCategory(req.body, req.user);
    return SuccessResponse(res, 200, "Category updated successfully");
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function deleteCategory(req, res) {
  try {
    await libraryCreation.deleteCategory(req.query.libraryCategoryId);
    return SuccessResponse(res, 200, "Category deleted successfully");
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function addBookWithInventory(req, res) {
  try {
    const { libraryBookId } = await libraryCreation.addBookWithInventory(req.body, req.user);
    return SuccessResponse(res, 201, "Book & Inventory added successfully", { libraryBookId });
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getAllBooks(req, res) {
  try {
    const result = await libraryCreation.getAllBooks(req.query, req.user);
    return SuccessResponse(res, 200, "Books", result.books, result.pagination);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getSingleBookDetails(req, res) {
  try {
    const result = await libraryCreation.getSingleBookDetails(req.query.libraryBookId);
    return SuccessResponse(res, 200, "Book Details", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function updateBook(req, res) {
  try {
    const book = await libraryCreation.updateBookFromRequest(req.body, req.user);
    return SuccessResponse(res, 200, "Book updated successfully", book);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function updateInventory(req, res) {
  try {
    const result = await libraryCreation.updateInventoryFromRequest(req.body);
    return SuccessResponse(res, 200, "Inventory updated successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function updateBookWithInventory(req, res) {
  try {
    const response = await libraryCreation.updateBookWithInventory(req.body, req.user);
    return SuccessResponse(res, 200, "Book and/or inventory processed successfully", response);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function deleteBook(req, res) {
  try {
    await libraryCreation.deleteBook(req.query.libraryBookId);
    return SuccessResponse(res, 200, "Book deleted successfully");
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function deleteInventoryCopy(req, res) {
  try {
    await libraryCreation.deleteInventoryCopy(req.query.inventoryId);
    return SuccessResponse(res, 200, "Inventory copy deleted successfully");
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getAllIssuedBooks(req, res) {
  try {
    const issuedBooks = await libraryCreation.getAllIssuedBooks(req.user);
    return SuccessResponse(res, 200, "Issued books fetched successfully", issuedBooks);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function bulkGenerateFloorStructure(req, res) {
  try {
    const result = await libraryCreation.bulkGenerateFloorStructure(
      req.params.libraryFloorId,
      req.body,
      req.user,
    );
    return SuccessResponse(res, 201, "Floor structure generated successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getFloorStructure(req, res) {
  try {
    const result = await libraryCreation.getFloorStructure(
      req.params.libraryFloorId,
      req.user,
    );
    return SuccessResponse(res, 200, "Floor structure fetched successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function bulkUploadBooks(req, res) {
  try {
    const data = await bulkUploadLibraryBooks(req.files?.book, req.user, req.query);
    return SuccessResponse(res, 200, "Data uploaded successfully", data);
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Internal Server Error",
      error.details ?? null,
    );
  }
}