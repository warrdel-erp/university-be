/** Library book bulk upload — POST /libraryCreation/bulkUpload */

import * as libraryBookBulkUploadRepository from "../repository/libraryBookBulkUploadRepository.js";
import * as libraryStructureRepository from "../repository/libraryStructureRepository.js";
import sequelize from "../database/sequelizeConfig.js";
import { parseCustomDate } from "../utility/dateFormat.js";
import { readLibraryBulkUploadFile } from "../utility/fileHandler.js";

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
  subjectId: ["Subject", "Subjects", "subject id", "Subject Id", "subjectId"],
  categoryId: ["Category", "Categories", "category id", "Category Id", "categoryId"],
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

// =============================================================================
// PRE-UPLOAD VALIDATION (all checks before any transaction)
// =============================================================================

/** Build Set of valid numeric IDs from preloaded master rows. */
function buildMasterIdSet(masterRows, idField) {
  const idSet = new Set();
  for (const row of masterRows) {
    const plain = row.get ? row.get({ plain: true }) : row;
    if (plain[idField] != null) idSet.add(plain[idField]);
  }
  return idSet;
}

/**
 * Check categoryId / subjectId on each row (comma-separated names or numeric IDs).
 * Runs after categories/subjects are preloaded — fails before DB transaction.
 */
function validateCategoryAndSubjectNamesOnAllRows(
  parsedRows,
  categoryNameToIdMap,
  subjectNameToIdMap,
  validCategoryIds,
  validSubjectIds,
) {
  const errors = [];

  for (const { rowNumber, book } of parsedRows) {
    if (book.categoryId != null && book.categoryId !== undefined) {
      const { ids, names } = splitBulkSubjectAndCategoryCellValues(book.categoryId);

      for (const id of ids) {
        if (!validCategoryIds.has(id)) {
          errors.push(
            formatBulkUploadRowError(rowNumber, `categoryId ${id} not found in library_category`),
          );
        }
      }

      for (const name of names) {
        if (!categoryNameToIdMap.has(name.toLowerCase())) {
          errors.push(
            formatBulkUploadRowError(rowNumber, `categoryId name '${name}' not found`),
          );
        }
      }
    }

    if (book.subjectId != null && book.subjectId !== undefined) {
      const { ids, names } = splitBulkSubjectAndCategoryCellValues(book.subjectId);

      for (const id of ids) {
        if (!validSubjectIds.has(id)) {
          errors.push(
            formatBulkUploadRowError(rowNumber, `subjectId ${id} not found in subject table`),
          );
        }
      }

      for (const name of names) {
        if (!subjectNameToIdMap.has(name.toLowerCase())) {
          errors.push(
            formatBulkUploadRowError(rowNumber, `subjectId name '${name}' not found`),
          );
        }
      }
    }
  }

  return errors;
}

/**
 * Accession rules:
 * 1) No duplicate accessionNumber inside the Excel file.
 * 2) accessionNumber must not already exist in DB (only checks accessions in this file).
 */
async function validateAccessionNumbersBeforeUpload(parsedRows) {
  const errors = [];
  const firstRowByAccession = new Map();
  const accessionNumbersInFile = [];

  for (const row of parsedRows) {
    const accessionNumber = String(row.inventory.accessionNumber).trim();

    if (firstRowByAccession.has(accessionNumber)) {
      errors.push(
        formatBulkUploadRowError(
          row.rowNumber,
          `duplicate accessionNumber "${accessionNumber}" in Excel (first at row ${firstRowByAccession.get(accessionNumber)})`,
        ),
      );
      continue;
    }

    firstRowByAccession.set(accessionNumber, row.rowNumber);
    accessionNumbersInFile.push(accessionNumber);
  }

  const existingInDb = await libraryBookBulkUploadRepository.findExistingAccessionNumbersInList(
    accessionNumbersInFile,
  );
  const existingSet = new Set(
    existingInDb.map((row) => String(row.accessionNumber ?? row.accession_number ?? "").trim()),
  );

  for (const row of parsedRows) {
    const accessionNumber = String(row.inventory.accessionNumber).trim();
    if (existingSet.has(accessionNumber)) {
      errors.push(
        formatBulkUploadRowError(
          row.rowNumber,
          `accessionNumber "${accessionNumber}" already exists in database`,
        ),
      );
    }
  }

  return errors;
}

/**
 * Run every check that can fail before we open a DB transaction.
 */
