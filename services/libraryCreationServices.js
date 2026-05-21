import * as libraryCreationService from "../repository/libraryCreationRepository.js";
import * as libraryStructureRepository from "../repository/libraryStructureRepository.js";
import sequelize from "../database/sequelizeConfig.js";



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

