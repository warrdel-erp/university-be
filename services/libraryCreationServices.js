import * as libraryCreationService from "../repository/libraryCreationRepository.js";
import * as libraryStructureRepository from "../repository/libraryStructureRepository.js";
import sequelize from "../database/sequelizeConfig.js";
import { LOW_STOCK_THRESHOLD } from "../constant.js";

const httpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

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

function collectUniqueInventoryValues(copies, field) {
  return [
    ...new Set(
      copies
        .map((inv) => inv[field])
        .filter((value) => value != null && value !== ""),
    ),
  ];
}

function mapInventoryCopiesForList(copies) {
  return copies.map((inv) => ({
    inventoryId: inv.inventoryId,
    accessionNumber: inv.accessionNumber ?? null,
    billNo: inv.billNo ?? null,
    billDate: inv.billDate ?? null,
    status: inv.status ?? null,
    condition: inv.condition ?? null,
    aisleDetails: pickAisleDetails(inv.aisleDetails),
    rackDetails: pickRackDetails(inv.rackDetails),
    rowDetails: pickRowDetails(inv.rowDetails),
  }));
}

function mapBooksToAllBookList(enrichedBooks) {
  return enrichedBooks.map((book) => {
    const copies = book.inventoryCopies ?? [];
    const firstCopy = copies[0] ?? null;

    const accessionNumber = collectUniqueInventoryValues(copies, "accessionNumber");
    const billNo = collectUniqueInventoryValues(copies, "billNo");
    const billDate = collectUniqueInventoryValues(copies, "billDate");

    return {
      libraryBookId: book.libraryBookId,
      libraryCreationId: book.libraryCreationId ?? null,
      title: book.title ?? null,
      author: book.authors ?? null,
      categories: book.categories ?? [],
      subjects: book.subjects ?? [],
      accessionNumber,
      billNo,
      billDate,
      status: firstCopy?.status ?? null,
      condition: firstCopy?.condition ?? null,
      aisleDetails: pickAisleDetails(firstCopy?.aisleDetails),
      rackDetails: pickRackDetails(firstCopy?.rackDetails),
      rowDetails: pickRowDetails(firstCopy?.rowDetails),
      inventoryCopies: mapInventoryCopiesForList(copies),
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

function structureAuditFields(userId) {
  return {
    createdBy: userId,
    updatedBy: userId,
  };
}

function buildAislePayloads(libraryFloorId, count, nameStart, audit) {
  return Array.from({ length: count }, (_, index) => {
    const aisleName = String(nameStart + index);
    return {
      libraryFloorId,
      name: aisleName,
      description: `aisle ${aisleName}`,
      ...audit,
    };
  });
}

function buildRackPayloads(aisles, racksPerAisle, audit) {
  const total = aisles.length * racksPerAisle;
  const payloads = new Array(total);
  let offset = 0;

  for (const aisle of aisles) {
    for (let rackIndex = 1; rackIndex <= racksPerAisle; rackIndex += 1) {
      const rackName = String(rackIndex);
      payloads[offset] = {
        libraryAisleId: aisle.libraryAisleId,
        name: rackName,
        description: `aisle ${aisle.name} rack ${rackName}`,
        ...audit,
      };
      offset += 1;
    }
  }

  return payloads;
}

function buildRowPayloads(racks, rowsPerRack, aisleNameByAisleId, audit) {
  const total = racks.length * rowsPerRack;
  const payloads = new Array(total);
  let offset = 0;

  for (const rack of racks) {
    const aisleName = aisleNameByAisleId.get(rack.libraryAisleId);
    for (let rowIndex = 1; rowIndex <= rowsPerRack; rowIndex += 1) {
      const rowName = String(rowIndex);
      payloads[offset] = {
        libraryRackId: rack.libraryRackId,
        name: rowName,
        description: `aisle ${aisleName} rack ${rack.name} row ${rowName}`,
        ...audit,
      };
      offset += 1;
    }
  }

  return payloads;
}

export async function bulkGenerateFloorStructure(libraryFloorId, body, user) {
  const { aisles, racksPerAisle, rowsPerRack } = body;

  const floor = await libraryStructureRepository.findFloorById(
    libraryFloorId,
    user.universityId,
    user.defaultInstituteId,
  );

  if (!floor) {
    throw httpError("Library floor not found", 404);
  }

  const audit = structureAuditFields(user.userId);
  const transaction = await sequelize.transaction();

  try {
    const maxAisleName =
      await libraryStructureRepository.getMaxNumericAisleNameByFloorId(
        libraryFloorId,
        transaction,
      );
    const aisleNameStart = maxAisleName + 1;

    const createdAisles = await libraryStructureRepository.bulkCreateAisles(
      buildAislePayloads(libraryFloorId, aisles, aisleNameStart, audit),
      transaction,
    );

    const createdRacks = await libraryStructureRepository.bulkCreateRacks(
      buildRackPayloads(createdAisles, racksPerAisle, audit),
      transaction,
    );

    const aisleNameByAisleId = new Map(
      createdAisles.map((aisle) => [aisle.libraryAisleId, aisle.name]),
    );
    const rowPayloads = buildRowPayloads(
      createdRacks,
      rowsPerRack,
      aisleNameByAisleId,
      audit,
    );

    await libraryStructureRepository.bulkCreateRows(rowPayloads, transaction);

    await transaction.commit();

    return {
      libraryFloorId,
      aisleNameStart,
      aisleNameEnd: aisleNameStart + aisles - 1,
      aislesCreated: aisles,
      racksCreated: createdRacks.length,
      rowsCreated: rowPayloads.length,
      aisles: createdAisles.map((aisle) => ({
        libraryAisleId: aisle.libraryAisleId,
        name: aisle.name,
      })),
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

function sortByNumericName(a, b) {
  const diff = Number(a.name) - Number(b.name);
  return Number.isNaN(diff) || diff === 0 ? String(a.name).localeCompare(String(b.name)) : diff;
}

function formatFloorStructureShelf(row) {
  return {
    libraryRowId: row.libraryRowId,
    name: row.name,
    description: row.description,
  };
}

function formatFloorStructureRack(rack) {
  const shelves = (rack.rows ?? []).map(formatFloorStructureShelf).sort(sortByNumericName);
  return {
    libraryRackId: rack.libraryRackId,
    name: rack.name,
    description: rack.description,
    shelves,
  };
}

function formatFloorStructureAisle(aisle) {
  const racks = (aisle.racks ?? []).map(formatFloorStructureRack).sort(sortByNumericName);
  return {
    libraryAisleId: aisle.libraryAisleId,
    name: aisle.name,
    description: aisle.description,
    racks,
  };
}

function formatFloorStructureResponse(floor) {
  const plain = floor.get({ plain: true });
  const aisles = (plain.aisles ?? []).map(formatFloorStructureAisle).sort(sortByNumericName);

  return {
    libraryFloorId: plain.libraryFloorId,
    libraryCreationId: plain.libraryCreationId,
    name: plain.name,
    description: plain.description,
    aisles,
  };
}

export async function getFloorStructure(libraryFloorId, user) {
  const floor = await libraryStructureRepository.findFloorStructureById(
    libraryFloorId,
    user.universityId,
    user.defaultInstituteId,
  );

  if (!floor) {
    throw httpError("Library floor not found", 404);
  }

  return formatFloorStructureResponse(floor);
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
  return await libraryCreationService.getLibraryDetails(
    user.universityId,
    user.defaultInstituteId,
  );
}

export async function getSingleLibraryDetails(libraryCreationId, user) {
  const library = await libraryCreationService.getSingleLibraryDetails(
    libraryCreationId,
    user.universityId,
    user.defaultInstituteId,
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

export async function getBookSummaryStats(query, user) {
  const { libraryCreationId, libraryFloorId } = query;

  return libraryCreationService.getBookSummaryStats(
    user.universityId,
    libraryCreationId,
    libraryFloorId,
    user.defaultInstituteId,
    LOW_STOCK_THRESHOLD,
  );
}

export async function getAllBooks(query, user) {
  const {
    libraryCreationId,
    libraryFloorId,
    page = 1,
    limit = 20,
    search,
  } = query;

  const safeLimit = Math.min(100, Math.max(1, limit));
  const safePage = Math.max(1, page);
  const offset = (safePage - 1) * safeLimit;

  const filters = { search };

  const { total, books } = await libraryCreationService.getAllBooks(
    user.universityId,
    libraryCreationId,
    libraryFloorId,
    filters,
    { limit: safeLimit, offset },
    user.defaultInstituteId,
  );

  if (!books?.length) {
    return {
      books: [],
      pagination: { total: total ?? 0, page: safePage, limit: safeLimit },
    };
  }

  const enrichedBooks = await enrichBooksWithCategoriesAndSubjects(books);
  const floorFiltered = filterBooksByFloor(enrichedBooks, libraryFloorId);

  return {
    books: mapBooksToAllBookList(floorFiltered),
    pagination: { total, page: safePage, limit: safeLimit },
  };
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

export async function getAllIssuedBooks(user) {
  const issuedInventories = await libraryCreationService.getAllIssuedBooks(
    user.defaultInstituteId,
  );
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
