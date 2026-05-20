import * as libraryCreationService from "../repository/libraryCreationRepository.js";
import * as libraryStructureRepository from "../repository/libraryStructureRepository.js";
import sequelize from "../database/sequelizeConfig.js";
import { parseCustomDate } from "../utility/dateFormat.js";

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

const DATE_FIELDS = ["billDate", "issueDate", "dueDate"];

const LOCATION_MAP = { aisle: "aisleName", rack: "rackName", row: "rowName" };

const DEFAULTS = { itemType: "print", status: "available", illustrations: false };

const normBulkKey = (key) =>
  String(key)
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");

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
  if (field === "accessionNumber") {
    const text = String(raw).trim();
    return text === "" ? null : text;
  }
  if (DATE_FIELDS.includes(field)) {
    return parseCustomDate(raw);
  }
  return raw;
}

function getBulkTypeError(field, value, rawValue) {
  if (NUMBER_FIELDS.includes(field) && Number.isNaN(Number(value))) {
    return `${field} must be a number`;
  }
  if (DATE_FIELDS.includes(field) && !isBulkCellEmpty(rawValue) && value === null) {
    return `${field} has invalid date format`;
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

function isBulkCellEmpty(rawValue) {
  return rawValue === undefined || rawValue === null || String(rawValue).trim() === "";
}

function normalizeBulkUploadRow(row) {
  const normalized = {};
  for (const [rawKey, rawValue] of Object.entries(row)) {
    const cleanKey = String(rawKey).replace(/^\uFEFF/, "").trim();
    if (!cleanKey || cleanKey.startsWith("__EMPTY")) {
      continue;
    }
    normalized[cleanKey] = rawValue;
  }
  return normalized;
}

/** Skip fully empty Excel rows; first row is always the header (handled by sheet_to_json). */
function isBulkRowEmpty(row) {
  if (row == null || typeof row !== "object" || Array.isArray(row)) {
    return true;
  }
  const normalized = normalizeBulkUploadRow(row);
  const values = Object.values(normalized);
  if (values.length === 0) {
    return true;
  }
  return values.every((value) => isBulkCellEmpty(value));
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
      const err = getBulkTypeError(bookField, value, rawValue);
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
      if (value === null && isBulkCellEmpty(rawValue)) continue;
      const err = getBulkTypeError(invField, value, rawValue);
      if (err) {
        errors.push(err);
        continue;
      }
      inventory[invField] = value;
      continue;
    }

    // Unknown columns are ignored so extra Excel headers do not fail the upload.
  }

  applyBulkDefaults(book, BOOK_FIELDS);
  applyBulkDefaults(inventory, INVENTORY_FIELDS);

  if (!book.title) errors.push("title is required");
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
      inventoryCopies: (book.inventoryCopies || []).filter((inv) => {
        const invFloorId = inv.aisleDetails?.libraryFloorId;
        // Bulk-uploaded copies often have no aisle; show them on any floor view.
        if (invFloorId == null) return true;
        return Number(invFloorId) === floorId;
      }),
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

export async function getAllBooks(
  universityId,
  libraryCreationId,
  libraryFloorId,
  pagination = {},
  filters = {},
) {
  const page = pagination.page ?? 1;
  const rawLimit = pagination.limit ?? 20;
  const limit = Math.min(100, Math.max(1, rawLimit));
  const offset = (page - 1) * limit;

  const { rows, count } = await libraryCreationService.getAllBooks(
    universityId,
    libraryCreationId,
    libraryFloorId,
    { limit, offset },
    filters,
  );

  if (!rows?.length) {
    return { books: [], total: count, page, limit };
  }

  const enrichedBooks = await enrichBooksWithCategoriesAndSubjects(rows);
  const filtered = filterBooksByFloor(enrichedBooks, libraryFloorId);

  return {
    books: mapBooksToAllBookList(filtered),
    total: count,
    page,
    limit,
  };
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

// Bulk upload limits — validated before DB work to avoid long-running requests.
const BULK_UPLOAD_BATCH_SIZE = 500;
const BULK_UPLOAD_MAX_ROWS = 50000;

function formatBulkUploadErrors(errors) {
  const totalErrors = errors.length;
  const shown = errors.slice(0, 50);
  let message = shown.join("; ");
  if (totalErrors > 50) {
    message += `; ... and ${totalErrors - 50} more error(s)`;
  }
  return { status: "error", message, totalErrors };
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Caches aisle/rack/row lookups — previously each row hit DB up to 3 times
 * for the same location names.
 */
async function getCachedLocationId(name, cache, fetchByName) {
  const key = String(name).trim().toLowerCase();
  if (cache.has(key)) {
    return cache.get(key);
  }
  const id = await fetchByName(name);
  cache.set(key, id);
  return id;
}

async function resolveBulkUploadLocationIds(location, aisleCache, rackCache, rowCache) {
  let libraryAisleId = null;
  let libraryRackId = null;
  let libraryRowId = null;

  if (location.aisleName) {
    libraryAisleId = await getCachedLocationId(
      location.aisleName,
      aisleCache,
      libraryStructureRepository.getAisleIdByName,
    );
  }
  if (location.rackName) {
    libraryRackId = await getCachedLocationId(
      location.rackName,
      rackCache,
      libraryStructureRepository.getRackIdByName,
    );
  }
  if (location.rowName) {
    libraryRowId = await getCachedLocationId(
      location.rowName,
      rowCache,
      libraryStructureRepository.getRowIdByName,
    );
  }

  return { libraryAisleId, libraryRackId, libraryRowId };
}

async function resolveIdsByName(
  values,
  rowNumber,
  fieldName,
  fetchByNames,
  nameKey,
  idKey,
  resolveCache,
) {
  const { ids, names } = splitIdsAndNames(values);
  if (names.length === 0) {
    return ids;
  }

  const cacheKey = `${fieldName}|${names.map((name) => name.toLowerCase()).sort().join(",")}`;
  if (resolveCache?.has(cacheKey)) {
    return [...new Set([...ids, ...resolveCache.get(cacheKey)])];
  }

  const rows = await fetchByNames(names);
  const idByName = new Map(
    rows.map((row) => {
      const plain = row.get ? row.get({ plain: true }) : row;
      return [String(plain[nameKey]).toLowerCase(), plain[idKey]];
    }),
  );

  const resolvedFromNames = [];
  for (const name of names) {
    const resolvedId = idByName.get(name.toLowerCase());
    if (!resolvedId) {
      throw new Error(buildUploadError(rowNumber, `${fieldName} name '${name}' not found`));
    }
    resolvedFromNames.push(resolvedId);
  }

  const fromNames = [...new Set(resolvedFromNames)];
  if (resolveCache) {
    resolveCache.set(cacheKey, fromNames);
  }

  return [...new Set([...ids, ...fromNames])];
}

function buildNameToIdMap(rows, nameField, idField) {
  const map = new Map();
  for (const row of rows) {
    const plain = row.get ? row.get({ plain: true }) : row;
    const name = plain[nameField];
    if (name == null || String(name).trim() === "") continue;
    map.set(String(name).trim().toLowerCase(), plain[idField]);
  }
  return map;
}

/** Resolve numeric ids + comma-separated names using preloaded maps (one DB read per upload). */
function resolveBulkSubjectCategoryIds(values, fieldName, nameToIdMap, rowNumber) {
  const { ids, names } = splitIdsAndNames(values);
  if (names.length === 0) {
    return ids.length ? ids : null;
  }

  const resolved = [...ids];
  for (const name of names) {
    const resolvedId = nameToIdMap.get(name.toLowerCase());
    if (!resolvedId) {
      throw new Error(buildUploadError(rowNumber, `${fieldName} name '${name}' not found`));
    }
    resolved.push(resolvedId);
  }

  const unique = [...new Set(resolved)];
  return unique.length ? unique : null;
}

function buildBulkBookPayload(
  book,
  libraryCreationId,
  createdBy,
  updatedBy,
  categoryNameToId,
  subjectNameToId,
  rowNumber,
) {
  return {
    ...book,
    isbn: book.isbn ?? null,
    subjectId: resolveBulkSubjectCategoryIds(
      book.subjectId,
      "subjectId",
      subjectNameToId,
      rowNumber,
    ),
    categoryId: resolveBulkSubjectCategoryIds(
      book.categoryId,
      "categoryId",
      categoryNameToId,
      rowNumber,
    ),
    libraryCreationId: book.libraryCreationId || libraryCreationId || null,
    createdBy,
    updatedBy,
  };
}

function buildBookLookupIndexes(existingBooks) {
  const byTitle = new Map();
  const byIsbn = new Map();

  for (const book of existingBooks) {
    const plain = book.get ? book.get({ plain: true }) : book;
    if (plain.isbn) {
      byIsbn.set(String(plain.isbn).trim(), plain.libraryBookId);
    }
    if (plain.title) {
      byTitle.set(String(plain.title).trim().toLowerCase(), plain.libraryBookId);
    }
  }

  return { byTitle, byIsbn };
}

function registerBookInIndexes(libraryBookId, payload, bookIndexByTitle, bookIndexByIsbn) {
  if (payload.isbn) {
    bookIndexByIsbn.set(String(payload.isbn).trim(), libraryBookId);
  }
  if (payload.title) {
    bookIndexByTitle.set(String(payload.title).trim().toLowerCase(), libraryBookId);
  }
}

/**
 * Two-pass batch: bulk-create new books once, then bulk-create inventory.
 * Avoids per-row findBookByTitle/createBook queries (main cause of 60s+ uploads).
 */
async function processBulkUploadBatch({
  batch,
  bookCache,
  bookIndexByTitle,
  bookIndexByIsbn,
  categoryNameToId,
  subjectNameToId,
  libraryCreationId,
  createdBy,
  updatedBy,
  aisleCache,
  rackCache,
  rowCache,
  transaction,
}) {
  const pendingBooksByKey = new Map();

  for (const { book, rowNumber } of batch) {
    const cacheKey = getBookCacheKey(book);
    if (bookCache[cacheKey]) {
      continue;
    }

    let libraryBookId = null;
    if (book.isbn) {
      libraryBookId = bookIndexByIsbn.get(String(book.isbn).trim());
    }
    if (!libraryBookId && book.title) {
      libraryBookId = bookIndexByTitle.get(book.title.trim().toLowerCase());
    }

    if (libraryBookId) {
      bookCache[cacheKey] = libraryBookId;
      continue;
    }

    if (!pendingBooksByKey.has(cacheKey)) {
      pendingBooksByKey.set(
        cacheKey,
        buildBulkBookPayload(
          book,
          libraryCreationId,
          createdBy,
          updatedBy,
          categoryNameToId,
          subjectNameToId,
          rowNumber,
        ),
      );
    }
  }

  if (pendingBooksByKey.size > 0) {
    const pendingEntries = [...pendingBooksByKey.entries()];
    const createdBooks = await libraryCreationService.bulkCreateBooks(
      pendingEntries.map(([, payload]) => payload),
      transaction,
    );

    pendingEntries.forEach(([cacheKey, payload], index) => {
      const libraryBookId = createdBooks[index].libraryBookId;
      bookCache[cacheKey] = libraryBookId;
      registerBookInIndexes(libraryBookId, payload, bookIndexByTitle, bookIndexByIsbn);
    });
  }

  const inventoryPayloads = [];

  for (const { book, inventory, location } of batch) {
    const libraryBookId = bookCache[getBookCacheKey(book)];
    const { libraryAisleId, libraryRackId, libraryRowId } =
      await resolveBulkUploadLocationIds(location, aisleCache, rackCache, rowCache);

    inventoryPayloads.push({
      ...inventory,
      libraryBookId,
      libraryAisleId,
      libraryRackId,
      libraryRowId,
      status: inventory.status ?? "available",
      condition: inventory.condition ?? null,
    });
  }

  if (inventoryPayloads.length > 0) {
    await libraryCreationService.createInventoryBulk(inventoryPayloads, transaction);
  }
}

export async function bulkUploadBooks(
  rows,
  createdBy,
  updatedBy,
  libraryCreationId,
  instituteId,
) {
  const uploadStartedAt = Date.now();

  if (!Array.isArray(rows) || rows.length === 0) {
    return { status: "error", message: "Excel file has no data rows" };
  }

  if (rows.length > BULK_UPLOAD_MAX_ROWS) {
    return {
      status: "error",
      message: `Upload exceeds maximum of ${BULK_UPLOAD_MAX_ROWS} rows`,
    };
  }

  const parsedRows = [];
  const errors = [];

  for (let index = 0; index < rows.length; index++) {
    const row = normalizeBulkUploadRow(rows[index]);
    if (isBulkRowEmpty(row)) {
      continue;
    }

    const rowNumber = index + 2;
    const parsed = splitBulkUploadRow(row);

    if (parsed.errors.length > 0) {
      for (let i = 0; i < parsed.errors.length; i++) {
        errors.push(buildUploadError(rowNumber, parsed.errors[i]));
      }
      continue;
    }

    parsedRows.push({
      rowNumber,
      book: parsed.book,
      inventory: parsed.inventory,
      location: parsed.location,
    });
  }

  if (errors.length > 0) {
    return formatBulkUploadErrors(errors);
  }

  if (parsedRows.length === 0) {
    return {
      status: "error",
      message:
        "Excel file has no valid data rows. Row 1 must be headers (accessionNumber, title, authors, publisher, billDate, ...) and data from row 2 onward.",
    };
  }

  const preloadStartedAt = Date.now();
  const [existingBooks, categoryRows, subjectRows] = await Promise.all([
    libraryCreationService.findBookKeysByLibraryCreationId(libraryCreationId),
    libraryCreationService.getAllCategories(instituteId),
    libraryCreationService.findAllSubjectNamesForBulkLookup(),
  ]);
  const { byTitle: bookIndexByTitle, byIsbn: bookIndexByIsbn } =
    buildBookLookupIndexes(existingBooks);
  const categoryNameToId = buildNameToIdMap(categoryRows, "name", "libraryCategoryId");
  const subjectNameToId = buildNameToIdMap(subjectRows, "subjectName", "subjectId");
  const bookCache = {};
  const aisleCache = new Map();
  const rackCache = new Map();
  const rowCache = new Map();

  console.log(
    `[bulkUploadBooks] preloaded books=${existingBooks.length} categories=${categoryNameToId.size} subjects=${subjectNameToId.size} durationMs=${Date.now() - preloadStartedAt}`,
  );

  const batches = chunkArray(parsedRows, BULK_UPLOAD_BATCH_SIZE);
  let committedRows = 0;

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batchNumber = batchIndex + 1;
    const batch = batches[batchIndex];
    const batchStartedAt = Date.now();
    const transaction = await sequelize.transaction();

    try {
      await processBulkUploadBatch({
        batch,
        bookCache,
        bookIndexByTitle,
        bookIndexByIsbn,
        categoryNameToId,
        subjectNameToId,
        libraryCreationId,
        createdBy,
        updatedBy,
        aisleCache,
        rackCache,
        rowCache,
        transaction,
      });

      await transaction.commit();
      committedRows += batch.length;

      console.log(
        `[bulkUploadBooks] batch=${batchNumber}/${batches.length} rows=${batch.length} durationMs=${Date.now() - batchStartedAt}`,
      );
    } catch (error) {
      await transaction.rollback();
      console.error(
        `[bulkUploadBooks] failed batch=${batchNumber} committedRows=${committedRows} totalRows=${parsedRows.length} durationMs=${Date.now() - uploadStartedAt}`,
        error.message,
      );
      return {
        status: "error",
        message: `Batch ${batchNumber} failed: ${error.message}`,
        batchNumber,
        committedRows,
        totalRows: parsedRows.length,
        failedBatchRows: batch.length,
      };
    }
  }

  console.log(
    `[bulkUploadBooks] complete totalRows=${parsedRows.length} batches=${batches.length} totalDurationMs=${Date.now() - uploadStartedAt}`,
  );

  return {
    status: "success",
    importedRows: parsedRows.length,
    uniqueBooks: Object.keys(bookCache).length,
  };
}
