/**
 * Library book bulk upload — business logic for POST /libraryCreation/bulkUpload
 *
 * Flow (controller reads Excel → calls importLibraryBooksFromExcel):
 *   1. Parse each Excel row → book + inventory + location (aisle/rack/row names)
 *   2. Validate all rows before any DB write (fail fast with row numbers)
 *   3. Preload existing books, categories, subjects (avoid N+1 lookups)
 *   4. Process in batches of 500 inside one DB transaction (full rollback on any error)
 *   5. Per batch: create missing books once, then create inventory rows for every row
 *
 * One Excel row = one inventory copy. Multiple rows with same ISBN/title reuse one book.
 */

import * as libraryBookBulkUploadRepository from "../repository/libraryBookBulkUploadRepository.js";
import * as libraryStructureRepository from "../repository/libraryStructureRepository.js";
import sequelize from "../database/sequelizeConfig.js";
import { parseCustomDate } from "../utility/dateFormat.js";

// =============================================================================
// CONFIG — allowed DB columns, Excel aliases, limits
// =============================================================================

/** Columns written to library_book table. */
const BULK_BOOK_FIELDS = [
  "libraryCreationId", "libraryFloorId", "title", "subtitle", "authors", "publisher",
  "placeOfPublication", "yearOfPublication", "edition", "seriesTitle", "volumeNumber",
  "language", "isbn", "issn", "barcode", "physicalDescription", "numberOfPages",
  "illustrations", "summary", "keywords", "additionalAuthor", "subjectId",
  "classSectionsId", "remark", "itemType", "categoryId", "bookImage",
];

/** Columns written to library_book_inventory table (one row per Excel line). */
const BULK_INVENTORY_FIELDS = [
  "accessionNumber", "libraryAisleId", "libraryRackId", "libraryRowId", "studentId",
  "employeeId", "issueDate", "dueDate", "status", "billNo", "billDate",
  "itemPrice", "netPrice", "currency", "condition",
];

/** Fields parsed as Number() from Excel cells. */
const BULK_NUMBER_FIELDS = [
  "libraryCreationId", "libraryFloorId", "yearOfPublication", "numberOfPages",
  "classSectionsId", "libraryAisleId", "libraryRackId", "libraryRowId",
  "studentId", "employeeId", "itemPrice", "netPrice",
];

/** Fields passed through parseCustomDate (supports Excel date serials / strings). */
const BULK_DATE_FIELDS = ["billDate", "issueDate", "dueDate"];

/**
 * Excel headers "Aisle", "Rack", "Row" hold location *names*, not IDs.
 * Mapped to internal keys resolved later via libraryStructureRepository.
 */
const BULK_LOCATION_HEADER_MAP = { aisle: "aisleName", rack: "rackName", row: "rowName" };

/** Applied when cell is empty and column has a sensible default. */
const BULK_FIELD_DEFAULTS = { itemType: "print", status: "available", illustrations: false };

/** Rows per transaction — balances memory vs commit size for large files (~6k+ rows). */
const BULK_UPLOAD_BATCH_SIZE = 500;

/** Max non-empty data rows (after skipping blank Excel rows). */
const BULK_UPLOAD_MAX_DATA_ROWS = 100000;

/**
 * Alternate Excel header labels → model field name.
 * Real sheets use mixed casing ("Accession Number", "Bill No", etc.).
 */
const BULK_BOOK_FIELD_ALIASES = {
  title: ["Title", "Book Title", "book title", "BOOK TITLE"],
  subtitle: ["Subtitle", "Sub Title", "sub title"],
  authors: ["Author", "Authors", "AUTHOR", "author name"],
  publisher: ["Publisher", "PUBLISHER", "pub name"],
  isbn: ["ISBN", "Isbn", "isbn no", "isbn number", "ISBN No"],
  issn: ["ISSN", "Issn"],
  keywords: ["Keywords", "Keyword", "tags"],
  itemType: ["Item Type", "item type", "ItemType", "type"],
  subjectId: ["Subject", "Subjects", "subject id", "Subject Id"],
  categoryId: ["Category", "Categories", "category id", "Category Id"],
};

