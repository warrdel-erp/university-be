import * as libraryCreationService from "../repository/libraryCreationRepository.js";
import * as libraryStructureRepository from "../repository/libraryStructureRepository.js";
import { splitBulkUploadRow } from "../utility/libraryBulkUploadMapper.js";
import sequelize from "../database/sequelizeConfig.js";

export async function addLibrary(data, createdBy, updatedBy, instituteId, universityId, campusId) {
  const transaction = await sequelize.transaction();

  try {
    // 1. Create Library
    const library = await libraryStructureRepository.createLibrary(
      {
        instituteId: data.instituteId,
        name: data.name,
        description: data.description,
        createdBy,
        updatedBy,
      },
      transaction,
    );

    // 2. Create Floors
    for (const floor of data.floors) {
      await libraryStructureRepository.createFloor(
        {
          libraryCreationId: library.libraryCreationId,
          instituteId: data.instituteId,
          name: floor.name,
          description: floor.description || null,
          createdBy,
          updatedBy,
          instituteId,
          universityId,
          campusId,
        },
        transaction,
      );
    }

    await transaction.commit();
    return library;
  } catch (error) {
    await transaction.rollback();
    console.error("Service Error:", error);
    throw error;
  }
}

export async function getLibraryDetails(universityId) {
  return await libraryCreationService.getLibraryDetails(universityId);
}

export async function getSingleLibraryDetails(libraryCreationId, universityId) {
  return await libraryCreationService.getSingleLibraryDetails(libraryCreationId, universityId);
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
    return result;
  } catch (error) {
    // await transaction.rollback();
    console.error("Error updating library and authorities:", error);
    throw error;
  }
}


