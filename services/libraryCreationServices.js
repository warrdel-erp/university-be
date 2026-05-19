import * as libraryCreationService from "../repository/libraryCreationRepository.js";
import * as libraryStructureRepository from "../repository/libraryStructureRepository.js";
import sequelize from "../database/sequelizeConfig.js";

const BOOK_FIELDS = [
  "libraryCreationId", "libraryFloorId", "title", "subtitle", "authors", "publisher",
  "placeOfPublication", "yearOfPublication", "edition", "seriesTitle", "volumeNumber",
  "language", "isbn", "issn", "barcode", "physicalDescription", "numberOfPages",
  "illustrations", "summary", "keywords", "additionalAuthor", "subjectId",
  "classSectionsId", "remark", "itemType",
];

const INVENTORY_FIELDS = [
  "excisionNumber", "libraryAisleId", "libraryRackId", "libraryRowId", "studentId",
  "employeeId", "issueDate", "dueDate", "status", "billNo", "billDate",
  "itemPrice", "netPrice", "currency",
];

const NUMBER_FIELDS = [
  "libraryCreationId", "libraryFloorId", "yearOfPublication", "numberOfPages",
  "subjectId", "classSectionsId", "libraryAisleId", "libraryRackId", "libraryRowId",
  "studentId", "employeeId", "itemPrice", "netPrice",
];

const LOCATION_MAP = { aisle: "aisleName", rack: "rackName", row: "rowName" };

const DEFAULTS = { itemType: "print", status: "available", illustrations: false };

const normBulkKey = (key) => String(key).trim().toLowerCase().replace(/\s+/g, "");

const matchBulkField = (key, fields) => {
  const n = normBulkKey(key);
  for (let i = 0; i < fields.length; i++) {
    if (normBulkKey(fields[i]) === n) return fields[i];
  }
  return null;
};

function parseBulkCell(raw, field) {
  if (raw === undefined || raw === null || raw === "") {
    return DEFAULTS[field] !== undefined ? DEFAULTS[field] : null;
  }
  if (NUMBER_FIELDS.includes(field)) return Number(raw);
  if (field === "illustrations") {
    if (raw === true || raw === false) return raw;
    const t = String(raw).toLowerCase();
    if (t === "true" || t === "1") return true;
    if (t === "false" || t === "0") return false;
  }
  if (field === "isbn" || field === "title") {
    const text = String(raw).trim();
    return text === "" ? null : text;
  }
  return raw;
}

function getBulkTypeError(field, value) {
  if (NUMBER_FIELDS.includes(field) && Number.isNaN(Number(value))) {
    return `${field} must be a number`;
  }
  if (field === "itemType" && value && !["print", "Xerox", "Digital"].includes(value)) {
    return "itemType must be print, Xerox or Digital";
  }
  return null;
}

function applyBulkDefaults(target, fields) {
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    if (target[field] === undefined && DEFAULTS[field] !== undefined) {
      target[field] = DEFAULTS[field];
    }
  }
}

function splitBulkUploadRow(row) {
  const book = {};
  const inventory = {};
  const location = {};
  const errors = [];

  for (const [rawKey, rawValue] of Object.entries(row)) {
    const locField = LOCATION_MAP[normBulkKey(rawKey)];
    if (locField) {
      if (rawValue !== undefined && rawValue !== null && rawValue !== "") {
        location[locField] = String(rawValue).trim();
      }
      continue;
    }

    const bookField = matchBulkField(rawKey, BOOK_FIELDS);
    if (bookField) {
      const value = parseBulkCell(rawValue, bookField);
      if (value === null) continue;
      const err = getBulkTypeError(bookField, value);
      if (err) {
        errors.push(err);
        continue;
      }
      book[bookField] = value;
      continue;
    }

    const invField = matchBulkField(rawKey, INVENTORY_FIELDS);
    if (invField) {
      const value = parseBulkCell(rawValue, invField);
      if (value === null) continue;
      const err = getBulkTypeError(invField, value);
      if (err) {
        errors.push(err);
        continue;
      }
      inventory[invField] = value;
      continue;
    }

    if (rawValue !== undefined && rawValue !== null && rawValue !== "") {
      errors.push(`Unknown column '${rawKey}'`);
    }
  }

  applyBulkDefaults(book, BOOK_FIELDS);
  applyBulkDefaults(inventory, INVENTORY_FIELDS);

  if (!book.isbn && !book.title) errors.push("isbn or title is required");
  if (!inventory.excisionNumber) errors.push("excisionNumber is required");
  if (!location.aisleName) errors.push("Aisle is required");
  if (!location.rackName) errors.push("Rack is required");
  if (!location.rowName) errors.push("Row is required");

  return { book, inventory, location, errors };
}

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

function getBookCacheKey(book) {
  if (book.isbn) return `isbn:${book.isbn}`;
  return `title:${book.title.toLowerCase()}`;
}

export async function bulkUploadBooks(rows, createdBy, updatedBy, libraryCreationId) {
  const parsedRows = [];
  const errors = [];

  for (let index = 0; index < rows.length; index++) {
    const rowNumber = index + 2;
    const parsed = splitBulkUploadRow(rows[index]);

    for (let i = 0; i < parsed.errors.length; i++) {
      errors.push(buildUploadError(rowNumber, parsed.errors[i]));
    }

    parsedRows.push({
      book: parsed.book,
      inventory: parsed.inventory,
      location: parsed.location,
    });
  }

  if (errors.length > 0) {
    return { status: "error", message: errors.join("; ") };
  }

  const bookCache = {};
  const transaction = await sequelize.transaction();

  try {
    for (const { book, inventory, location } of parsedRows) {
      const cacheKey = getBookCacheKey(book);

      let libraryBookId = bookCache[cacheKey];

      if (!libraryBookId) {
        const existingBook = book.isbn
          ? await libraryCreationService.findBookByIsbn(book.isbn, transaction)
          : await libraryCreationService.findBookByTitle(
              book.title,
              book.libraryCreationId || libraryCreationId || null,
              transaction,
            );

        if (existingBook) {
          libraryBookId = existingBook.libraryBookId;
        } else {
          const newBook = await libraryCreationService.createBook(
            {
              ...book,
              isbn: book.isbn ?? null,
              libraryCreationId: book.libraryCreationId || libraryCreationId || null,
              createdBy,
              updatedBy,
            },
            transaction,
          );
          libraryBookId = newBook.libraryBookId;
        }
      }

      bookCache[cacheKey] = libraryBookId;

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
          status: inventory.status,
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
