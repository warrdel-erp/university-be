import * as model from "../models/index.js";
import { Op, fn, col, where } from "sequelize";
import sequelize from "../database/sequelizeConfig.js";
import { buildScope, scoped } from "../utility/scoped.js";

function bookMappingIncludes() {
  return [
    {
      model: model.libraryBookCategoryMappingModel,
      as: "categoryMappings",
      attributes: ["libraryCategoryMappingId", "libraryCategoryId"],
      required: false,
      include: [
        {
          model: model.libraryCategoryModel,
          as: "category",
          attributes: ["libraryCategoryId", "name"],
        },
      ],
    },
    {
      model: model.libraryBookSubjectMappingModel,
      as: "subjectMappings",
      attributes: ["librarySubjectMappingId", "librarySubjectId"],
      required: false,
      include: [
        {
          model: model.subjectModel,
          as: "subject",
          attributes: ["subjectId", "subjectName"],
        },
      ],
    },
  ];
}

function userLibraryCreationInclude() {
  return {
    model: model.userModel,
    as: "userLibraryCreation",
    attributes: ["universityId", "userId"],
    where: buildScope(model.userModel),
    required: true,
  };
}

function scopedLibraryInclude(required = true) {
  return {
    model: model.libraryCreationModel,
    as: "library",
    attributes: ["libraryCreationId", "instituteId"],
    where: buildScope(model.libraryCreationModel),
    required,
  };
}

function scopedLibraryFloorInclude() {
  return {
    model: model.libraryFloorModel,
    as: "floorDetails",
    attributes: {
      exclude: ["createdAt", "updatedAt", "deletedAt", "instituteId", "createdBy", "updatedBy"],
    },
    where: buildScope(model.libraryFloorModel),
  };
}

function libraryInstituteInclude() {
  return {
    model: model.instituteModel,
    as: "libraryCreationInstitute",
    attributes: ["instituteName"],
    include: [
      {
        model: model.campusModel,
        as: "campues",
        attributes: ["campusName"],
      },
    ],
  };
}

function scopedFloorJoin(as = "floor", required = true) {
  return {
    model: model.libraryFloorModel,
    as,
    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
    where: buildScope(model.libraryFloorModel),
    required,
  };
}

async function assertScopedLibraryCreation(libraryCreationId, transaction) {
  return scoped(model.libraryCreationModel).findOne({
    attributes: ["libraryCreationId", "instituteId"],
    where: { libraryCreationId },
    transaction,
  });
}

async function assertScopedLibraryBook(libraryBookId, transaction) {
  return scoped(model.libraryBookModel).findOne({
    attributes: ["libraryBookId", "libraryCreationId"],
    where: { libraryBookId },
    include: [scopedLibraryInclude()],
    transaction,
  });
}

async function assertScopedInventory(inventoryId, transaction) {
  return scoped(model.libraryBookInventoryModel).findOne({
    where: { inventoryId },
    attributes: ["inventoryId", "libraryBookId"],
    include: [
      {
        model: model.libraryBookModel,
        as: "bookDetails",
        attributes: ["libraryBookId"],
        required: true,
        include: [scopedLibraryInclude()],
      },
    ],
    transaction,
  });
}

async function assertScopedCategory(libraryCategoryId, transaction) {
  return scoped(model.libraryCategoryModel).findOne({
    attributes: ["libraryCategoryId"],
    where: { libraryCategoryId },
    transaction,
  });
}

export async function addCategory(categoryData, transaction) {
  return scoped(model.libraryCategoryModel).create(categoryData, { transaction });
}

export async function getAllCategories() {
  return scoped(model.libraryCategoryModel).findAll({
    attributes: ["libraryCategoryId", "name", "instituteId", "createdAt"],
  });
}

export async function updateCategory(libraryCategoryId, data) {
  const existing = await assertScopedCategory(libraryCategoryId);
  if (!existing) {
    return false;
  }
  const [updated] = await scoped(model.libraryCategoryModel).update(data, {
    where: { libraryCategoryId },
  });
  return updated > 0;
}

