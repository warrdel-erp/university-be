import * as libraryCreationService from "../repository/libraryCreationRepository.js";
import * as libraryStructureRepository from "../repository/libraryStructureRepository.js";
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

export async function deleteInventoryCopiesForBookExceptIds(
  libraryBookId,
  keepInventoryIds,
  transaction,
) {
  return await libraryCreationService.deleteInventoryCopiesForBookExceptIds(
    libraryBookId,
    keepInventoryIds,
    transaction,
  );
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

/** Client sent `inventory: []` → remove all copies; sent ids → remove copies not listed. */
async function syncInventoryCopies(libraryBookId, inventory, transaction) {
  if (inventory.length === 0) {
    return libraryCreationService.deleteInventoryCopiesForBookExceptIds(
      libraryBookId,
      [],
      transaction,
    );
  }

  const keepIds = [...new Set(inventory.map((inv) => inv.inventoryId).filter(Boolean))];
  if (keepIds.length === 0) {
    return 0;
  }

  return libraryCreationService.deleteInventoryCopiesForBookExceptIds(
    libraryBookId,
    keepIds,
    transaction,
  );
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

      if (libraryBookId) {
        const removedCount = await syncInventoryCopies(
          libraryBookId,
          inventory ?? [],
          transaction,
        );
        if (removedCount > 0) {
          response.removedInventoryCount = removedCount;
        }
      }

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

export async function bulkUploadBooks(rows, createdBy, updatedBy) {
  const errors = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const title = row["title"] || "Unknown";

    // Required fields
    if (!row["title"]) errors.push({ row: rowNumber, title, error: "title is required" });

    if (!row["authors"]) errors.push({ row: rowNumber, title, error: "Authors are required" });

    if (!row["isbn"]) errors.push({ row: rowNumber, title, error: "ISBN is required" });

    // Location fields
    if (!row["Aisle"]) errors.push({ row: rowNumber, title, error: "Aisle is required" });

    if (!row["Rack"]) errors.push({ row: rowNumber, title, error: "Rack is required" });

    if (!row["Row"]) errors.push({ row: rowNumber, title, error: "Row is required" });
  });

  if (errors.length > 0) return { status: "error", errors };

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
    rows.forEach((r) => {
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
        barcode: first["Barcode"] || null,
        keywords: first["keywords"] || null,
        additionalAuthor: first["additionalAuthor"] || null,
        createdBy,
        updatedBy,
      };

      const book = await libraryCreationService.findOrCreateBook(bookData, t);

      // ----- INVENTORY FOR EACH ROW -----
      for (let row of group) {
        const aisleId = await libraryStructureRepository.getAisleIdByName(row["Aisle"]);
        const rackId = await libraryStructureRepository.getRackIdByName(row["Rack"]);
        const rowId = await libraryStructureRepository.getRowIdByName(row["Row"]);

        await libraryCreationService.createInventoryBulk(
          {
            libraryBookId: book.libraryBookId,
            excisionNumber: row["ExcisionNumber"] || row["Barcode"],
            libraryAisleId: aisleId,
            libraryRackId: rackId,
            libraryRowId: rowId,
            status: "available",
            createdBy,
            updatedBy,
          },
          t,
        );
      }

      summary.push({
        isbn,
        title: first["title"],
        copies: group.length,
      });
    }

    await t.commit();
    return { status: "success", summary };
  } catch (error) {
    await t.rollback();
    return { status: "error", errors: [{ row: "-", title: "-", error: error.message }] };
  }
}