const BULK_INVENTORY_FIELD_ALIASES = {
  accessionNumber: [
    "accession number",
    "accession number.",
    "Accession Number",
    "Accession No",
    "acc no",
    "ACC No",
  ],
  libraryAisleId: [
    "LIBRARYAISLEID",
    "aisle_id",
    "Aisle_Id",
    "aisleid",
    "AisleId",
    "Aisle ID",
  ],
  libraryRackId: [
    "LIBRARYRACKID",
    "rackid",
    "RackId",
    "rack id",
    "Rack Id",
    "Rack ID",
  ],
  libraryRowId: [
    "libraryrowid",
    "LibraryRowId",
    "LIBRARYROWID",
    "row id",
    "Row Id",
    "Row ID",
  ],
  studentId: [
    "studentid",
    "StudentId",
    "STUDENTID",
    "student id",
    "Student Id",
    "scholar number",
    "Scholar Number",
  ],
  employeeId: [
    "employeeid",
    "EmployeeId",
    "EMPLOYEEID",
    "employee_id",
    "Employee_Id",
    "Employee Id",
  ],
  issueDate: [
    "issuedate",
    "IssueDate",
    "ISSUEDATE",
    "issue date",
    "Issue Date",
  ],
  dueDate: [
    "duedate",
    "DueDate",
    "DUEDATE",
    "due date",
    "Due Date",
    "return date",
    "Return Date",
  ],
  status: ["status", "Status", "availability", "Availability", "book status"],
  billNo: [
    "billno",
    "BillNo",
    "BILLNO",
    "bill no",
    "Bill No",
    "bill number",
    "Bill Number",
  ],
  billDate: [
    "billdate",
    "BillDate",
    "BILLDATE",
    "bill date",
    "Bill Date",
  ],
  itemPrice: [
    "itemprice",
    "ItemPrice",
    "ITEMPRICE",
    "item price",
    "Item Price",
    "price",
    "Price",
  ],
  netPrice: [
    "netprice",
    "NetPrice",
    "NETPRICE",
    "net price",
    "Net Price",
    "amount",
    "Amount",
  ],
  currency: [
    "currency",
    "Currency",
    "CURRENCY",
    "currency code",
    "Currency Code",
  ],
  condition: [
    "condition",
    "Condition",
    "CONDITION",
    "bookcondition",
    "BookCondition",
    "itemcondition",
    "ItemCondition",
  ],
};

// =============================================================================
// HEADER MATCHING — map Excel column text → model field names
// =============================================================================

/**
 * Compact key for lookup: trim, remove BOM, lowercase, strip spaces/underscores.
 * Example: "Accession Number" → "accessionnumber"
 */