export async function deleteCategoryMappingsByCategoryId(libraryCategoryId, transaction) {
  const category = await assertScopedCategory(libraryCategoryId, transaction);
  if (!category) {
    return 0;
  }
  return scoped(model.libraryBookCategoryMappingModel).destroy({
    where: { libraryCategoryId },
    transaction,
  });
}

export async function deleteCategoryMappingsByBookId(libraryBookId, transaction) {
  const book = await assertScopedLibraryBook(libraryBookId, transaction);
  if (!book) {
    return 0;
  }
  return scoped(model.libraryBookCategoryMappingModel).destroy({
    where: { libraryBookId },
    transaction,
  });
}

export async function deleteSubjectMappingsByBookId(libraryBookId, transaction) {
  const book = await assertScopedLibraryBook(libraryBookId, transaction);
  if (!book) {
    return 0;
  }
  return scoped(model.libraryBookSubjectMappingModel).destroy({
    where: { libraryBookId },
    transaction,
  });
}

export async function replaceBookCategoryMappings(libraryBookId, categoryId, transaction) {
  const book = await assertScopedLibraryBook(libraryBookId, transaction);
  if (!book) {
    throw new Error("Book not found");
  }

  await deleteCategoryMappingsByBookId(libraryBookId, transaction);

  const uniqueId = [...new Set((categoryId || []).map(Number).filter((id) => !Number.isNaN(id) && id > 0))];
  if (!uniqueId.length) return [];

  return scoped(model.libraryBookCategoryMappingModel).bulkCreate(
    uniqueId.map((libraryCategoryId) => ({
      libraryBookId,
      libraryCategoryId,
    })),
    { transaction },
  );
}

export async function replaceBookSubjectMappings(libraryBookId, subjectId, transaction) {
  const book = await assertScopedLibraryBook(libraryBookId, transaction);
  if (!book) {
    throw new Error("Book not found");
  }

  await deleteSubjectMappingsByBookId(libraryBookId, transaction);

  const uniqueId = [...new Set((subjectId || []).map(Number).filter((id) => !Number.isNaN(id) && id > 0))];
  if (!uniqueId.length) return [];

  return scoped(model.libraryBookSubjectMappingModel).bulkCreate(
    uniqueId.map((librarySubjectId) => ({
      libraryBookId,
      librarySubjectId,
    })),
    { transaction },
  );
}

export async function getInstituteIdByLibraryCreationId(libraryCreationId, transaction) {
  const row = await assertScopedLibraryCreation(libraryCreationId, transaction);
  return row?.instituteId ?? null;
}

export async function getInstituteIdByLibraryBookId(libraryBookId, transaction) {
  const row = await assertScopedLibraryBook(libraryBookId, transaction);
  if (!row) {
    return null;
  }
  const library = await assertScopedLibraryCreation(row.libraryCreationId, transaction);
  return library?.instituteId ?? null;
}

export async function deleteCategory(libraryCategoryId, transaction) {
  const existing = await assertScopedCategory(libraryCategoryId, transaction);
  if (!existing) {
    return false;
  }
  const deleted = await scoped(model.libraryCategoryModel).destroy({
    where: { libraryCategoryId },
    transaction,
  });
  return deleted > 0;
}

export async function getLibraryDetails() {
  try {
    return await scoped(model.libraryCreationModel).findAll({
      attributes: {
        exclude: ["createdAt", "updatedAt", "deletedAt", "instituteId", "createdBy", "updatedBy"],
      },
      include: [userLibraryCreationInclude(), scopedLibraryFloorInclude(), libraryInstituteInclude()],
    });
  } catch (error) {
    console.error("Error fetching library details:", error);
    throw error;
  }
}

export async function getSingleLibraryDetails(libraryCreationId) {
  try {
    return await scoped(model.libraryCreationModel).findOne({
      attributes: {
        exclude: ["createdAt", "updatedAt", "deletedAt", "instituteId", "createdBy", "updatedBy"],
      },
      where: { libraryCreationId },
      include: [userLibraryCreationInclude(), scopedLibraryFloorInclude(), libraryInstituteInclude()],
    });
  } catch (error) {
    console.error("Error fetching library details:", error);
    throw error;
  }
}

