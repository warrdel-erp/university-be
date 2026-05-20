import * as libraryCreationService from "../repository/libraryCreationRepository.js";
import * as libraryStructureRepository from "../repository/libraryStructureRepository.js";
import sequelize from "../database/sequelizeConfig.js";

const BOOK_FIELDS = [
  "libraryCreationId", "libraryFloorId", "title", "subtitle", "authors", "publisher",
  "placeOfPublication", "yearOfPublication", "edition", "seriesTitle", "volumeNumber",
  "language", "isbn", "issn", "barcode", "physicalDescription", "numberOfPages",
  "illustrations", "summary", "keywords", "additionalAuthor", "subjectId",
  "classSectionsId", "remark", "itemType", "categoryId", "bookImage",
];

const INVENTORY_FIELDS = [
  "accessionNumber", "libraryAisleId", "libraryRackId", "libraryRowId", "studentId",
  "employeeId", "issueDate", "dueDate", "status", "billNo", "billDate",
  "itemPrice", "netPrice", "currency", "condition"
];

const NUMBER_FIELDS = [
  "libraryCreationId", "libraryFloorId", "yearOfPublication", "numberOfPages",
  "classSectionsId", "libraryAisleId", "libraryRackId", "libraryRowId",
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
  if (field === "categoryId" || field === "subjectId") {
    const parseToken = (value) => {
      const text = String(value).trim();
      if (!text) return null;
      if (/^\d+$/.test(text)) return Number(text);
      return text;
    };

    if (Array.isArray(raw)) {
      return raw.map(parseToken).filter((value) => value !== null);
    }
    if (typeof raw === "string") {
      return raw
        .split(",")
        .map(parseToken)
        .filter((value) => value !== null);
    }
    const parsed = parseToken(raw);
    return parsed === null ? [] : [parsed];
  }
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
  if (!inventory.accessionNumber) errors.push("accessionNumber is required");

  return { book, inventory, location, errors };
}

function parseIdArray(value) {
  const toValidIds = (nums) =>
    nums.map(Number).filter((n) => !Number.isNaN(n) && n > 0);

  if (value == null) return [];
  if (Array.isArray(value)) {
    return toValidIds(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return toValidIds(parsed);
      }
      if (parsed != null) {
        return toValidIds([parsed]);
      }
    } catch {
      // fall through to comma-separated parsing
    }
    return toValidIds(trimmed.split(","));
  }
  return toValidIds([value]);
}

function formatInventoryForResponse(inv) {
  if (!inv) return null;

  return {
    inventoryId: inv.inventoryId,
    libraryBookId: inv.libraryBookId,
    accessionNumber: inv.accessionNumber ?? null,
    billNo: inv.billNo ?? null,
    billDate: inv.billDate ?? null,
    itemPrice: inv.itemPrice ?? null,
    netPrice: inv.netPrice ?? null,
    currency: inv.currency ?? null,
    libraryAisleId: inv.libraryAisleId ?? null,
    libraryRackId: inv.libraryRackId ?? null,
    libraryRowId: inv.libraryRowId ?? null,
    studentId: inv.studentId ?? null,
    employeeId: inv.employeeId ?? null,
    issueDate: inv.issueDate ?? null,
    dueDate: inv.dueDate ?? null,
    status: inv.status ?? null,
    condition: inv.condition ?? null,
    aisleDetails: inv.aisleDetails ?? null,
    rackDetails: inv.rackDetails ?? null,
    rowDetails: inv.rowDetails ?? null,
    studentDetailsBook: inv.studentDetailsBook ?? null,
    employeeDetailsBook: inv.employeeDetailsBook ?? null,
  };
}

function formatBookForResponse(book) {
  const {
    categoryId: _categoryId,
    subjectId: _subjectId,
    categoryNames: _categoryNames,
    subjectNames: _subjectNames,
    inventoryCopies,
    ...bookFields
  } = book;

  return {
    ...bookFields,
    categories: book.categories ?? [],
    subjects: book.subjects ?? [],
    inventoryCopies: (inventoryCopies ?? []).map(formatInventoryForResponse),
  };
}

function pickAisleDetails(aisle) {
  if (!aisle) return null;
  return {
    libraryAisleId: aisle.libraryAisleId,
    name: aisle.name,
    libraryFloorId: aisle.libraryFloorId,
  };
}

function pickRackDetails(rack) {
  if (!rack) return null;
  return {
    libraryRackId: rack.libraryRackId,
    name: rack.name,
  };
}

function pickRowDetails(row) {
  if (!row) return null;
  return {
    libraryRowId: row.libraryRowId,
    name: row.name,
  };
}

