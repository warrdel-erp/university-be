import * as libraryCreationService  from "../repository/libraryCreationRepository.js";
import * as libraryStructureRepository  from "../repository/libraryStructureRepository.js";
import sequelize from '../database/sequelizeConfig.js'; 

export async function addLibrary(libraryData, createdBy, updatedBy) {
    const transaction = await sequelize.transaction();

    try {
        // Add library data
        libraryData.createdBy = createdBy;
        libraryData.updatedBy = updatedBy;
        const result =  await libraryCreationService.addLibrary(libraryData, transaction);

        // const libraryCreationId = library.dataValues.libraryCreationId;

        // const libraryCreationId = library?.dataValues?.libraryCreationId;
        // if (!libraryCreationId) throw new Error('libraryCreationId not returned');
        
        // // Add authorities
        // for (const auth of libraryData.authorities) {
        //     await libraryCreationService.addLibraryAuthority({
        //         libraryCreationId,
        //         createdBy,
        //         updatedBy,
        //         ...auth
        //     }, transaction);
        // }

        await transaction.commit();
        return result;
    } catch (error) {
        // Rollback the transaction in case of error
        await transaction.rollback();
        console.error('Error adding library and authorities:', error);
        throw error;
    }
};

export async function getLibraryDetails(universityId) {
    return await libraryCreationService.getLibraryDetails(universityId);
}

export async function getSingleLibraryDetails(libraryCreationId,universityId) {
    return await libraryCreationService.getSingleLibraryDetails(libraryCreationId,universityId);
}

export async function deleteLibray(libraryCreationId) {
    return await libraryCreationService.deleteLibray(libraryCreationId);
}

export async function updateLibrary(libraryCreationId, libraryData, updatedBy) {    
    // const transaction = await sequelize.transaction();

    try {
        // Update library data
        libraryData.updatedBy = updatedBy;
        const result = await libraryCreationService.updateLibrary(libraryCreationId, libraryData);

        // Update authorities 
        // const authorityUpdates = libraryData.authorities.map(auth => {
        //     const { libraryAuthorityId } = auth;
        //     return libraryCreationService.updateLibraryAuthority(libraryAuthorityId, {
        //         updatedBy,
        //         ...auth
        //     }, transaction);
        // });

        // await Promise.all(authorityUpdates);

        // await transaction.commit();
        console.log(`Successfully updated library and authorities.`);
        return result
    } catch (error) {
        // await transaction.rollback();
        console.error('Error updating library and authorities:', error);
        throw error; 
    }
};