export async function deleteLibray(libraryCreationId) {
  const existing = await assertScopedLibraryCreation(libraryCreationId);
  if (!existing) {
    return false;
  }
  const deleted = await scoped(model.libraryCreationModel).destroy({
    where: { libraryCreationId },
  });
  return deleted > 0;
}

export async function updateLibrary(libraryCreationId, libraryData) {
  try {
    const existing = await assertScopedLibraryCreation(libraryCreationId);
    if (!existing) {
      return [0];
    }

    return await scoped(model.libraryCreationModel).update(libraryData, {
      where: { libraryCreationId },
    });
  } catch (error) {
    console.error(`Error updating library creation ${libraryCreationId}:`, error);
    throw error;
  }
}

export async function createBook(bookData, transaction) {
  try {
    if (bookData.libraryCreationId != null) {
      const library = await assertScopedLibraryCreation(bookData.libraryCreationId, transaction);
      if (!library) {
        throw new Error("Library not found");
      }
    }
    return await scoped(model.libraryBookModel).create(bookData, { transaction });
  } catch (error) {
    console.error("Error creating book:", error);
    throw error;
  }
}

export async function inventoryExistsByAccessionNumber(accessionNumber, transaction) {
  const row = await model.libraryBookInventoryModel.findOne({
    where: { accessionNumber },
    attributes: ["inventoryId"],
    transaction,
  });
  return Boolean(row);
}

export async function createInventory(inventoryData, transaction) {
  const book = await assertScopedLibraryBook(inventoryData.libraryBookId, transaction);
  if (!book) {
    throw new Error("Book not found");
  }
  return scoped(model.libraryBookInventoryModel).create(inventoryData, { transaction });
}

export async function findEmployeeIdByUserId(userId, transaction) {
  const employee = await scoped(model.employeeModel).findOne({
    where: { userId },
    attributes: ["employeeId"],
    transaction,
  });
  return employee ? employee.employeeId : null;
}

function buildBookListWhere(libraryCreationId, filters = {}) {
  const where = { libraryCreationId };

  if (!filters.search) {
    return where;
  }

  const term = filters.search.trim();
  const pattern = { [Op.like]: `%${term}%` };
  const orConditions = [
    { title: pattern },
    { subtitle: pattern },
    { authors: pattern },
    { isbn: pattern },
    { publisher: pattern },
    { keywords: pattern },
    { '$inventoryCopies.accession_number$': pattern },
    { '$inventoryCopies.status$': pattern },
    { '$inventoryCopies.bill_no$': pattern },
    { '$inventoryCopies.bill_date$': pattern },
    { '$inventoryCopies.accession_date$': pattern },
  ];

  const numericId = Number(term);
  if (term !== "" && !Number.isNaN(numericId)) {
    orConditions.push({ libraryBookId: numericId });
  }

  where[Op.and] = [{ [Op.or]: orConditions }];
  return where;
}