function normalizeBulkExcelHeader(header) {
  return String(header || "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "");
}

/**
 * Word-based camelCase key — handles headers with spaces and mixed case.
 * Example: "Accession Number" → "accessionNumber"
 */
function toCamelCaseFieldKeyFromHeader(header) {
  const words = String(header || "")
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/[\s_.-]+/)
    .filter(Boolean);

  if (!words.length) return "";

  return words
    .map((word, index) => {
      const lower = word.toLowerCase();
      return index === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");
}

/**
 * Pre-build a map: normalized header label → model field name.
 * Registers both compact and camelCase forms for each alias.
 */
function buildBulkExcelHeaderLookupMap(fieldAliasesByModel) {
  const lookupMap = {};

  const registerHeader = (modelFieldName, headerLabel) => {
    lookupMap[normalizeBulkExcelHeader(headerLabel)] = modelFieldName;
    lookupMap[toCamelCaseFieldKeyFromHeader(headerLabel)] = modelFieldName;
  };

  for (const [modelFieldName, aliasList] of Object.entries(fieldAliasesByModel)) {
    registerHeader(modelFieldName, modelFieldName);
    for (const alias of aliasList) {
      registerHeader(modelFieldName, alias);
    }
  }

  return lookupMap;
}

const BULK_BOOK_HEADER_LOOKUP = buildBulkExcelHeaderLookupMap(BULK_BOOK_FIELD_ALIASES);
const BULK_INVENTORY_HEADER_LOOKUP = buildBulkExcelHeaderLookupMap(BULK_INVENTORY_FIELD_ALIASES);

/**
 * Resolve one Excel column header to a library_book or library_book_inventory field.
 * Tries: alias map → exact camelCase → compare against known model field names.
 */
function resolveBulkModelFieldFromExcelHeader(excelHeader, modelFields, headerLookupMap) {
  const compactKey = normalizeBulkExcelHeader(excelHeader);
  const camelCaseKey = toCamelCaseFieldKeyFromHeader(excelHeader);

  const fromLookup = headerLookupMap[compactKey] ?? headerLookupMap[camelCaseKey];
  if (fromLookup && modelFields.includes(fromLookup)) {
    return fromLookup;
  }

  if (modelFields.includes(camelCaseKey)) {
    return camelCaseKey;
  }

  for (let i = 0; i < modelFields.length; i++) {
    if (normalizeBulkExcelHeader(modelFields[i]) === compactKey) {
      return modelFields[i];
    }
  }

  return null;
}

// =============================================================================
// CELL PARSING & VALIDATION
// =============================================================================

function isBulkExcelCellEmpty(cellValue) {
  return cellValue === undefined || cellValue === null || String(cellValue).trim() === "";
}

/**
 * Convert raw Excel cell to typed value for the target model column.
 * Empty cells use BULK_FIELD_DEFAULTS when defined, else null (skip field).
 */
function parseBulkExcelCellValue(cellValue, modelFieldName) {
  if (isBulkExcelCellEmpty(cellValue)) {
    return BULK_FIELD_DEFAULTS[modelFieldName] !== undefined
      ? BULK_FIELD_DEFAULTS[modelFieldName]
      : null;
  }
  if (BULK_NUMBER_FIELDS.includes(modelFieldName)) {
    return Number(cellValue);
  }
  // subjectId / categoryId: Excel may contain "Math, Physics" or numeric IDs
  if (modelFieldName === "categoryId" || modelFieldName === "subjectId") {
    const parseToken = (value) => {
      const text = String(value).trim();
      if (!text) return null;
      if (/^\d+$/.test(text)) return Number(text);
      return text;
    };

    if (Array.isArray(cellValue)) {
      return cellValue.map(parseToken).filter((value) => value !== null);
    }
    if (typeof cellValue === "string") {
      return cellValue
        .split(",")
        .map(parseToken)
        .filter((value) => value !== null);
    }
    const parsed = parseToken(cellValue);
    return parsed === null ? [] : [parsed];
  }
  if (modelFieldName === "illustrations") {
    if (cellValue === true || cellValue === false) return cellValue;
    const text = String(cellValue).toLowerCase();
    if (text === "true" || text === "1") return true;
    if (text === "false" || text === "0") return false;
  }
  // Store as exact trimmed string (no number coercion) for unique keys
  if (modelFieldName === "isbn" || modelFieldName === "title" || modelFieldName === "accessionNumber") {
    const text = String(cellValue).trim();
    return text === "" ? null : text;
  }
  if (BULK_DATE_FIELDS.includes(modelFieldName)) {
    return parseCustomDate(cellValue);
  }
  return cellValue;
}

/** Return human-readable error for a parsed cell, or null if valid. */
function getBulkExcelCellValidationError(modelFieldName, parsedValue, rawCellValue) {
  if (BULK_NUMBER_FIELDS.includes(modelFieldName) && Number.isNaN(Number(parsedValue))) {
    return `${modelFieldName} must be a number`;
  }
  if (BULK_DATE_FIELDS.includes(modelFieldName) && !isBulkExcelCellEmpty(rawCellValue) && parsedValue === null) {
    return `${modelFieldName} has invalid date format`;
  }
  if (modelFieldName === "itemType" && parsedValue && !["print", "Xerox", "Digital"].includes(parsedValue)) {
    return "itemType must be print, Xerox or Digital";
  }
  return null;
}

/** Fill missing keys with defaults (e.g. itemType: "print", status: "available"). */
function applyBulkExcelFieldDefaults(target, modelFields) {
  for (let i = 0; i < modelFields.length; i++) {
    const modelFieldName = modelFields[i];
    if (target[modelFieldName] === undefined && BULK_FIELD_DEFAULTS[modelFieldName] !== undefined) {
      target[modelFieldName] = BULK_FIELD_DEFAULTS[modelFieldName];
    }
  }
}

/** Remove BOM from keys and skip xlsx-generated __EMPTY columns. */
function stripBulkExcelRowKeys(excelRow) {
  const strippedRow = {};
  for (const [rawKey, rawValue] of Object.entries(excelRow)) {
    const cleanKey = String(rawKey).replace(/^\uFEFF/, "").trim();
    if (!cleanKey || cleanKey.startsWith("__EMPTY")) {
      continue;
    }
    strippedRow[cleanKey] = rawValue;
  }
  return strippedRow;
}

/** Drop rows where every cell is empty — sheet range often extends far past real data. */
function filterNonEmptyBulkExcelRows(excelRows) {
  return excelRows.filter((row) => !isBulkExcelRowEmpty(row));
}

function isBulkExcelRowEmpty(excelRow) {
  if (excelRow == null || typeof excelRow !== "object" || Array.isArray(excelRow)) {
    return true;
  }
  const strippedRow = stripBulkExcelRowKeys(excelRow);
  const values = Object.values(strippedRow);
  if (values.length === 0) {
    return true;
  }
  return values.every((value) => isBulkExcelCellEmpty(value));
}

/**
 * Parse one Excel data row into three objects:
 *   - book: library_book fields
 *   - inventory: library_book_inventory fields
 *   - location: aisle/rack/row names (resolved to IDs later in batch)
 */
function parseSingleBulkUploadExcelRow(excelRow) {
  const book = {};
  const inventory = {};
  const location = {};
  const errors = [];

  for (const [excelHeader, rawCellValue] of Object.entries(excelRow)) {
    // Location columns use names, not numeric IDs
    const locationFieldName =
      BULK_LOCATION_HEADER_MAP[normalizeBulkExcelHeader(excelHeader)] ??
      BULK_LOCATION_HEADER_MAP[toCamelCaseFieldKeyFromHeader(excelHeader)];

    if (locationFieldName) {
      if (!isBulkExcelCellEmpty(rawCellValue)) {
        location[locationFieldName] = String(rawCellValue).trim();
      }
      continue;
    }

    const bookFieldName = resolveBulkModelFieldFromExcelHeader(
      excelHeader,
      BULK_BOOK_FIELDS,
      BULK_BOOK_HEADER_LOOKUP,
    );
    if (bookFieldName) {
      const parsedValue = parseBulkExcelCellValue(rawCellValue, bookFieldName);
      if (parsedValue === null) continue;
      const validationError = getBulkExcelCellValidationError(
        bookFieldName,
        parsedValue,
        rawCellValue,
      );
      if (validationError) {
        errors.push(validationError);
        continue;
      }
      book[bookFieldName] = parsedValue;
      continue;
    }

    const inventoryFieldName = resolveBulkModelFieldFromExcelHeader(
      excelHeader,
      BULK_INVENTORY_FIELDS,
      BULK_INVENTORY_HEADER_LOOKUP,
    );
    if (inventoryFieldName) {
      const parsedValue = parseBulkExcelCellValue(rawCellValue, inventoryFieldName);
      if (parsedValue === null && isBulkExcelCellEmpty(rawCellValue)) continue;
      const validationError = getBulkExcelCellValidationError(
        inventoryFieldName,
        parsedValue,
        rawCellValue,
      );
      if (validationError) {
        errors.push(validationError);
        continue;
      }
      inventory[inventoryFieldName] = parsedValue;
    }
  }

  applyBulkExcelFieldDefaults(book, BULK_BOOK_FIELDS);
  applyBulkExcelFieldDefaults(inventory, BULK_INVENTORY_FIELDS);

  // Minimum required per business rules
  if (!book.title) errors.push("title is required");
  if (!inventory.accessionNumber) errors.push("accessionNumber is required");

  return { book, inventory, location, errors };
}

function formatBulkUploadRowError(excelRowNumber, errorText) {
  return `Row ${excelRowNumber}: ${errorText}`;
}

/** Cap error list in API response so clients are not flooded. */
function formatBulkUploadValidationErrors(errorMessages) {
  const totalErrors = errorMessages.length;
  const shown = errorMessages.slice(0, 50);
  let message = shown.join("; ");
  if (totalErrors > 50) {
    message += `; ... and ${totalErrors - 50} more error(s)`;
  }
  return { status: "error", message, totalErrors };
}

/**
 * Turn Sequelize / MySQL errors into a readable message (not just "Validation error").
 * Covers model validation, unique constraints, and foreign key failures.
 */
function formatBulkUploadDatabaseError(error) {
  const messageParts = [];

  if (Array.isArray(error?.errors) && error.errors.length > 0) {
    for (const item of error.errors) {
      const field = item.path || item.field || "field";
      const value =
        item.value !== undefined && item.value !== null ? `, value="${item.value}"` : "";
      messageParts.push(`${field}: ${item.message}${value}`);
    }
  }

  const sqlMessage = error?.parent?.sqlMessage || error?.original?.sqlMessage || null;
  if (sqlMessage) {
    messageParts.push(sqlMessage);
  }

  if (error?.message && !messageParts.includes(error.message)) {
    messageParts.push(error.message);
  }

  const uniqueParts = [...new Set(messageParts.filter(Boolean))];
  return uniqueParts.length > 0
    ? uniqueParts.join(" | ")
    : "Unknown database error during bulk import";
}

/**
 * Excel validation does not catch DB-only rules: duplicate accessionNumber (unique),
 * invalid FK ids, Sequelize column validators, etc.
 */
async function validateBulkUploadAccessionUniqueness(parsedRows) {
  const validationErrors = [];
  const accessionFirstRowInFile = new Map();

  for (const row of parsedRows) {
    const accessionNumber = String(row.inventory.accessionNumber).trim();

    if (accessionFirstRowInFile.has(accessionNumber)) {
      validationErrors.push(
        formatBulkUploadRowError(
          row.rowNumber,
          `duplicate accessionNumber "${accessionNumber}" in Excel (first at row ${accessionFirstRowInFile.get(accessionNumber)})`,
        ),
      );
      continue;
    }

    accessionFirstRowInFile.set(accessionNumber, row.rowNumber);
  }

  const existingRows = await libraryBookBulkUploadRepository.findAllExistingAccessionNumbers();
  const existingAccessionSet = new Set(
    existingRows.map((row) =>
      String(row.accessionNumber ?? row.accession_number ?? "").trim(),
    ),
  );

  for (const row of parsedRows) {
    const accessionNumber = String(row.inventory.accessionNumber).trim();
    if (existingAccessionSet.has(accessionNumber)) {
      validationErrors.push(
        formatBulkUploadRowError(
          row.rowNumber,
          `accessionNumber "${accessionNumber}" already exists in database`,
        ),
      );
    }
  }

  if (validationErrors.length > 0) {
    return { ok: false, result: formatBulkUploadValidationErrors(validationErrors) };
  }

  return { ok: true };
}

function splitBulkUploadRowsIntoBatches(rows, batchSize) {
  const batches = [];
  for (let i = 0; i < rows.length; i += batchSize) {
    batches.push(rows.slice(i, i + batchSize));
  }
  return batches;
}

// =============================================================================
// BOOK DEDUPLICATION — same ISBN/title in file or DB → one library_book
// =============================================================================

/**
 * In-memory key for bookCache: prefer ISBN, else normalized title.
 * Rows sharing this key get the same libraryBookId.
 */
function buildBulkUploadBookCacheKey(book) {
  if (book.isbn) return `isbn:${book.isbn}`;
  return `title:${book.title.toLowerCase()}`;
}

/** Split "1, Math, 3" into numeric IDs and name tokens for subject/category resolution. */
function splitBulkSubjectAndCategoryCellValues(cellValues) {
  const rawValues = Array.isArray(cellValues) ? cellValues : cellValues == null ? [] : [cellValues];
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

/** Build lowercase name → id map for category/subject lookup from Excel text. */
function buildMasterRecordNameToIdMap(masterRows, nameField, idField) {
  const nameToIdMap = new Map();
  for (const row of masterRows) {
    const plain = row.get ? row.get({ plain: true }) : row;
    const displayName = plain[nameField];
    if (displayName == null || String(displayName).trim() === "") continue;
    nameToIdMap.set(String(displayName).trim().toLowerCase(), plain[idField]);
  }
  return nameToIdMap;
}

/**
 * Resolve subjectId/categoryId array: numeric IDs pass through;
 * names are matched case-insensitively against preloaded master data.
 */
function resolveBulkUploadSubjectOrCategoryIds(cellValues, fieldName, nameToIdMap, excelRowNumber) {
  const { ids, names } = splitBulkSubjectAndCategoryCellValues(cellValues);
  if (names.length === 0) {
    return ids.length ? ids : null;
  }

  const resolvedIds = [...ids];
  for (const name of names) {
    const resolvedId = nameToIdMap.get(name.toLowerCase());
    if (!resolvedId) {
      throw new Error(formatBulkUploadRowError(excelRowNumber, `${fieldName} name '${name}' not found`));
    }
    resolvedIds.push(resolvedId);
  }

  const uniqueIds = [...new Set(resolvedIds)];
  return uniqueIds.length ? uniqueIds : null;
}

/** Final payload for library_book.bulkCreate — resolves names and audit fields. */
function buildLibraryBookInsertPayload(
  book,
  libraryCreationId,
  createdBy,
  updatedBy,
  categoryNameToIdMap,
  subjectNameToIdMap,
  excelRowNumber,
) {
  return {
    ...book,
    isbn: book.isbn ?? null,
    subjectId: resolveBulkUploadSubjectOrCategoryIds(
      book.subjectId,
      "subjectId",
      subjectNameToIdMap,
      excelRowNumber,
    ),
    categoryId: resolveBulkUploadSubjectOrCategoryIds(
      book.categoryId,
      "categoryId",
      categoryNameToIdMap,
      excelRowNumber,
    ),
    // Always use query libraryCreationId (validated before import), not Excel column
    libraryCreationId,
    createdBy,
    updatedBy,
  };
}

/** Indexes of books already in DB — used to skip insert when ISBN/title matches. */
function buildExistingBookLookupIndexes(existingBooks) {
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

/** After creating a book in this upload, add to indexes so later rows in same batch find it. */
function registerBookInLookupIndexes(libraryBookId, bookPayload, bookIndexByTitle, bookIndexByIsbn) {
  if (bookPayload.isbn) {
    bookIndexByIsbn.set(String(bookPayload.isbn).trim(), libraryBookId);
  }
  if (bookPayload.title) {
    bookIndexByTitle.set(String(bookPayload.title).trim().toLowerCase(), libraryBookId);
  }
}

// =============================================================================
// LOCATION RESOLUTION — Aisle/Rack/Row names → foreign key IDs
// =============================================================================

/** Cache location name lookups within one upload to avoid repeated DB hits. */
async function fetchLibraryLocationIdByName(locationName, locationCache, fetchIdByName) {
  const cacheKey = String(locationName).trim().toLowerCase();
  if (locationCache.has(cacheKey)) {
    return locationCache.get(cacheKey);
  }
  const locationId = await fetchIdByName(locationName);
  locationCache.set(cacheKey, locationId);
  return locationId;
}

/** Optional: Excel may omit aisle/rack/row; IDs stay null (allowed for bulk data). */
async function resolveBulkUploadLocationIdsForRow(location, aisleCache, rackCache, rowCache) {
  let libraryAisleId = null;
  let libraryRackId = null;
  let libraryRowId = null;

  if (location.aisleName) {
    libraryAisleId = await fetchLibraryLocationIdByName(
      location.aisleName,
      aisleCache,
      libraryStructureRepository.getAisleIdByName,
    );
  }
  if (location.rackName) {
    libraryRackId = await fetchLibraryLocationIdByName(
      location.rackName,
      rackCache,
      libraryStructureRepository.getRackIdByName,
    );
  }
  if (location.rowName) {
    libraryRowId = await fetchLibraryLocationIdByName(
      location.rowName,
      rowCache,
      libraryStructureRepository.getRowIdByName,
    );
  }

  return { libraryAisleId, libraryRackId, libraryRowId };
}

// =============================================================================
// BATCH PERSISTENCE — all batches share one transaction (commit once or rollback all)
// =============================================================================

/**
 * Within a single transaction for one batch:
 *   Phase A — Decide which books to insert (dedupe by cache key + DB indexes)
 *   Phase B — bulkCreate books, update bookCache and indexes
 *   Phase C — bulkCreate inventory for every row in batch (always one inventory per row)
 */
async function persistBulkUploadBatchInTransaction({
  parsedRowBatch,
  bookCache,
  bookIndexByTitle,
  bookIndexByIsbn,
  categoryNameToIdMap,
  subjectNameToIdMap,
  libraryCreationId,
  createdBy,
  updatedBy,
  aisleCache,
  rackCache,
  rowCache,
  transaction,
}) {
  const pendingBooksByCacheKey = new Map();

  // --- Phase A: collect unique new books for this batch ---
  for (const { book, rowNumber } of parsedRowBatch) {
    const cacheKey = buildBulkUploadBookCacheKey(book);

    // Already linked in this upload (earlier row or batch)
    if (bookCache[cacheKey]) {
      continue;
    }

    // Match existing DB record by ISBN, then title
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

    // First occurrence of this book in batch — queue one insert
    if (!pendingBooksByCacheKey.has(cacheKey)) {
      pendingBooksByCacheKey.set(
        cacheKey,
        buildLibraryBookInsertPayload(
          book,
          libraryCreationId,
          createdBy,
          updatedBy,
          categoryNameToIdMap,
          subjectNameToIdMap,
          rowNumber,
        ),
      );
    }
  }

  // --- Phase B: insert all new books in one bulkCreate ---
  if (pendingBooksByCacheKey.size > 0) {
    const pendingEntries = [...pendingBooksByCacheKey.entries()];
    const createdBooks = await libraryBookBulkUploadRepository.bulkInsertLibraryBooks(
      pendingEntries.map(([, payload]) => payload),
      transaction,
    );

    pendingEntries.forEach(([cacheKey, payload], index) => {
      const libraryBookId = createdBooks[index].libraryBookId;
      bookCache[cacheKey] = libraryBookId;
      registerBookInLookupIndexes(libraryBookId, payload, bookIndexByTitle, bookIndexByIsbn);
    });
  }

  // --- Phase C: every Excel row becomes one inventory row ---
  const inventoryInsertPayloads = [];

  for (const { book, inventory, location } of parsedRowBatch) {
    const libraryBookId = bookCache[buildBulkUploadBookCacheKey(book)];
    const { libraryAisleId, libraryRackId, libraryRowId } =
      await resolveBulkUploadLocationIdsForRow(location, aisleCache, rackCache, rowCache);

    inventoryInsertPayloads.push({
      ...inventory,
      libraryBookId,
      libraryAisleId,
      libraryRackId,
      libraryRowId,
      status: inventory.status ?? "available",
      condition: inventory.condition ?? null,
    });
  }

  if (inventoryInsertPayloads.length > 0) {
    await libraryBookBulkUploadRepository.bulkInsertLibraryBookInventory(
      inventoryInsertPayloads,
      transaction,
    );
  }
}

// =============================================================================
// ROW-LEVEL VALIDATION PASS — all rows before any DB write
// =============================================================================

/**
 * Walk every Excel row (row 1 = headers, data starts row 2).
 * Returns { ok: false, result } with all validation errors, or { ok: true, parsedRows }.
 */
function parseAndValidateBulkUploadExcelRows(excelRows) {
  const parsedRows = [];
  const validationErrors = [];

  for (let index = 0; index < excelRows.length; index++) {
    const excelRow = stripBulkExcelRowKeys(excelRows[index]);
    if (isBulkExcelRowEmpty(excelRow)) {
      continue;
    }

    const excelRowNumber = index + 2;
    const parsed = parseSingleBulkUploadExcelRow(excelRow);

    if (parsed.errors.length > 0) {
      for (let i = 0; i < parsed.errors.length; i++) {
        validationErrors.push(formatBulkUploadRowError(excelRowNumber, parsed.errors[i]));
      }
      continue;
    }

    parsedRows.push({
      rowNumber: excelRowNumber,
      book: parsed.book,
      inventory: parsed.inventory,
      location: parsed.location,
    });
  }

  if (validationErrors.length > 0) {
    return { ok: false, result: formatBulkUploadValidationErrors(validationErrors) };
  }

  if (parsedRows.length === 0) {
    return {
      ok: false,
      result: {
        status: "error",
        message:
          "Excel file has no valid data rows. Row 1 must be headers (accessionNumber, title, authors, publisher, billDate, ...) and data from row 2 onward.",
      },
    };
  }

  return { ok: true, parsedRows };
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Main entry: import library books + inventory from parsed Excel rows.
 * Called by libraryCreationController.bulkUploadBooks after readExcelFile().
 *
 * @param {object[]} excelRows - JSON rows from sheet_to_json (first row = headers)
 * @returns {{ status: 'success'|'error', message?, importedRows?, uniqueBooks?, ... }}
 */
export async function importLibraryBooksFromExcel(
  excelRows,
  createdBy,
  updatedBy,
  libraryCreationId,
  instituteId,
) {
  const uploadStartedAt = Date.now();

  if (libraryCreationId == null || libraryCreationId === "") {
    return { status: "error", message: "libraryCreationId is required" };
  }

  const libraryExists = await libraryBookBulkUploadRepository.findLibraryCreationById(
    Number(libraryCreationId),
  );
  if (!libraryExists) {
    return {
      status: "error",
      message: `Library with libraryCreationId ${libraryCreationId} does not exist`,
    };
  }

  if (!Array.isArray(excelRows) || excelRows.length === 0) {
    return { status: "error", message: "Excel file has no data rows" };
  }

  const dataRows = filterNonEmptyBulkExcelRows(excelRows);

  if (dataRows.length === 0) {
    return { status: "error", message: "Excel file has no data rows" };
  }

  if (dataRows.length > BULK_UPLOAD_MAX_DATA_ROWS) {
    return {
      status: "error",
      message: `Upload exceeds maximum of ${BULK_UPLOAD_MAX_DATA_ROWS} data rows`,
    };
  }

  // Validate entire file first — no partial DB writes on bad data
  const parseResult = parseAndValidateBulkUploadExcelRows(dataRows);
  if (!parseResult.ok) {
    return parseResult.result;
  }

  const parsedRows = parseResult.parsedRows;

  const accessionResult = await validateBulkUploadAccessionUniqueness(parsedRows);
  if (!accessionResult.ok) {
    return accessionResult.result;
  }

  // Preload masters once (not per row)
  const preloadStartedAt = Date.now();
  const [existingBooks, categoryRows, subjectRows] = await Promise.all([
    libraryBookBulkUploadRepository.findExistingBookKeysByLibraryId(libraryCreationId),
    libraryBookBulkUploadRepository.findLibraryCategoriesForBulkUpload(instituteId),
    libraryBookBulkUploadRepository.findAllSubjectsForBulkUpload(),
  ]);
  const { byTitle: bookIndexByTitle, byIsbn: bookIndexByIsbn } =
    buildExistingBookLookupIndexes(existingBooks);
  const categoryNameToIdMap = buildMasterRecordNameToIdMap(categoryRows, "name", "libraryCategoryId");
  const subjectNameToIdMap = buildMasterRecordNameToIdMap(subjectRows, "subjectName", "subjectId");

  // bookCache: cacheKey → libraryBookId (survives across batches)
  const bookCache = {};
  const aisleCache = new Map();
  const rackCache = new Map();
  const rowCache = new Map();

  console.log(
    `[importLibraryBooksFromExcel] preloaded books=${existingBooks.length} categories=${categoryNameToIdMap.size} subjects=${subjectNameToIdMap.size} durationMs=${Date.now() - preloadStartedAt}`,
  );

  const rowBatches = splitBulkUploadRowsIntoBatches(parsedRows, BULK_UPLOAD_BATCH_SIZE);
  const transaction = await sequelize.transaction();

  try {
    for (let batchIndex = 0; batchIndex < rowBatches.length; batchIndex++) {
      const batchNumber = batchIndex + 1;
      const parsedRowBatch = rowBatches[batchIndex];
      const batchStartedAt = Date.now();

      await persistBulkUploadBatchInTransaction({
        parsedRowBatch,
        bookCache,
        bookIndexByTitle,
        bookIndexByIsbn,
        categoryNameToIdMap,
        subjectNameToIdMap,
        libraryCreationId,
        createdBy,
        updatedBy,
        aisleCache,
        rackCache,
        rowCache,
        transaction,
      });

      console.log(
        `[importLibraryBooksFromExcel] batch=${batchNumber}/${rowBatches.length} rows=${parsedRowBatch.length} durationMs=${Date.now() - batchStartedAt}`,
      );
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    const dbErrorMessage = formatBulkUploadDatabaseError(error);
    console.error(
      `[importLibraryBooksFromExcel] rolled back full upload totalRows=${parsedRows.length} durationMs=${Date.now() - uploadStartedAt}`,
      dbErrorMessage,
      error,
    );
    return {
      status: "error",
      message: `Bulk upload failed — no rows were saved. ${dbErrorMessage}`,
      totalRows: parsedRows.length,
    };
  }

  console.log(
    `[importLibraryBooksFromExcel] complete totalRows=${parsedRows.length} batches=${rowBatches.length} totalDurationMs=${Date.now() - uploadStartedAt}`,
  );

  return {
    status: "success",
    importedRows: parsedRows.length,
    uniqueBooks: Object.keys(bookCache).length,
  };
}

/** @deprecated Use importLibraryBooksFromExcel — kept for existing controller import name. */
export const bulkUploadBooks = importLibraryBooksFromExcel;
