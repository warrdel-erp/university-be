import * as libraryCreationService from "../repository/libraryCreationRepository.js";
import * as libraryStructureRepository from "../repository/libraryStructureRepository.js";
import * as fileHandler from "../utility/fileHandler.js";
import sequelize from "../database/sequelizeConfig.js";

const httpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

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

function applyBookMappingLists(book) {
  const plain = book.get ? book.get({ plain: true }) : book;

  const categories = (plain.categoryMappings ?? [])
    .map((mapping) => ({
      libraryCategoryId: mapping.libraryCategoryId ?? mapping.category?.libraryCategoryId,
      name: mapping.category?.name,
    }))
    .filter((item) => item.libraryCategoryId);

  const subjects = (plain.subjectMappings ?? [])
    .map((mapping) => ({
      subjectId: mapping.librarySubjectId ?? mapping.subject?.subjectId,
      subjectName: mapping.subject?.subjectName,
    }))
    .filter((item) => item.subjectId);

  const { categoryMappings, subjectMappings, ...bookFields } = plain;

  return formatBookForResponse({
    ...bookFields,
    categories,
    subjects,
  });
}

function formatBookForResponse(book) {
  const {
    categoryMappings: _categoryMappings,
    subjectMappings: _subjectMappings,
    inventoryCopies,
    ...bookFields
  } = book;

  const categories = book.categories ?? [];
  const subjects = book.subjects ?? [];

  return {
    ...bookFields,
    categories,
    subjects,
    inventoryCopies: (inventoryCopies ?? []).map(formatInventoryForResponse),
  };
}

function splitBookMappingPayload(bookData) {
  const { subjectId, categoryId, ...bookFields } = bookData;

  return {
    bookFields,
    subjectId: subjectId !== undefined ? parseIdArray(subjectId) : undefined,
    categoryId: categoryId !== undefined ? parseIdArray(categoryId) : undefined,
  };
}

async function validateBookMappingIds({ subjectId, categoryId, instituteId }, transaction) {
  if (!instituteId) {
    throw httpError("instituteId is required for book subject/category mappings");
  }

  if (subjectId?.length) {
    const subjects = await libraryCreationService.getSubjectsByIds(subjectId, transaction);
    const foundIds = new Set(subjects.map((row) => row.subjectId));
    const missingIds = subjectId.filter((id) => !foundIds.has(id));

    if (missingIds.length) {
      throw httpError(
        `Invalid subjectId(s): ${missingIds.join(", ")}. Must exist in subject table.`,
      );
    }
  }

  if (categoryId?.length) {
    const categories = await libraryCreationService.getCategoriesByIds(categoryId, transaction);
    const foundIds = new Set(categories.map((row) => row.libraryCategoryId));
    const missingIds = categoryId.filter((id) => !foundIds.has(id));

    if (missingIds.length) {
      throw httpError(
        `Invalid categoryId(s): ${missingIds.join(", ")}. Must exist in library_category table.`,
      );
    }
  }
}