export async function getAllBooks(libraryCreationId, libraryFloorId, filters = {}, pagination = {}) {
  if (libraryCreationId) {
    const library = await assertScopedLibraryCreation(libraryCreationId);
    if (!library) {
      return { total: 0, books: [] };
    }
  }

  if (libraryFloorId) {
    const floor = await scoped(model.libraryFloorModel).findOne({
      attributes: ["libraryFloorId"],
      where: {
        libraryFloorId,
        ...(libraryCreationId ? { libraryCreationId } : {}),
      },
    });

    if (!floor) {
      return { total: 0, books: [] };
    }
  }

  const inventoryWhere = {};

  if (libraryFloorId) {
    const aisles = await scoped(model.libraryAisleModel).findAll({
      attributes: ["libraryAisleId"],
      where: { libraryFloorId },
      include: [scopedFloorJoin()],
      raw: true,
    });

    const aisleIds = aisles.map((row) => row.libraryAisleId);
    if (!aisleIds.length) {
      return { total: 0, books: [] };
    }

    inventoryWhere.libraryAisleId = { [Op.in]: aisleIds };
  }

  const inventoryInclude = {
    model: model.libraryBookInventoryModel,
    as: "inventoryCopies",
    attributes: {
      exclude: ["createdAt", "updatedAt", "deletedAt"],
    },
    where: Object.keys(inventoryWhere).length ? inventoryWhere : undefined,
    required: true,
    include: [
      {
        model: model.libraryAisleModel,
        as: "aisleDetails",
        attributes: ["libraryAisleId", "name", "libraryFloorId"],
        required: false,
      },
      {
        model: model.libraryRackModel,
        as: "rackDetails",
        attributes: ["libraryRackId", "name"],
        required: false,
      },
      {
        model: model.libraryRowModel,
        as: "rowDetails",
        attributes: ["libraryRowId", "name"],
        required: false,
      },
    ],
  };

  const { limit, offset } = pagination;

  const { count, rows } = await scoped(model.libraryBookModel).findAndCountAll({
    where: buildBookListWhere(libraryCreationId, filters),
    subQuery: false,
    distinct: true,
    col: "library_book_id",
    attributes: {
      exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"],
    },
    include: [...bookMappingIncludes(), scopedLibraryInclude(), inventoryInclude],
    limit,
    offset,
    order: [
      ["libraryBookId", "DESC"],
      [{ model: model.libraryBookInventoryModel, as: "inventoryCopies" }, "inventoryId", "DESC"],
    ],
  });

  return { total: count, books: rows };
}

const EMPTY_BOOK_SUMMARY = {
  totalBooks: 0,
  inStock: 0,
  lowStock: 0,
  totalCopies: 0,
};

const AVAILABLE_INVENTORY_STATUS = "available";

function buildBookDetailsInclude() {
  return {
    model: model.libraryBookModel,
    as: "bookDetails",
    attributes: [],
    required: true,
    include: [scopedLibraryInclude()],
  };
}

async function resolveBookSummaryScope(libraryCreationId, libraryFloorId) {
  if (libraryCreationId) {
    const library = await assertScopedLibraryCreation(libraryCreationId);
    if (!library) {
      return null;
    }
  }

  const inventoryWhere = {};
  const requireInventoryJoin = Boolean(libraryFloorId);

  if (libraryFloorId) {
    const floor = await scoped(model.libraryFloorModel).findOne({
      attributes: ["libraryFloorId"],
      where: {
        libraryFloorId,
        ...(libraryCreationId ? { libraryCreationId } : {}),
      },
    });

    if (!floor) {
      return null;
    }

    const aisles = await scoped(model.libraryAisleModel).findAll({
      attributes: ["libraryAisleId"],
      where: { libraryFloorId },
      include: [scopedFloorJoin()],
      raw: true,
    });

    const aisleIds = aisles.map((row) => row.libraryAisleId);
    if (!aisleIds.length) {
      return null;
    }

    inventoryWhere.libraryAisleId = { [Op.in]: aisleIds };
  }

  return {
    inventoryWhere,
    requireInventoryJoin,
  };
}

function summarizePerBookInventoryStats(perBookStats, totalBooks, lowStockThreshold, requireInventoryJoin) {
  let totalCopies = 0;
  let inStock = 0;
  let lowStock = 0;

  for (const row of perBookStats) {
    const copies = Number(row.totalCopies) || 0;
    const available = Number(row.availableCount) || 0;
    totalCopies += copies;
    inStock += available;
    if (available <= lowStockThreshold) {
      lowStock += 1;
    }
  }

  if (!requireInventoryJoin) {
    const booksWithoutInventory = Math.max(0, Number(totalBooks) - perBookStats.length);
    lowStock += booksWithoutInventory;
  }

  return { totalCopies, inStock, lowStock };
}