function mapBooksToAllBookList(enrichedBooks) {
  return enrichedBooks.map((book) => {
    const copies = book.inventoryCopies ?? [];
    const firstCopy = copies[0] ?? null;

    const accessionNumber = [
      ...new Set(
        copies
          .map((inv) => inv.accessionNumber)
          .filter((value) => value != null && value !== ""),
      ),
    ];

    return {
      libraryBookId: book.libraryBookId,
      libraryCreationId: book.libraryCreationId ?? null,
      title: book.title ?? null,
      author: book.authors ?? null,
      authors: book.authors ?? null,
      categories: book.categories ?? [],
      subjects: book.subjects ?? [],
      accessionNumber,
      status: firstCopy?.status ?? null,
      condition: firstCopy?.condition ?? null,
      aisleDetails: pickAisleDetails(firstCopy?.aisleDetails),
      rackDetails: pickRackDetails(firstCopy?.rackDetails),
      rowDetails: pickRowDetails(firstCopy?.rowDetails),
      inventoryCopies: copies,
    };
  });
}

function filterBooksByFloor(books, libraryFloorId) {
  if (!libraryFloorId) return books;

  const floorId = Number(libraryFloorId);
  return books
    .map((book) => ({
      ...book,
      inventoryCopies: (book.inventoryCopies || []).filter(
        (inv) => Number(inv.aisleDetails?.libraryFloorId) === floorId,
      ),
    }))
    .filter((book) => book.inventoryCopies.length > 0);
}

export async function addCategory(data) {
  return await libraryCreationService.addCategory(data);
}

export async function getAllCategories(instituteId) {
  return await libraryCreationService.getAllCategories(instituteId);
}

export async function updateCategory(libraryCategoryId, data) {
  return await libraryCreationService.updateCategory(libraryCategoryId, data);
}

