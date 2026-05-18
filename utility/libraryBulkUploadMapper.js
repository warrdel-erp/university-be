// Excel row → book + inventory + location (used by bulkUploadBooks)

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

const norm = (key) => String(key).trim().toLowerCase().replace(/\s+/g, "");

const matchField = (key, fields) => {
  const n = norm(key);
  for (let i = 0; i < fields.length; i++) {
    if (norm(fields[i]) === n) return fields[i];
  }
  return null;
};

function parseCell(raw, field) {
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
  if (typeof raw === "number" && field === "isbn" && raw > 9999999999) {
    return raw.toFixed(0);
  }
  return raw;
}

function getTypeError(field, value) {
  if (NUMBER_FIELDS.includes(field) && Number.isNaN(Number(value))) {
    return `${field} must be a number`;
  }
  if (field === "itemType" && value && !["print", "Xerox", "Digital"].includes(value)) {
    return "itemType must be print, Xerox or Digital";
  }
  return null;
}

function applyDefaults(target, fields) {
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    if (target[field] === undefined && DEFAULTS[field] !== undefined) {
      target[field] = DEFAULTS[field];
    }
  }
}

export function splitBulkUploadRow(row) {
  const book = {};
  const inventory = {};
  const location = {};
  const unknownKeys = [];
  const typeErrors = [];

  for (const [rawKey, rawValue] of Object.entries(row)) {
    const locField = LOCATION_MAP[norm(rawKey)];
    if (locField) {
      if (rawValue !== undefined && rawValue !== null && rawValue !== "") {
        location[locField] = String(rawValue);
      }
      continue;
    }

    const bookField = matchField(rawKey, BOOK_FIELDS);
    if (bookField) {
      const value = parseCell(rawValue, bookField);
      if (value === null) continue;
      const err = getTypeError(bookField, value);
      if (err) {
        typeErrors.push(err);
        continue;
      }
      book[bookField] = value;
      continue;
    }

    const invField = matchField(rawKey, INVENTORY_FIELDS);
    if (invField) {
      const value = parseCell(rawValue, invField);
      if (value === null) continue;
      const err = getTypeError(invField, value);
      if (err) {
        typeErrors.push(err);
        continue;
      }
      inventory[invField] = value;
      continue;
    }

    if (rawValue !== undefined && rawValue !== null && rawValue !== "") {
      unknownKeys.push(rawKey);
    }
  }

  applyDefaults(book, BOOK_FIELDS);
  applyDefaults(inventory, INVENTORY_FIELDS);

  return {
    book,
    inventory,
    location: {
      aisleName: location.aisleName || null,
      rackName: location.rackName || null,
      rowName: location.rowName || null,
    },
    unknownKeys,
    typeErrors,
  };
}