export async function getBookSummaryStats(
  libraryCreationId,
  libraryFloorId,
  lowStockThreshold = 2,
) {
  const scope = await resolveBookSummaryScope(libraryCreationId, libraryFloorId);
  if (!scope) {
    return { ...EMPTY_BOOK_SUMMARY };
  }

  const { inventoryWhere, requireInventoryJoin } = scope;
  const hasInventoryWhere = Object.keys(inventoryWhere).length > 0;
  const bookDetailsInclude = {
    ...buildBookDetailsInclude(),
    where: libraryCreationId ? { libraryCreationId } : undefined,
  };
  const availableCountExpr = fn(
    "SUM",
    fn("IF", where(col("status"), AVAILABLE_INVENTORY_STATUS), 1, 0),
  );
  const inventoryIncludeForBookCount = {
    model: model.libraryBookInventoryModel,
    as: "inventoryCopies",
    attributes: [],
    where: hasInventoryWhere ? inventoryWhere : undefined,
    required: requireInventoryJoin,
  };

  const bookWhere = libraryCreationId ? { libraryCreationId } : {};

  const [totalBooks, perBookStats] = await Promise.all([
    scoped(model.libraryBookModel).count({
      where: bookWhere,
      include: [scopedLibraryInclude(), inventoryIncludeForBookCount],
      distinct: true,
      col: "library_book_id",
    }),
    scoped(model.libraryBookInventoryModel).findAll({
      attributes: [
        "libraryBookId",
        [fn("COUNT", col("library_book_inventory.inventory_id")), "totalCopies"],
        [availableCountExpr, "availableCount"],
      ],
      where: hasInventoryWhere ? inventoryWhere : undefined,
      include: [bookDetailsInclude],
      group: ["libraryBookId"],
      raw: true,
      subQuery: false,
    }),
  ]);

  const { totalCopies, inStock, lowStock } = summarizePerBookInventoryStats(
    perBookStats,
    totalBooks,
    lowStockThreshold,
    requireInventoryJoin,
  );

  return {
    totalBooks: Number(totalBooks) || 0,
    inStock,
    lowStock,
    totalCopies,
  };
}

export async function bookExistsById(libraryBookId, transaction) {
  const row = await assertScopedLibraryBook(libraryBookId, transaction);
  return Boolean(row);
}

export async function getSingleBookDetails(libraryBookId, transaction) {
  const book = await assertScopedLibraryBook(libraryBookId, transaction);
  if (!book) {
    return null;
  }

  return scoped(model.libraryBookModel).findOne({
    where: { libraryBookId },
    transaction,
    attributes: {
      exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"],
    },
    include: [
      ...bookMappingIncludes(),
      {
        model: model.libraryBookInventoryModel,
        as: "inventoryCopies",
        attributes: {
          exclude: ["createdAt", "updatedAt", "deletedAt"],
        },
        include: [
          {
            model: model.libraryAisleModel,
            as: "aisleDetails",
            attributes: ["libraryAisleId", "name", "description", "libraryFloorId"],
          },
          {
            model: model.libraryRackModel,
            as: "rackDetails",
            attributes: ["libraryRackId", "name", "description"],
          },
          {
            model: model.libraryRowModel,
            as: "rowDetails",
            attributes: ["libraryRowId", "name", "description"],
          },
          {
            model: model.studentModel,
            as: "studentDetailsBook",
            attributes: [
              "student_id",
              "firstName",
              "middleName",
              "lastName",
              "fatherName",
              "scholarNumber",
              "email",
              "phoneNumber",
            ],
          },
          {
            model: model.employeeModel,
            as: "employeeDetailsBook",
            attributes: ["employeeId", "userId", "employeeCode", "departmentId", "employeeName"],
          },
        ],
      },
    ],
  });
}