async function runAllPreUploadValidations(parsedRows) {
  const [categoryRows, subjectRows] = await Promise.all([
    libraryBookBulkUploadRepository.findLibraryCategoriesForBulkUpload(),
    libraryBookBulkUploadRepository.findAllSubjectsForBulkUpload(),
  ]);

  const categoryNameToIdMap = buildMasterRecordNameToIdMap(categoryRows, "name", "libraryCategoryId");
  const subjectNameToIdMap = buildMasterRecordNameToIdMap(subjectRows, "subjectName", "subjectId");
  const validCategoryIds = buildMasterIdSet(categoryRows, "libraryCategoryId");
  const validSubjectIds = buildMasterIdSet(subjectRows, "subjectId");

  const errors = [
    ...validateCategoryAndSubjectNamesOnAllRows(
      parsedRows,
      categoryNameToIdMap,
      subjectNameToIdMap,
      validCategoryIds,
      validSubjectIds,
    ),
    ...(await validateAccessionNumbersBeforeUpload(parsedRows)),
  ];

  if (errors.length > 0) {
    return { ok: false, result: formatBulkUploadValidationErrors(errors) };
  }

  return {
    ok: true,
    categoryNameToIdMap,
    subjectNameToIdMap,
  };
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
 * Excel: "Coding,Test Category 1779195012897" or [1, "Math"] → numeric IDs + name tokens.
 * Names resolve via preloaded map, then getCategoryIdByName (same as addBook mapping tables).
 */
async function resolveBulkUploadCategoryIds(
  cellValues,
  categoryNameToIdMap,
  excelRowNumber,
  transaction,
) {
  const { ids, names } = splitBulkSubjectAndCategoryCellValues(cellValues);
  const resolvedIds = [...ids];

  for (const name of names) {
    let libraryCategoryId =
      categoryNameToIdMap.get(name.toLowerCase()) ??
      (await libraryBookBulkUploadRepository.getCategoryIdByName(name, transaction));

    if (!libraryCategoryId) {
      throw new Error(
        formatBulkUploadRowError(excelRowNumber, `categoryId name '${name}' not found`),
      );
    }
    resolvedIds.push(libraryCategoryId);
  }

  const uniqueIds = [...new Set(resolvedIds)];
  return uniqueIds.length ? uniqueIds : null;
}

async function resolveBulkUploadSubjectIds(
  cellValues,
  subjectNameToIdMap,
  excelRowNumber,
  transaction,
) {
  const { ids, names } = splitBulkSubjectAndCategoryCellValues(cellValues);
  const resolvedIds = [...ids];

  for (const name of names) {
    let subjectId =
      subjectNameToIdMap.get(name.toLowerCase()) ??
      (await libraryBookBulkUploadRepository.getSubjectIdByName(name, transaction));

    if (!subjectId) {
      throw new Error(
        formatBulkUploadRowError(excelRowNumber, `subjectId name '${name}' not found`),
      );
    }
    resolvedIds.push(subjectId);
  }

  const uniqueIds = [...new Set(resolvedIds)];
  return uniqueIds.length ? uniqueIds : null;
}

/** Book row for library_book.bulkCreate; subject/category go to mapping tables (same as addBook). */
async function buildBulkUploadNewBookRecord(
  book,
  libraryCreationId,
  createdBy,
  updatedBy,
  categoryNameToIdMap,
  subjectNameToIdMap,
  excelRowNumber,
  transaction,
) {
  const { subjectId: rawSubjectId, categoryId: rawCategoryId, ...bookFields } = book;

  const subjectId =
    rawSubjectId !== undefined && rawSubjectId !== null
      ? await resolveBulkUploadSubjectIds(
          rawSubjectId,
          subjectNameToIdMap,
          excelRowNumber,
          transaction,
        )
      : null;

  const categoryId =
    rawCategoryId !== undefined && rawCategoryId !== null
      ? await resolveBulkUploadCategoryIds(
          rawCategoryId,
          categoryNameToIdMap,
          excelRowNumber,
          transaction,
        )
      : null;

  return {
    bookPayload: {
      ...bookFields,
      isbn: book.isbn ?? null,
      libraryCreationId,
      createdBy,
      updatedBy,
    },
    subjectId,
    categoryId,
  };
}

async function validateBulkUploadBookMappingIds({ subjectId, categoryId }, transaction) {
  if (subjectId?.length) {
    const subjects = await libraryBookBulkUploadRepository.getSubjectsByIds(subjectId, transaction);
    const foundIds = new Set(subjects.map((row) => row.subjectId));
    const missingIds = subjectId.filter((id) => !foundIds.has(id));
    if (missingIds.length) {
      throw new Error(
        `Invalid subjectId(s): ${missingIds.join(", ")}. Must exist in subject table.`,
      );
    }
  }

  if (categoryId?.length) {
    const categories = await libraryBookBulkUploadRepository.getCategoriesByIds(
      categoryId,
      transaction,
    );
    const foundIds = new Set(categories.map((row) => row.libraryCategoryId));
    const missingIds = categoryId.filter((id) => !foundIds.has(id));
    if (missingIds.length) {
      throw new Error(
        `Invalid categoryId(s): ${missingIds.join(", ")}. Must exist in library_category table.`,
      );
    }
  }
}

async function syncBulkUploadBookMappings(
  libraryBookId,
  { subjectId, categoryId },
  transaction,
) {
  const hasSubjects = subjectId?.length > 0;
  const hasCategories = categoryId?.length > 0;
  if (!hasSubjects && !hasCategories) return;

  await validateBulkUploadBookMappingIds({ subjectId, categoryId }, transaction);

  if (hasSubjects) {
    await libraryBookBulkUploadRepository.replaceBookSubjectMappings(
      libraryBookId,
      subjectId,
      transaction,
    );
  }

  if (hasCategories) {
    await libraryBookBulkUploadRepository.replaceBookCategoryMappings(
      libraryBookId,
      categoryId,
      transaction,
    );
  }
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
// STAGE 3 — BATCH EXECUTION (inside transaction)
// =============================================================================

/**
 * One batch (max 500 rows), same transaction:
 *   Phase A — unique books to insert (ISBN/title dedupe; existing DB book reuse)
 *   Phase B — bulkCreate books + category/subject mapping rows
 *   Phase C — bulkCreate inventory (one accession per Excel row)
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

  // --- Phase A: decide library_book per unique ISBN/title ---
  // Same ISBN or title → reuse one book; only accessionNumber is new per Excel row.
  for (const { book, rowNumber } of parsedRowBatch) {
    const cacheKey = buildBulkUploadBookCacheKey(book);

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

    // First occurrence of this book in batch — queue one insert
    if (!pendingBooksByCacheKey.has(cacheKey)) {
      pendingBooksByCacheKey.set(
        cacheKey,
        await buildBulkUploadNewBookRecord(
          book,
          libraryCreationId,
          createdBy,
          updatedBy,
          categoryNameToIdMap,
          subjectNameToIdMap,
          rowNumber,
          transaction,
        ),
      );
    }
  }

  // --- Phase B: insert all new books in one bulkCreate ---
  const newBooksInserted = pendingBooksByCacheKey.size;
  if (newBooksInserted > 0) {
    const pendingEntries = [...pendingBooksByCacheKey.entries()];
    const createdBooks = await libraryBookBulkUploadRepository.bulkInsertLibraryBooks(
      pendingEntries.map(([, record]) => record.bookPayload),
      transaction,
    );

    for (let index = 0; index < pendingEntries.length; index++) {
      const [cacheKey, record] = pendingEntries[index];
      const libraryBookId = createdBooks[index].libraryBookId;
      bookCache[cacheKey] = libraryBookId;
      registerBookInLookupIndexes(
        libraryBookId,
        record.bookPayload,
        bookIndexByTitle,
        bookIndexByIsbn,
      );

      await syncBulkUploadBookMappings(
        libraryBookId,
        {
          subjectId: record.subjectId,
          categoryId: record.categoryId,
        },
        transaction,
      );
    }
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

  let inventoryInserted = 0;
  if (inventoryInsertPayloads.length > 0) {
    await libraryBookBulkUploadRepository.bulkInsertLibraryBookInventory(
      inventoryInsertPayloads,
      transaction,
    );
    inventoryInserted = inventoryInsertPayloads.length;
  }

  return { newBooksInserted, inventoryInserted };
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

async function executeBulkUploadInTransaction({
  parsedRows,
  libraryCreationId,
  categoryNameToIdMap,
  subjectNameToIdMap,
  createdBy,
  updatedBy,
}) {
  const existingBooks = await libraryBookBulkUploadRepository.findExistingBookKeysByLibraryId(
    libraryCreationId,
  );
  const { byTitle: bookIndexByTitle, byIsbn: bookIndexByIsbn } =
    buildExistingBookLookupIndexes(existingBooks);

  return sequelize.transaction(async (transaction) => {
    const bookCache = {};
    const aisleCache = new Map();
    const rackCache = new Map();
    const rowCache = new Map();
    const rowBatches = splitBulkUploadRowsIntoBatches(parsedRows, BULK_UPLOAD_BATCH_SIZE);
    const totalBatches = rowBatches.length;
    const transactionStartedAt = Date.now();

    console.log(
      `[Library bulk upload] DB transaction started — ${parsedRows.length} row(s), ${totalBatches} batch(es) (max ${BULK_UPLOAD_BATCH_SIZE} rows/batch). Full rollback on any failure.`,
    );

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const parsedRowBatch = rowBatches[batchIndex];
      const batchStartedAt = Date.now();

      const { newBooksInserted, inventoryInserted } = await persistBulkUploadBatchInTransaction({
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

      const batchMs = Date.now() - batchStartedAt;
      console.log(
        `[Library bulk upload] Batch ${batchIndex + 1}/${totalBatches} — ${parsedRowBatch.length} row(s), ${newBooksInserted} new book(s), ${inventoryInserted} inventory row(s) — ${batchMs}ms`,
      );
    }

    const transactionMs = Date.now() - transactionStartedAt;
    console.log(
      `[Library bulk upload] Transaction finished — ${parsedRows.length} row(s), ${Object.keys(bookCache).length} unique book(s) — total ${transactionMs}ms (commit on success)`,
    );

    return {
      status: "success",
      importedRows: parsedRows.length,
      uniqueBooks: Object.keys(bookCache).length,
    };
  });
}

const bulkUploadHttpError = (message, statusCode = 400, details = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (details) error.details = details;
  return error;
};

function throwIfBulkUploadFailed(result) {
  if (result.status !== "error") return;

  const details = {};
  if (result.totalErrors != null) details.totalErrors = result.totalErrors;
  if (result.totalRows != null) details.totalRows = result.totalRows;

  throw bulkUploadHttpError(
    result.message,
    400,
    Object.keys(details).length ? details : null,
  );
}

/** Controller entry: validate upload file, run import, return success payload or throw. */
export async function bulkUploadLibraryBooks(uploadFile, user, query) {
  if (!uploadFile) {
    throw bulkUploadHttpError("File is required (form-data field: book)");
  }

  const rows = await readLibraryBulkUploadFile(uploadFile);
  if (!rows.length) {
    throw bulkUploadHttpError("File has no data rows");
  }

  const result = await importLibraryBooksFromExcel(
    rows,
    user.userId,
    user.userId,
    query.libraryCreationId,
  );

  throwIfBulkUploadFailed(result);

  return {
    importedRows: result.importedRows,
    uniqueBooks: result.uniqueBooks,
  };
}

export async function importLibraryBooksFromExcel(
  excelRows,
  createdBy,
  updatedBy,
  libraryCreationId,
) {
  if (libraryCreationId == null || libraryCreationId === "") {
    return { status: "error", message: "libraryCreationId is required" };
  }

  const library = await libraryBookBulkUploadRepository.findLibraryCreationById(
    Number(libraryCreationId),
  );
  if (!library) {
    return {
      status: "error",
      message: `Library with libraryCreationId ${libraryCreationId} does not exist`,
    };
  }

  if (!Array.isArray(excelRows) || excelRows.length === 0) {
    return { status: "error", message: "Excel file has no data rows" };
  }

  const dataRows = filterNonEmptyBulkExcelRows(excelRows);
  if (!dataRows.length) {
    return { status: "error", message: "Excel file has no data rows" };
  }

  if (dataRows.length > BULK_UPLOAD_MAX_DATA_ROWS) {
    return {
      status: "error",
      message: `Upload exceeds maximum of ${BULK_UPLOAD_MAX_DATA_ROWS} data rows`,
    };
  }

  const parseResult = parseAndValidateBulkUploadExcelRows(dataRows);
  if (!parseResult.ok) {
    return parseResult.result;
  }

  const preUpload = await runAllPreUploadValidations(parseResult.parsedRows);
  if (!preUpload.ok) {
    return preUpload.result;
  }

  try {
    return await executeBulkUploadInTransaction({
      parsedRows: parseResult.parsedRows,
      libraryCreationId,
      categoryNameToIdMap: preUpload.categoryNameToIdMap,
      subjectNameToIdMap: preUpload.subjectNameToIdMap,
      createdBy,
      updatedBy,
    });
  } catch (error) {
    console.error(
      `[Library bulk upload] Transaction rolled back — ${parseResult.parsedRows.length} row(s) not saved. ${error.message}`,
    );
    return {
      status: "error",
      message: `Bulk upload failed — no rows were saved. ${formatBulkUploadDatabaseError(error)}`,
      totalRows: parseResult.parsedRows.length,
    };
  }
}
