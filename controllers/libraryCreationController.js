import * as libraryCreation  from  "../services/libraryCreationServices.js";
import * as fileHandler from '../utility/fileHandler.js';

import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function addLibrary(req, res) {
    try {
        const { instituteId, name, description, floors,campusId } = req.body;
        const createdBy = req.user.userId;
        const universityId = req.user.universityId;

        if (!instituteId || !name) {
            return ErrorResponse(res, 400, "instituteId and name are required");
        }

        if (!Array.isArray(floors) || floors.length === 0) {
            return ErrorResponse(res, 400, "At least one floor is required");
        }

        for (const f of floors) {
            if (!f.name) {
                return ErrorResponse(res, 400, "Each floor must have a name");
            }
        }

        const payload = {
            instituteId,
            name,
            description: description || null,
            floors
        };

        const result = await libraryCreation.addLibrary(payload, createdBy, createdBy,instituteId,universityId,campusId);

        return SuccessResponse(res, 201, "Library and floors added successfully", result.libraryCreationId);
    } catch (error) {
        console.error("Controller Error:", error);
        return ErrorResponse(res, 500, error.message);
    }
};

export async function getLibraryDetails(req, res) {
    const universityId = req.user.universityId;
    try {
        const libraries = await libraryCreation.getLibraryDetails(universityId);
        return SuccessResponse(res, 200, "Library Details", libraries);
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function getSingleLibraryDetails(req, res) {
    const universityId = req.user.universityId;
    try {
        const { libraryCreationId } = req.query;
        const library = await libraryCreation.getSingleLibraryDetails(libraryCreationId,universityId);
        if (library) {
            return SuccessResponse(res, 200, "Library Details", library);
        } else {
            return ErrorResponse(res, 404, "Library not found");
        }
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function updateLibray(req, res) {
    try {
        const {libraryCreationId} = req.body
        if(!(libraryCreationId)){
            return ErrorResponse(res, 400, 'libraryCreationId is required')
         }
         const updatedBy = req.user.userId;
        const updatedLibrary = await libraryCreation.updateLibrary(libraryCreationId, req.body,updatedBy);
            return SuccessResponse(res, 200, "Library Creation  update succesfully", updatedLibrary);
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function deleteLibray(req, res) {
    try {
        const { libraryCreationId } = req.query;
        if (!libraryCreationId) {
            return ErrorResponse(res, 400, "LibraryCreationId is required");
        }
        const deleted = await libraryCreation.deleteLibray(libraryCreationId);
        if (deleted) {
            return SuccessResponse(res, 200, `Delete successful for library creation ID ${libraryCreationId}`);
        } else {
            return ErrorResponse(res, 404, "Library not found");
        }
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
};


export async function addCategory(req, res) {
    try {
        const { name } = req.body;
        const instituteId = req.user.defaultInstituteId || req.user.instituteId;
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;

        const data = { name, instituteId, createdBy, updatedBy };
        const result = await libraryCreation.addCategory(data);

        return SuccessResponse(res, 201, "Category added successfully", result);
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function getAllCategories(req, res) {
    try {
        const instituteId = req.query.instituteId || req.user.defaultInstituteId || req.user.instituteId;
        const categories = await libraryCreation.getAllCategories(instituteId);
        return SuccessResponse(res, 200, "Categories fetched successfully", categories);
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function updateCategory(req, res) {
    try {
        const { libraryCategoryId, name } = req.body;
        const updatedBy = req.user.userId;
        const data = { updatedBy };
        if (name) data.name = name;

        const updated = await libraryCreation.updateCategory(libraryCategoryId, data);
        if (!updated) {
            return ErrorResponse(res, 404, "Category not found");
        }
        return SuccessResponse(res, 200, "Category updated successfully");
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function deleteCategory(req, res) {
    try {
        const { libraryCategoryId } = req.query;
        const deleted = await libraryCreation.deleteCategory(libraryCategoryId);
        if (deleted) {
            return SuccessResponse(res, 200, "Category deleted successfully");
        }
        return ErrorResponse(res, 404, "Category not found");
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function addBookWithInventory(req, res) {
    try {
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;

        const { book, inventory } = req.body;

        if (!book || !inventory) {
            return ErrorResponse(res, 400, "Book and Inventory details are required");
        }

        const inventoryList = Array.isArray(inventory) ? inventory : [inventory];
        if (!inventoryList.length) {
            return ErrorResponse(res, 400, "At least one inventory row is required");
        }

        const { libraryBookId } = await libraryCreation.addBookWithInventory(
            book,
            inventoryList,
            createdBy,
            updatedBy
        );
        return SuccessResponse(res, 201, "Book & Inventory added successfully", libraryBookId);
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
};


export async function getAllBooks(req, res) {
        const universityId = req.user.universityId;
        const {libraryCreationId,libraryFloorId} = req.query
        if (!(libraryCreationId && libraryFloorId))
            return ErrorResponse(res, 400, "libraryCreationId,libraryFloorId is required");
    try {
        const books = await libraryCreation.getAllBooks(universityId,libraryCreationId,libraryFloorId);
        return SuccessResponse(res, 200, "Books", books);
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
};

export async function getSingleBookDetails(req, res) {
    try {
        const { libraryBookId } = req.query;

        if (!libraryBookId)
            return ErrorResponse(res, 400, "libraryBookId is required");

        const result = await libraryCreation.getSingleBookDetails(libraryBookId);

        if (!result)
            return ErrorResponse(res, 404, "Book not found");

        return SuccessResponse(res, 200, "Book Details", result);
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
};


export async function updateBook(req, res) {
    try {
        const { libraryBookId, ...bookData } = req.body;

        if (!libraryBookId)
            return ErrorResponse(res, 400, "libraryBookId is required");

        const updatedBy = req.user.userId;
        bookData.updatedBy = updatedBy;

        await libraryCreation.updateBook(libraryBookId, bookData);

        const book = await libraryCreation.getSingleBookDetails(libraryBookId);

        return SuccessResponse(res, 200, "Book updated successfully", book);

    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function updateInventory(req, res) {
    try {
        const { inventoryId, ...inventoryData } = req.body;

        if (!inventoryId)
            return ErrorResponse(res, 400, "inventoryId is required");

        const result = await libraryCreation.updateInventory(inventoryId, inventoryData);

        return SuccessResponse(res, 200, "Inventory updated successfully", result);

    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
};

export async function updateBookWithInventory(req, res) {
    try {
        const response = await libraryCreation.updateBookWithInventory(
            {
                book: req.body.book,
                inventory: req.body.inventory,
                inventoryKeyPresent: "inventory" in req.body,
            },
            req.user.userId,
        );

        return SuccessResponse(res, 200, "Book and/or inventory processed successfully", response);
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function deleteBook(req, res) {
    try {
        const { libraryBookId } = req.query;

        await libraryCreation.deleteBook(libraryBookId);

        return SuccessResponse(res, 200, "Book deleted successfully");

    } catch (error) {
        const statusCode = error.statusCode || 500;
        return ErrorResponse(res, statusCode, error.message);
    }
};

export async function deleteInventoryCopy(req, res) {
    try {
        const { inventoryId } = req.query;

        await libraryCreation.deleteInventoryCopy(inventoryId);

        return SuccessResponse(res, 200, "Inventory copy deleted successfully");

    } catch (error) {
        const statusCode = error.statusCode || 500;
        return ErrorResponse(res, statusCode, error.message);
    }
};

export async function getAllIssuedBooks(req, res) {
    try {
        const issuedBooks = await libraryCreation.getAllIssuedBooks();

        return SuccessResponse(res, 200, "Issued books fetched successfully", issuedBooks);
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
};

export async function bulkUploadBooks(req, res) {
    try {
        const excelFile = req.files?.book;

        if (!excelFile) {
            return ErrorResponse(res, 400, "Excel file is required");
        }

        const excelData = fileHandler.readExcelFile(excelFile.data);
        if (!excelData) {
            return ErrorResponse(res, 400, "Error reading the Excel file");
        }

        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;
        const { libraryCreationId } = req.query;

        const result = await libraryCreation.bulkUploadBooks(
            excelData,
            createdBy,
            updatedBy,
            libraryCreationId
        );

        if (result.status === "error") {
            return res.status(400).json({ message: result.message });
        }

        return SuccessResponse(res, 200, "Data uploaded successfully");

    } catch (error) {
        console.error("Bulk Upload Error:", error);
        return ErrorResponse(res, 500, error.message);
    }
};