export async function updateBook(libraryBookId, data, transaction) {
  try {
    const existing = await assertScopedLibraryBook(libraryBookId, transaction);
    if (!existing) {
      throw new Error(`No book found with ID ${libraryBookId}`);
    }

    const result = await scoped(model.libraryBookModel).update(data, {
      where: { libraryBookId },
      transaction,
    });

    if (result[0] === 0) {
      throw new Error(`No book found with ID ${libraryBookId}`);
    }

    return result;
  } catch (error) {
    console.error(`Error updating book (ID: ${libraryBookId}):`, error);
    throw new Error("Failed to update book. " + error.message);
  }
}

export async function updateInventory(inventoryId, data, transaction) {
  try {
    const existing = await assertScopedInventory(inventoryId, transaction);
    if (!existing) {
      throw new Error(`No inventory copy found with ID ${inventoryId}`);
    }

    const result = await scoped(model.libraryBookInventoryModel).update(data, {
      where: { inventoryId },
      transaction,
    });

    if (result[0] === 0) {
      throw new Error(`No inventory copy found with ID ${inventoryId}`);
    }

    return result;
  } catch (error) {
    console.error(`Error updating inventory (ID: ${inventoryId}):`, error);
    throw new Error("Failed to update inventory. " + error.message);
  }
}

export async function deleteBook(libraryBookId) {
  const t = await sequelize.transaction();
  try {
    const book = await assertScopedLibraryBook(libraryBookId, t);
    if (!book) {
      await t.rollback();
      throw new Error(`No book found with ID ${libraryBookId}`);
    }

    await deleteCategoryMappingsByBookId(libraryBookId, t);
    await deleteSubjectMappingsByBookId(libraryBookId, t);

    await scoped(model.libraryBookInventoryModel).destroy({
      where: { libraryBookId },
      transaction: t,
    });

    const deletedBook = await scoped(model.libraryBookModel).destroy({
      where: { libraryBookId },
      transaction: t,
    });

    if (deletedBook === 0) {
      throw new Error(`No book found with ID ${libraryBookId}`);
    }
    await t.commit();
    return {
      message: "Book deleted successfully",
      bookDeleted: true,
    };
  } catch (error) {
    await t.rollback();
    console.error(`Error deleting book (ID: ${libraryBookId}):`, error);
    throw new Error("Failed to delete book. " + error.message);
  }
}

export async function deleteInventoryCopy(inventoryId) {
  try {
    const existing = await assertScopedInventory(inventoryId);
    if (!existing) {
      throw new Error(`No inventory copy found with ID ${inventoryId}`);
    }

    const deleted = await scoped(model.libraryBookInventoryModel).destroy({
      where: { inventoryId },
    });

    if (deleted === 0) {
      throw new Error(`No inventory copy found with ID ${inventoryId}`);
    }

    return { inventoryDeleted: true };
  } catch (error) {
    console.error(`Error deleting inventory copy (ID: ${inventoryId}):`, error);
    throw new Error("Failed to delete inventory copy. " + error.message);
  }
}

export async function getLibraryBookIdByInventoryId(inventoryId, transaction) {
  const row = await assertScopedInventory(inventoryId, transaction);
  return row?.libraryBookId ?? null;
}

export async function getAllIssuedBooks() {
  try {
    return await scoped(model.libraryBookInventoryModel).findAll({
      where: { status: "issued" },
      attributes: { exclude: ["deletedAt"] },
      include: [
        {
          model: model.libraryBookModel,
          as: "bookDetails",
          required: true,
          attributes: [
            "libraryBookId",
            "title",
            "subtitle",
            "authors",
            "publisher",
            "edition",
            "isbn",
            "issn",
            "barcode",
            "classSectionsId",
            "remark",
            "itemType",
          ],
          include: [...bookMappingIncludes(), scopedLibraryInclude()],
        },
        {
          model: model.studentModel,
          as: "studentDetailsBook",
          attributes: [
            "student_id",
            "firstName",
            "middleName",
            "lastName",
            "fatherName",
            "scholarNumber",
            "email",
            "phoneNumber",
          ],
        },
        {
          model: model.employeeModel,
          as: "employeeDetailsBook",
          attributes: ["employeeId", "userId", "employeeCode", "departmentId", "employeeName"],
        },
        {
          model: model.libraryAisleModel,
          as: "aisleDetails",
          include: [scopedFloorJoin()],
        },
      ],
    });
  } catch (error) {
    console.error("Error fetching issued books:", error);
    throw new Error("Failed to fetch issued books. " + error.message);
  }
}