export async function deleteCategory(libraryCategoryId) {
  const transaction = await sequelize.transaction();
  const categoryId = Number(libraryCategoryId);

  try {
    const books = await libraryCreationService.findBooksContainingCategoryId(
      categoryId,
      transaction,
    );

    for (const book of books) {
      const updatedCategoryIds = parseIdArray(book.categoryId).filter((id) => id !== categoryId);

      await libraryCreationService.updateBook(
        book.libraryBookId,
        { categoryId: updatedCategoryIds.length ? updatedCategoryIds : null },
        transaction,
      );
    }

    const deleted = await libraryCreationService.deleteCategory(categoryId, transaction);
    if (!deleted) {
      await transaction.rollback();
      return false;
    }

    await transaction.commit();
    return true;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
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
          accessionNumber: inv.accessionNumber ?? null,
          libraryAisleId: inv.libraryAisleId,
          libraryRackId: inv.libraryRackId,
          libraryRowId: inv.libraryRowId,
          status: inv.status ?? "available",
          studentId: inv.studentId ?? null,
          employeeId: inv.employeeId ?? null,
          issueDate: inv.issueDate ?? null,
          dueDate: inv.dueDate ?? null,
          billNo: inv.billNo ??  null,
          billDate: inv.billDate == "" ? null : inv.billDate,
          itemPrice: inv.itemPrice ?? null,
          netPrice: inv.netPrice ?? null,
          currency: inv.currency ?? null,
          condition: inv.condition ?? null,
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

async function enrichBooksWithCategoriesAndSubjects(books) {
  if (!books || books.length === 0) return books;

  const categoryIds = new Set();
  const subjectIds = new Set();

  for (const book of books) {
    const rawBook = book.get ? book.get({ plain: true }) : book;

    parseIdArray(rawBook.categoryId).forEach((id) => categoryIds.add(id));
    parseIdArray(rawBook.subjectId).forEach((id) => subjectIds.add(id));
  }

  const [categories, subjects] = await Promise.all([
    libraryCreationService.getCategoriesByIds(Array.from(categoryIds)),
    libraryCreationService.getSubjectsByIds(Array.from(subjectIds))
  ]);

  const categoryMap = {};
  categories.forEach(c => {
    categoryMap[c.libraryCategoryId] = c.name;
  });

  const subjectMap = {};
  subjects.forEach(s => {
    subjectMap[s.subjectId] = s.subjectName;
  });

  return books.map((book) => {
    const rawBook = book.get ? book.get({ plain: true }) : book;

    const catList = [];
    for (const id of parseIdArray(rawBook.categoryId)) {
      if (categoryMap[id]) {
        catList.push({ libraryCategoryId: id, name: categoryMap[id] });
      }
    }

    const subList = [];
    for (const id of parseIdArray(rawBook.subjectId)) {
      if (subjectMap[id]) {
        subList.push({ subjectId: id, subjectName: subjectMap[id] });
      }
    }

    return formatBookForResponse({
      ...rawBook,
      categories: catList,
      subjects: subList,
    });
  });
}

export async function getAllBooks(universityId, libraryCreationId, libraryFloorId) {
  const books = await libraryCreationService.getAllBooks(
    universityId,
    libraryCreationId,
    libraryFloorId,
  );

  if (!books?.length) return [];

  const enrichedBooks = await enrichBooksWithCategoriesAndSubjects(books);
  const filtered = filterBooksByFloor(enrichedBooks, libraryFloorId);
  return mapBooksToAllBookList(filtered);
}

export async function getSingleBookDetails(libraryBookId, transaction) {
  const bookRow = await libraryCreationService.getSingleBookDetails(libraryBookId, transaction);
  if (!bookRow) return null;
  const enriched = await enrichBooksWithCategoriesAndSubjects([bookRow]);
  return enriched[0];
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
    let bookRow = null;
    if (includeBook && libraryBookId) {
      bookRow = await libraryCreationService.getSingleBookDetails(libraryBookId, transaction);
    }

    await transaction.commit();

    if (bookRow) {
      const enriched = await enrichBooksWithCategoriesAndSubjects([bookRow]);
      response.book = enriched[0];
    }

    return response;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function getAllIssuedBooks() {
  const issuedInventories = await libraryCreationService.getAllIssuedBooks();
  const plainInventories = [];
  const books = [];

  for (const inv of issuedInventories) {
    const plainInv = inv.get({ plain: true });
    if (plainInv.bookDetails) {
      books.push(plainInv.bookDetails);
    }
    plainInventories.push(plainInv);
  }

  if (books.length > 0) {
    const enrichedBooks = await enrichBooksWithCategoriesAndSubjects(books);
    const enrichedMap = {};
    enrichedBooks.forEach(b => {
      enrichedMap[b.libraryBookId] = b;
    });

    for (const inv of plainInventories) {
      if (inv.bookDetails) {
        inv.bookDetails = enrichedMap[inv.bookDetails.libraryBookId];
      }
    }
  }

  return plainInventories;
}

function buildUploadError(rowNumber, text) {
  return `Row ${rowNumber}: ${text}`;
}

function getBookCacheKey(book) {
  if (book.isbn) return `isbn:${book.isbn}`;
  return `title:${book.title.toLowerCase()}`;
}

function splitIdsAndNames(values) {
  const rawValues = Array.isArray(values) ? values : values == null ? [] : [values];
  const ids = [];
  const names = [];

  for (const value of rawValues) {
    if (value == null) continue;
    if (typeof value === "number" && !Number.isNaN(value)) {
      ids.push(value);
      continue;
    }

    const text = String(value).trim();
    if (!text) continue;

    const parts = text.split(",").map((item) => item.trim()).filter(Boolean);
    for (const part of parts) {
      if (/^\d+$/.test(part)) {
        ids.push(Number(part));
        continue;
      }
      names.push(part);
    }
  }

  return {
    ids: [...new Set(ids)],
    names: [...new Set(names)],
  };
}

async function resolveIdsByName(
  values,
  rowNumber,
  fieldName,
  fetchByNames,
  nameKey,
  idKey,
) {
  const { ids, names } = splitIdsAndNames(values);
  if (names.length === 0) {
    return ids;
  }

  const rows = await fetchByNames(names);
  const idByName = new Map(
    rows.map((row) => {
      const plain = row.get ? row.get({ plain: true }) : row;
      return [String(plain[nameKey]).toLowerCase(), plain[idKey]];
    }),
  );

  for (const name of names) {
    const resolvedId = idByName.get(name.toLowerCase());
    if (!resolvedId) {
      throw new Error(buildUploadError(rowNumber, `${fieldName} name '${name}' not found`));
    }
    ids.push(resolvedId);
  }

  return [...new Set(ids)];
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
      rowNumber,
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
    for (const { rowNumber, book, inventory, location } of parsedRows) {
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
          const resolvedSubjectIds = await resolveIdsByName(
            book.subjectId,
            rowNumber,
            "subjectId",
            libraryCreationService.getSubjectsByNames,
            "subjectName",
            "subjectId",
          );

          const resolvedCategoryIds = await resolveIdsByName(
            book.categoryId,
            rowNumber,
            "categoryId",
            libraryCreationService.getCategoriesByNames,
            "name",
            "libraryCategoryId",
          );

          const newBook = await libraryCreationService.createBook(
            {
              ...book,
              isbn: book.isbn ?? null,
              subjectId: resolvedSubjectIds.length ? resolvedSubjectIds : null,
              categoryId: resolvedCategoryIds.length ? resolvedCategoryIds : null,
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

      let libraryAisleId = null;
      let libraryRackId = null;
      let libraryRowId = null;

      if (location.aisleName) {
        libraryAisleId = await libraryStructureRepository.getAisleIdByName(location.aisleName);
      }
      if (location.rackName) {
        libraryRackId = await libraryStructureRepository.getRackIdByName(location.rackName);
      }
      if (location.rowName) {
        libraryRowId = await libraryStructureRepository.getRowIdByName(location.rowName);
      }

      await libraryCreationService.createInventoryBulk(
        {
          ...inventory,
          libraryBookId,
          libraryAisleId,
          libraryRackId,
          libraryRowId,
          status: inventory.status ?? "available",
          condition: inventory.condition ?? null,
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