export async function addBookWithInventory(bookData, inventoryList, createdBy, updatedBy) {
  const transaction = await sequelize.transaction();

  try {
    // bookData already validated by zod
    const newBook = await libraryCreationService.createBook(
      {
        ...bookData,
        createdBy,
        updatedBy,
      },
      transaction
    );

    for (const inv of inventoryList) {
      await libraryCreationService.createInventory(
        {
          libraryBookId: newBook.libraryBookId,
          excisionNumber: inv.excisionNumber ?? null,
          libraryAisleId: inv.libraryAisleId,
          libraryRackId: inv.libraryRackId,
          libraryRowId: inv.libraryRowId,
          status: inv.status ?? "available",
          studentId: inv.studentId ?? null,
          employeeId: inv.employeeId ?? null,
          issueDate: inv.issueDate ?? null,
          dueDate: inv.dueDate ?? null,
          billNo: inv.billNo ?? null,
          billDate: inv.billDate ?? null,
          itemPrice: inv.itemPrice ?? null,
          netPrice: inv.netPrice ?? null,
          currency: inv.currency ?? null,
        },
        transaction,
      );
    }

    await transaction.commit();

    return { libraryBookId: newBook.libraryBookId };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function getAllBooks(universityId, libraryCreationId, libraryFloorId) {
  return await libraryCreationService.getAllBooks(universityId, libraryCreationId, libraryFloorId);
}

export async function getSingleBookDetails(libraryBookId, transaction) {
  return await libraryCreationService.getSingleBookDetails(libraryBookId, transaction);
}

export async function updateBook(libraryBookId, bookData, transaction) {
  return await libraryCreationService.updateBook(libraryBookId, bookData, transaction);
}

export async function updateInventory(inventoryId, inventoryData, transaction) {
  if (inventoryData.status === "return") {
    inventoryData.issueDate = null;
    inventoryData.status = "available";
    inventoryData.dueDate = null;
    inventoryData.studentId = null;
    inventoryData.employeeId = null;
  }

  return await libraryCreationService.updateInventory(inventoryId, inventoryData, transaction);
}

export async function createInventory(inventoryData, transaction) {
  return await libraryCreationService.createInventory(inventoryData, transaction);
}

export async function deleteBook(libraryBookId) {
  return await libraryCreationService.deleteBook(libraryBookId);
}

export async function deleteInventoryCopy(inventoryId) {
  return await libraryCreationService.deleteInventoryCopy(inventoryId);
}

export async function getLibraryBookIdByInventoryId(inventoryId, transaction) {
  return await libraryCreationService.getLibraryBookIdByInventoryId(inventoryId, transaction);
}

function toPlainBook(bookRow) {
  return bookRow ? bookRow.get({ plain: true }) : null;
}

async function resolveLibraryBookId(book, inventory, transaction) {
  if (book?.libraryBookId) {
    return book.libraryBookId;
  }

  for (const inv of inventory) {
    if (inv.libraryBookId) {
      return inv.libraryBookId;
    }
    if (inv.inventoryId) {
      const id = await libraryCreationService.getLibraryBookIdByInventoryId(
        inv.inventoryId,
        transaction,
      );
      if (id) {
        return id;
      }
    }
  }

  return null;
}

async function upsertInventoryRows(inventory, libraryBookId, userId, transaction) {
  const results = [];

  for (const inv of inventory) {
    if (inv.inventoryId) {
      const { inventoryId, ...inventoryData } = inv;
      inventoryData.updatedBy = userId;
      const result = await updateInventory(inventoryId, inventoryData, transaction);
      results.push({ action: "updated", inventoryId, result });
      continue;
    }

    const created = await libraryCreationService.createInventory(
      {
        ...inv,
        libraryBookId: inv.libraryBookId ?? libraryBookId,
        createdBy: userId,
        updatedBy: userId,
      },
      transaction,
    );

    results.push({
      action: "created",
      inventoryId: created?.dataValues?.inventoryId ?? created?.inventoryId,
      result: created,
    });
  }

  return results;
}

export async function updateBookWithInventory(
  { book, inventory, inventoryKeyPresent },
  userId,
) {
  const transaction = await sequelize.transaction();

  try {
    const response = {};
    let libraryBookId = book?.libraryBookId ?? null;

    if (book) {
      const { libraryBookId: bookId, ...bookData } = book;
      libraryBookId = bookId;
      bookData.updatedBy = userId;
      await libraryCreationService.updateBook(bookId, bookData, transaction);
    }

    if (inventoryKeyPresent) {
      libraryBookId ??= await resolveLibraryBookId(book, inventory ?? [], transaction);

      if (inventory?.length) {
        response.inventory = await upsertInventoryRows(
          inventory,
          libraryBookId,
          userId,
          transaction,
        );
      }
    }

    const includeBook = Boolean(book) || (inventoryKeyPresent && libraryBookId);
    if (includeBook && libraryBookId) {
      response.book = toPlainBook(
        await libraryCreationService.getSingleBookDetails(libraryBookId, transaction),
      );
    }

    await transaction.commit();
    return response;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function getAllIssuedBooks() {
  return await libraryCreationService.getAllIssuedBooks();
}

function buildUploadError(rowNumber, text) {
  return `Row ${rowNumber}: ${text}`;
}

export async function bulkUploadBooks(rows, createdBy, updatedBy, libraryCreationId) {
  const errors = [];
  const parsedRows = rows.map((row, index) => ({
    rowNumber: index + 2,
    ...splitBulkUploadRow(row),
  }));

  for (const item of parsedRows) {
    for (let i = 0; i < item.unknownKeys.length; i++) {
      errors.push(buildUploadError(item.rowNumber, `Unknown column '${item.unknownKeys[i]}'`));
    }

    for (let i = 0; i < item.typeErrors.length; i++) {
      errors.push(buildUploadError(item.rowNumber, item.typeErrors[i]));
    }

    if (!item.book.isbn) {
      errors.push(buildUploadError(item.rowNumber, "isbn is required"));
    }
    if (!item.inventory.excisionNumber) {
      errors.push(buildUploadError(item.rowNumber, "excisionNumber is required"));
    }
    if (!item.location.aisleName) {
      errors.push(buildUploadError(item.rowNumber, "Aisle is required"));
    }
    if (!item.location.rackName) {
      errors.push(buildUploadError(item.rowNumber, "Rack is required"));
    }
    if (!item.location.rowName) {
      errors.push(buildUploadError(item.rowNumber, "Row is required"));
    }
  }

  if (errors.length > 0) {
    return { status: "error", message: errors.join("; ") };
  }

  const isbnCache = {};
  const transaction = await sequelize.transaction();

  try {
    for (const item of parsedRows) {
      const { rowNumber, book, inventory, location } = item;
      const isbn = String(book.isbn).trim();

      let libraryBookId = isbnCache[isbn];

      if (!libraryBookId) {
        const existingBook = await libraryCreationService.findBookByIsbn(isbn, transaction);
        if (existingBook) {
          libraryBookId = existingBook.libraryBookId;
        }
      }

      const isNewBook = !libraryBookId;

      if (isNewBook) {
        if (!book.title) {
          throw new Error(`Row ${rowNumber}: title is required for new book (ISBN ${isbn})`);
        }
        if (!book.authors) {
          throw new Error(`Row ${rowNumber}: authors are required for new book (ISBN ${isbn})`);
        }

        const newBook = await libraryCreationService.createBook(
          {
            ...book,
            isbn,
            libraryCreationId: book.libraryCreationId || libraryCreationId || null,
            createdBy,
            updatedBy,
          },
          transaction,
        );

        libraryBookId = newBook.libraryBookId;
      }

      isbnCache[isbn] = libraryBookId;

      const aisleId = await libraryStructureRepository.getAisleIdByName(location.aisleName);
      const rackId = await libraryStructureRepository.getRackIdByName(location.rackName);
      const rowId = await libraryStructureRepository.getRowIdByName(location.rowName);

      await libraryCreationService.createInventoryBulk(
        {
          ...inventory,
          libraryBookId,
          libraryAisleId: aisleId,
          libraryRackId: rackId,
          libraryRowId: rowId,
          status: inventory.status || "available",
        },
        transaction,
      );
    }

    await transaction.commit();
    return { status: "success" };
  } catch (error) {
    await transaction.rollback();
    return { status: "error", message: error.message };
  }
}