export async function getBooksIssuedToStudent(studentId) {
  try {
    const result = await model.libraryBookInventoryModel.findAll({
      where: { studentId, status: "issued" },
      attributes: [
        "inventoryId",
        "libraryBookId",
        "accessionNumber",
        "accessionDate",
        "billNo",
        "billDate",
        "itemPrice",
        "netPrice",
        "currency",
        "studentId",
        "issueDate",
        "dueDate",
        "status",
        "createdAt",
        "updatedAt",
      ],
      include: [
        {
          model: model.libraryBookModel,
          as: "bookDetails",
          attributes: [
            "libraryBookId",
            "title",
            "subtitle",
            "authors",
            "publisher",
            "edition",
            "isbn",
            "issn",
            "barcode",
            "classSectionsId",
            "remark",
            "itemType",
          ],
          include: bookMappingIncludes,
        },
        {
          model: model.studentModel,
          as: "studentDetailsBook",
          attributes: [
            "student_id",
            "firstName",
            "middleName",
            "lastName",
            "fatherName",
            "scholarNumber",
            "email",
            "phoneNumber",
          ],
        },
      ],
    });

    return result;
  } catch (error) {
    console.error("Error fetching student's issued books:", error);
    throw new Error("Failed to fetch books issued to student. " + error.message);
  }
}

export async function getBooksIssuedToEmployee(userId) {
  try {
    const result = await model.libraryBookInventoryModel.findAll({
      where: { status: "issued" },

      attributes: [
        "inventoryId",
        "libraryBookId",
        "accessionNumber",
        "accessionDate",
        "billNo",
        "billDate",
        "itemPrice",
        "netPrice",
        "currency",
        "employeeId",
        "issueDate",
        "dueDate",
        "status",
        "createdAt",
        "updatedAt",
      ],

      include: [
        {
          model: model.libraryBookModel,
          as: "bookDetails",
          attributes: [
            "libraryBookId",
            "title",
            "subtitle",
            "authors",
            "publisher",
            "edition",
            "isbn",
            "issn",
            "barcode",
            "classSectionsId",
            "remark",
            "itemType",
          ],
          include: bookMappingIncludes,
        },
        {
          model: model.employeeModel,
          as: "employeeDetailsBook",
          attributes: ["employeeId", "userId", "employeeCode", "departmentId", "employeeName"],
          where: { userId },
          required: true,
        },
      ],
    });

    return result;
  } catch (error) {
    console.error("Error fetching employee issued books:", error);
    throw new Error("Failed to fetch books issued to employee. " + error.message);
  }
}

export async function findBookByTitle(title, libraryCreationId, transaction) {
  const whereClause = {
    [Op.and]: [
      sequelize.where(
        sequelize.fn("LOWER", sequelize.col("title")),
        title.trim().toLowerCase(),
      ),
    ],
  };

  if (libraryCreationId != null) {
    whereClause.libraryCreationId = libraryCreationId;
  }

  return scoped(model.libraryBookModel).findOne({
    where: whereClause,
    include: libraryCreationId != null ? [scopedLibraryInclude()] : [],
    transaction,
  });
}

export async function getCategoriesByIds(ids, transaction) {
  if (!ids || ids.length === 0) return [];
  return scoped(model.libraryCategoryModel).findAll({
    where: { libraryCategoryId: ids },
    attributes: ["libraryCategoryId", "name"],
    transaction,
  });
}

export async function getSubjectsByIds(ids, transaction) {
  if (!ids || ids.length === 0) return [];
  return scoped(model.subjectModel).findAll({
    where: { subjectId: ids },
    attributes: ["subjectId", "subjectName"],
    transaction,
  });
}