async function syncBookMappings(
  libraryBookId,
  { subjectId, categoryId, instituteId },
  transaction,
) {
  const syncSubjects = subjectId !== undefined;
  const syncCategories = categoryId !== undefined;

  if (!syncSubjects && !syncCategories) return;

  await validateBookMappingIds({ subjectId, categoryId, instituteId }, transaction);

  if (syncSubjects) {
    await libraryCreationService.replaceBookSubjectMappings(
      libraryBookId,
      subjectId,
      instituteId,
      transaction,
    );
  }

  if (syncCategories) {
    await libraryCreationService.replaceBookCategoryMappings(
      libraryBookId,
      categoryId,
      instituteId,
      transaction,
    );
  }
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

export async function addCategory(body, user) {
  const data = {
    name: body.name,
    instituteId: user.defaultInstituteId,
    createdBy: user.userId,
    updatedBy: user.userId,
  };
  return await libraryCreationService.addCategory(data);
}

export async function getAllCategories(user) {
  return await libraryCreationService.getAllCategories(user.defaultInstituteId);
}

export async function updateCategory(body, user) {
  const { libraryCategoryId, name } = body;
  const data = { updatedBy: user.userId };
  if (name !== undefined) data.name = name;

  const updated = await libraryCreationService.updateCategory(libraryCategoryId, data);
  if (!updated) {
    throw httpError("Category not found", 404);
  }
}

export async function deleteCategory(libraryCategoryId) {
  const transaction = await sequelize.transaction();
  const categoryId = Number(libraryCategoryId);

  try {
    await libraryCreationService.deleteCategoryMappingsByCategoryId(categoryId, transaction);

    const deleted = await libraryCreationService.deleteCategory(categoryId, transaction);
    if (!deleted) {
      await transaction.rollback();
      throw httpError("Category not found", 404);
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function addLibrary(body, user) {
  const { instituteId, name, description, floors, campusId } = body;
  const payload = {
    instituteId,
    name,
    description: description ?? null,
    floors,
  };

  return createLibraryWithFloors(
    payload,
    user.userId,
    user.userId,
    instituteId,
    user.universityId,
    campusId,
  );
}

async function createLibraryWithFloors(data, createdBy, updatedBy, instituteId, universityId, campusId) {
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

export async function getLibraryDetails(user) {
  return await libraryCreationService.getLibraryDetails(user.universityId);
}

export async function getSingleLibraryDetails(libraryCreationId, user) {
  const library = await libraryCreationService.getSingleLibraryDetails(
    libraryCreationId,
    user.universityId,
  );
  if (!library) {
    throw httpError("Library not found", 404);
  }
  return library;
}

export async function deleteLibray(libraryCreationId) {
  const deleted = await libraryCreationService.deleteLibray(libraryCreationId);
  if (!deleted) {
    throw httpError("Library not found", 404);
  }
  return { libraryCreationId };
}

export async function updateLibrary(body, user) {
  const { libraryCreationId, ...libraryData } = body;
  return updateLibraryRecord(libraryCreationId, libraryData, user.userId);
}

async function updateLibraryRecord(libraryCreationId, libraryData, updatedBy) {
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


export async function addBookWithInventory(body, user) {
  const { book, inventory } = body;
  const inventoryList = Array.isArray(inventory) ? inventory : [inventory];

  return addBookWithInventoryRecord(
    book,
    inventoryList,
    user.userId,
    user.userId,
    user.defaultInstituteId,
  );
}

async function addBookWithInventoryRecord(
  bookData,
  inventoryList,
  createdBy,
  updatedBy,
  instituteId,
) {
  const transaction = await sequelize.transaction();

  try {
    const { bookFields, subjectId, categoryId } = splitBookMappingPayload(bookData);
    const resolvedInstituteId =
      (await libraryCreationService.getInstituteIdByLibraryCreationId(
        bookFields.libraryCreationId,
        transaction,
      )) ?? instituteId;

    const title = bookFields.title?.trim?.() || bookFields.title;
    if (title) {
      const existingBook = await libraryCreationService.findBookByTitle(
        title,
        bookFields.libraryCreationId,
        transaction,
      );
      if (existingBook) {
        throw httpError(`Book title '${title}' already exists`, 409);
      }
    }

    const newBook = await libraryCreationService.createBook(
      {
        ...bookFields,
        createdBy,
        updatedBy,
      },
      transaction,
    );

    const bookId = newBook.libraryBookId;

    if (subjectId !== undefined || categoryId !== undefined) {
      await syncBookMappings(
        bookId,
        { subjectId, categoryId, instituteId: resolvedInstituteId },
        transaction,
      );
    }

    for (const inv of inventoryList) {
      const accessionNumber = inv.accessionNumber?.trim?.() || inv.accessionNumber;
      if (accessionNumber) {
        const exists = await libraryCreationService.inventoryExistsByAccessionNumber(
          accessionNumber,
          transaction,
        );
        if (exists) {
          throw httpError(`Accession number '${accessionNumber}' already exists`, 409);
        }
      }

      await libraryCreationService.createInventory(
        {
          libraryBookId: bookId,
          accessionNumber: accessionNumber ?? null,
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

    return { libraryBookId: bookId };
  } catch (error) {
    await transaction.rollback();
    if (error.statusCode) throw error;
    if (error.name === "SequelizeUniqueConstraintError") {
      const value = error.errors?.[0]?.value;
      throw httpError(
        value ? `Accession number '${value}' already exists` : "Duplicate record",
        409,
      );
    }
    throw httpError(error.message || "Unable to add book and inventory", 500);
  }
}

async function enrichBooksWithCategoriesAndSubjects(books) {
  if (!books || books.length === 0) return books;
  return books.map(applyBookMappingLists);
}

export async function getAllBooks(query, user) {
  const { libraryCreationId, libraryFloorId } = query;
  const books = await libraryCreationService.getAllBooks(
    user.universityId,
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
  if (!bookRow) {
    if (!transaction) {
      throw httpError("Book not found", 404);
    }
    return null;
  }
  const enriched = await enrichBooksWithCategoriesAndSubjects([bookRow]);
  return enriched[0];
}

export async function updateBookFromRequest(body, user) {
  const { libraryBookId, ...bookData } = body;
  bookData.updatedBy = user.userId;

  await updateBook(libraryBookId, bookData, undefined, user.defaultInstituteId);
  return getSingleBookDetails(libraryBookId);
}

export async function updateInventoryFromRequest(body) {
  const { inventoryId, ...inventoryData } = body;
  return updateInventory(inventoryId, inventoryData);
}

export async function updateBook(libraryBookId, bookData, transaction, fallbackInstituteId) {
  const { bookFields, subjectId, categoryId } = splitBookMappingPayload(bookData);
  const hasBookFields = Object.keys(bookFields).length > 0;

  if (hasBookFields) {
    await libraryCreationService.updateBook(libraryBookId, bookFields, transaction);
  }

  if (subjectId !== undefined || categoryId !== undefined) {
    const instituteId =
      (await libraryCreationService.getInstituteIdByLibraryBookId(
        libraryBookId,
        transaction,
      )) ??
      (bookFields.libraryCreationId
        ? await libraryCreationService.getInstituteIdByLibraryCreationId(
            bookFields.libraryCreationId,
            transaction,
          )
        : null) ??
      fallbackInstituteId;

    await syncBookMappings(
      libraryBookId,
      { subjectId, categoryId, instituteId },
      transaction,
    );
  }

  if (!hasBookFields && subjectId === undefined && categoryId === undefined) {
    return await libraryCreationService.updateBook(libraryBookId, bookData, transaction);
  }
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
  const deleted = await libraryCreationService.deleteBook(libraryBookId);
  if (!deleted) {
    throw httpError("Book not found", 404);
  }
}

export async function deleteInventoryCopy(inventoryId) {
  const deleted = await libraryCreationService.deleteInventoryCopy(inventoryId);
  if (!deleted) {
    throw httpError("Copy not found", 404);
  }
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

export async function updateBookWithInventory(body, user) {
  const { book, inventory } = body;

  return updateBookWithInventoryRecord(
    {
      book,
      inventory,
      inventoryKeyPresent: "inventory" in body,
    },
    user.userId,
    user.defaultInstituteId,
  );
}

async function updateBookWithInventoryRecord(
  { book, inventory, inventoryKeyPresent },
  userId,
  fallbackInstituteId,
) {
  const transaction = await sequelize.transaction();

  try {
    const response = {};
    let libraryBookId = book?.libraryBookId ?? null;

    if (book) {
      const { libraryBookId: bookId, ...bookData } = book;
      libraryBookId = bookId;
      bookData.updatedBy = userId;
      await updateBook(bookId, bookData, transaction, fallbackInstituteId);
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

export async function bulkUploadBooks(files, query, user) {
  const excelFile = files?.book;
  if (!excelFile) {
    throw httpError("Excel file is required", 400);
  }

  const excelData = fileHandler.readExcelFile(excelFile.data);
  if (!excelData) {
    throw httpError("Error reading the Excel file", 400);
  }

  const result = await bulkUploadBooksFromRows(
    excelData,
    user.userId,
    user.userId,
    query.libraryCreationId,
    user.defaultInstituteId,
  );

  if (result.status === "error") {
    throw httpError(result.message, 400);
  }

  return result;
}

async function bulkUploadBooksFromRows(rows, createdBy, updatedBy, libraryCreationId, instituteId) {
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
  const resolvedInstituteId =
    instituteId ??
    (await libraryCreationService.getInstituteIdByLibraryCreationId(libraryCreationId, transaction));

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

          const { subjectId: _subjectId, categoryId: _categoryId, ...bookFields } = book;

          const newBook = await libraryCreationService.createBook(
            {
              ...bookFields,
              isbn: book.isbn ?? null,
              libraryCreationId: book.libraryCreationId || libraryCreationId || null,
              createdBy,
              updatedBy,
            },
            transaction,
          );
          libraryBookId = newBook.libraryBookId;

          await syncBookMappings(
            libraryBookId,
            {
              subjectId: resolvedSubjectIds,
              categoryId: resolvedCategoryIds,
              instituteId: resolvedInstituteId,
            },
            transaction,
          );
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