export async function addBookWithInventory(bookData, inventoryList, createdBy, updatedBy) {
    const transaction = await sequelize.transaction();

    try {
        bookData.createdBy = createdBy;
        bookData.updatedBy = updatedBy;

        // Create Book First
        const newBook = await libraryCreationService.createBook(bookData, transaction);

        // Insert Inventory Copies
        for (let inv of inventoryList) {
            inv.libraryBookId = newBook.dataValues.libraryBookId;
            await libraryCreationService.createInventory(inv, transaction);
        }

        await transaction.commit();

        return {
            book: newBook,
            inventory: inventoryList.length
        };

    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

export async function getAllBooks(universityId,libraryCreationId) {
    return await libraryCreationService.getAllBooks(universityId,libraryCreationId);
}

export async function getSingleBookDetails(libraryBookId) {
    return await libraryCreationService.getSingleBookDetails(libraryBookId);
};

export async function updateBook(libraryBookId, bookData) {
    return await libraryCreationService.updateBook(libraryBookId, bookData);
}

export async function updateInventory(inventoryId, inventoryData) {

    if (inventoryData.status === "return") {
        inventoryData.issueDate = null;
        inventoryData.status='available';
        inventoryData.dueDate = null;
        inventoryData.studentId = null;
        inventoryData.employeeId = null;
    }

    return await libraryCreationService.updateInventory(inventoryId, inventoryData);
}

export async function deleteBook(libraryBookId) {
    return await libraryCreationService.deleteBook(libraryBookId);
}

export async function deleteInventoryCopy(inventoryId) {
    return await libraryCreationService.deleteInventoryCopy(inventoryId);
}

export async function getAllIssuedBooks() {
    return await libraryCreationService.getAllIssuedBooks();
}


export async function bulkUploadBooks(rows, createdBy, updatedBy) {    
    const errors = [];

    rows.forEach((row, index) => {
        const rowNumber = index + 2; 
        const title = row["title"] || "Unknown";

        // Required fields
        if (!row["title"])
            errors.push({ row: rowNumber, title, error: "title is required" });

        if (!row["authors"])
            errors.push({ row: rowNumber, title, error: "Authors are required" });

        if (!row["isbn"])
            errors.push({ row: rowNumber, title, error: "ISBN is required" });

        // Location fields
        if (!row["Aisle"])
            errors.push({ row: rowNumber, title, error: "Aisle is required" });

        if (!row["Rack"])
            errors.push({ row: rowNumber, title, error: "Rack is required" });

        if (!row["Row"])
            errors.push({ row: rowNumber, title, error: "Row is required" });

        });

    if (errors.length > 0)
        return { status: "error", errors };


    // ----------- 2. LOOKUP VALIDATION (Aisle/Rack/Row Names) -----------
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2;
        const title = row["title"];

        try {
            await libraryStructureRepository.getAisleIdByName(row["Aisle"]);
        } catch {
            return { status: "error", errors: [{ row: rowNumber, title, error: `Aisle '${row["Aisle"]}' not found` }] };
        }

        try {
            await libraryStructureRepository.getRackIdByName(row["Rack"]);
        } catch {
            return { status: "error", errors: [{ row: rowNumber, title, error: `Rack '${row["Rack"]}' not found` }] };
        }

        try {
            await libraryStructureRepository.getRowIdByName(row["Row"]);
        } catch {
            return { status: "error", errors: [{ row: rowNumber, title, error: `Row '${row["Row"]}' not found` }] };
        }

    }


    const t = await sequelize.transaction();

    try {

        // GROUP rows by ISBN
        const grouped = {};
        rows.forEach(r => {
            if (!grouped[r["isbn"]]) grouped[r["isbn"]] = [];
            grouped[r["isbn"]].push(r);
        });

        const summary = [];

        for (const isbn of Object.keys(grouped)) {

            const group = grouped[isbn];
            const first = group[0];

            // ----- BOOK DATA -----
            const bookData = {
                title: first["title"],
                authors: first["authors"],
                publisher: first["publisher"] || null,
                isbn: first["isbn"],
                keywords: first["keywords"] || null,
                additionalAuthor: first["additionalAuthor"] || null,
                createdBy,
                updatedBy
            };

            const book = await libraryCreationService.findOrCreateBook(bookData, t);

            // ----- INVENTORY FOR EACH ROW -----
            for (let row of group) {

                const aisleId = await libraryStructureRepository.getAisleIdByName(row["Aisle"]);
                const rackId  = await libraryStructureRepository.getRackIdByName(row["Rack"]);
                const rowId   = await libraryStructureRepository.getRowIdByName(row["Row"]);

                await libraryCreationService.createInventoryBulk({
                    libraryBookId: book.libraryBookId,
                    barcode: row["Barcode"],
                    libraryAisleId: aisleId,
                    libraryRackId: rackId,
                    libraryRowId: rowId,
                    status: "available",
                    createdBy,
                    updatedBy
                }, t);
            }

            summary.push({
                isbn,
                title: first["title"],
                copies: group.length
            });
        }

        await t.commit();
        return { status: "success", summary };

    } catch (error) {
        await t.rollback();
        return { status: "error", errors: [{ row: "-", title: "-", error: error.message }] };
    }
}