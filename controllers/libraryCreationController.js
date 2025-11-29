import * as libraryCreation  from  "../services/libraryCreationServices.js";
import * as fileHandler from '../utility/fileHandler.js';

export async function addLibrary(req, res) {
    try {
        const { instituteId, name, description, floors,campusId } = req.body;
        const createdBy = req.user.userId;
        const universityId = req.user.universityId;

        if (!instituteId || !name) {
            return res.status(400).json({ message: "instituteId and name are required" });
        }

        if (!Array.isArray(floors) || floors.length === 0) {
            return res.status(400).json({ message: "At least one floor is required" });
        }

        for (const f of floors) {
            if (!f.name) {
                return res.status(400).json({ message: "Each floor must have a name" });
            }
        }

        const payload = {
            instituteId,
            name,
            description: description || null,
            floors
        };

        const result = await libraryCreation.addLibrary(payload, createdBy, createdBy,instituteId,universityId,campusId);

        return res.status(201).json({
            message: "Library and floors added successfully",
            libraryId: result.libraryCreationId
        });

    } catch (error) {
        console.error("Controller Error:", error);
        return res.status(500).json({ message: error.message });
    }
};

export async function getLibraryDetails(req, res) {
    const universityId = req.user.universityId;
    try {
        const libraries = await libraryCreation.getLibraryDetails(universityId);
        res.status(200).json(libraries);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSingleLibraryDetails(req, res) {
    const universityId = req.user.universityId;
    try {
        const { libraryCreationId } = req.query;
        const library = await libraryCreation.getSingleLibraryDetails(libraryCreationId,universityId);
        if (library) {
            res.status(200).json(library);
        } else {
            res.status(404).json({ message: "Library not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateLibray(req, res) {
    try {
        const {libraryCreationId} = req.body
        if(!(libraryCreationId)){
            return res.status(400).send('libraryCreationId is required')
         }
         const updatedBy = req.user.userId;
        const updatedLibrary = await libraryCreation.updateLibrary(libraryCreationId, req.body,updatedBy);
            res.status(200).json({message: "Library Creation  update succesfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deleteLibray(req, res) {
    try {
        const { libraryCreationId } = req.query;
        if (!libraryCreationId) {
            return res.status(400).json({ message: "LibraryCreationId is required" });
        }
        const deleted = await libraryCreation.deleteLibray(libraryCreationId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for library creation ID ${libraryCreationId}` });
        } else {
            res.status(404).json({ message: "Library not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


export async function addBookWithInventory(req, res) {
    try {
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;

        const { book, inventory } = req.body;

        if (!book || !inventory) {
            return res.status(400).json({ message: "Book and Inventory details are required" });
        }

        const result = await libraryCreation.addBookWithInventory(
            book,
            inventory,
            createdBy,
            updatedBy
        );

        res.status(201).json({
            message: "Book & Inventory added successfully",
            result
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


export async function getAllBooks(req, res) {
        const universityId = req.user.universityId;
        const {libraryCreationId} = req.query
    try {
        const books = await libraryCreation.getAllBooks(universityId,libraryCreationId);
        res.status(200).json(books);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function getSingleBookDetails(req, res) {
    try {
        const { libraryBookId } = req.query;

        if (!libraryBookId)
            return res.status(400).json({ message: "libraryBookId is required" });

        const result = await libraryCreation.getSingleBookDetails(libraryBookId);

        if (!result)
            return res.status(404).json({ message: "Book not found" });

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


export async function updateBook(req, res) {
    try {
        const { libraryBookId, ...bookData } = req.body;

        if (!libraryBookId)
            return res.status(400).json({ message: "libraryBookId is required" });

        const updatedBy = req.user.userId;
        bookData.updatedBy = updatedBy;

        const result = await libraryCreation.updateBook(libraryBookId, bookData);

        res.status(200).json({ message: "Book updated successfully", result });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateInventory(req, res) {
    try {
        const { inventoryId, ...inventoryData } = req.body;

        if (!inventoryId)
            return res.status(400).json({ message: "inventoryId is required" });

        const result = await libraryCreation.updateInventory(inventoryId, inventoryData);

        res.status(200).json({ message: "Inventory updated successfully", result });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function deleteBook(req, res) {
    try {
        const { libraryBookId } = req.query;

        if (!libraryBookId)
            return res.status(400).json({ message: "libraryBookId is required" });

        const deleted = await libraryCreation.deleteBook(libraryBookId);

        if (!deleted)
            return res.status(404).json({ message: "Book not found" });

        res.status(200).json({ message: "Book deleted successfully" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function deleteInventoryCopy(req, res) {
    try {
        const { inventoryId } = req.query;

        if (!inventoryId)
            return res.status(400).json({ message: "inventoryId is required" });

        const deleted = await libraryCreation.deleteInventoryCopy(inventoryId);

        if (!deleted)
            return res.status(404).json({ message: "Copy not found" });

        res.status(200).json({ message: "Inventory copy deleted successfully" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function getAllIssuedBooks(req, res) {
    try {
        const issuedBooks = await libraryCreation.getAllIssuedBooks();

        res.status(200).json({
            message: "Issued books fetched successfully",
            issuedBooks
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function bulkUploadBooks(req, res) {
    try {
        const excelFile = req.files?.book;

        if (!excelFile) {
            return res.status(400).json({ error: "Excel file is required" });
        }

        const excelData = fileHandler.readExcelFile(excelFile.data);
        if (!excelData) {
            return res.status(400).send("Error reading the Excel file");
        }

        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;

        const result = await libraryCreation.bulkUploadBooks(
            excelData,
            createdBy,
            updatedBy
        );

        return res.status(200).json(result);

    } catch (error) {
        console.error("Bulk Upload Error:", error);
        res.status(500).json({ error: error.message });
    }
};