import * as model from "../models/index.js";
import { Op } from "sequelize";
import sequelize from "../database/sequelizeConfig.js";

export async function addLibrary(libraryData, transaction) {
  try {
    const result = await model.libraryCreationModel.create(libraryData, { transaction });
    return result;
  } catch (error) {
    console.error("Error in add library :", error);
    throw error;
  }
}

export async function addCategory(categoryData, transaction) {
  return await model.libraryCategoryModel.create(categoryData, { transaction });
}

export async function getAllCategories(instituteId) {
  return await model.libraryCategoryModel.findAll({
    where: instituteId ? { instituteId } : {},
    attributes: ["libraryCategoryId", "name", "instituteId", "createdAt"]
  });
}

export async function updateCategory(libraryCategoryId, data) {
  const [updated] = await model.libraryCategoryModel.update(data, { where: { libraryCategoryId } });
  return updated > 0;
}

export async function findBooksContainingCategoryId(libraryCategoryId, transaction) {
  const categoryId = Number(libraryCategoryId);

  return await model.libraryBookModel.findAll({
    attributes: ["libraryBookId", "categoryId"],
    where: {
      [Op.and]: [
        { categoryId: { [Op.ne]: null } },
        sequelize.literal(`JSON_CONTAINS(category_id, '${categoryId}', '$')`),
      ],
    },
    transaction,
  });
}

export async function deleteCategory(libraryCategoryId, transaction) {
  const deleted = await model.libraryCategoryModel.destroy({
    where: { libraryCategoryId },
    transaction,
  });
  return deleted > 0;
}

export async function addLibraryAuthority(libraryData, transaction) {
  try {
    const result = await model.libraryAuthorityModel.create(libraryData, { transaction });
    return result;
  } catch (error) {
    console.error("Error in add library Authority:", error);
    throw error;
  }
}

export async function getLibraryDetails(universityId) {
  try {
    const libraries = await model.libraryCreationModel.findAll({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "instituteId", "createdBy", "updatedBy"] },
      include: [
        {
          model: model.userModel,
          as: "userLibraryCreation",
          attributes: ["universityId", "userId"],
          where: { universityId },
        },
        {
          model: model.libraryFloorModel,
          as: "floorDetails",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "instituteId", "createdBy", "updatedBy"] },
          where: { universityId },
        },
        {
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
        },
      ],
    });

    return libraries;
  } catch (error) {
    console.error("Error fetching library details:", error);
    throw error;
  }
}

export async function getSingleLibraryDetails(libraryCreationId, universityId) {
  try {
    const library = await model.libraryCreationModel.findOne({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "instituteId", "createdBy", "updatedBy"] },
      where: { libraryCreationId },
      include: [
        {
          model: model.userModel,
          as: "userLibraryCreation",
          attributes: ["universityId", "userId"],
          // where: { universityId }
        },
        {
          model: model.libraryFloorModel,
          as: "floorDetails",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "instituteId", "createdBy", "updatedBy"] },
        },
        {
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
        },
      ],
    });

    return library;
  } catch (error) {
    console.error("Error fetching library details:", error);
    throw error;
  }
}

export async function deleteLibray(libraryCreationId) {
  const deleted = await model.libraryCreationModel.destroy({ where: { libraryCreationId: libraryCreationId } });
  return deleted > 0;
}

export async function updateLibrary(libraryCreationId, libraryData) {
  try {
    const result = await model.libraryCreationModel.update(libraryData, {
      where: { libraryCreationId: libraryCreationId },
    });
    return result;
  } catch (error) {
    console.error(`Error updating library creation ${libraryCreationId}:`, error);
    throw error;
  }
}

export async function updateLibraryAuthority(libraryAuthorityId, libraryData, transaction) {
  try {
    const result = await model.libraryAuthorityModel.update(libraryData, {
      where: {
        libraryAuthorityId: libraryAuthorityId,
      },
      transaction,
    });
    return result;
  } catch (error) {
    console.error(`Error updating library authority ${libraryAuthorityId}:`, error);
    throw error;
  }
}

export async function createBook(bookData, transaction) {
  try {
    return await model.libraryBookModel.create(bookData, { transaction });
  } catch (error) {
    console.error("Error creating book:", error);
    throw error;
  }
}

export async function createInventory(inventoryData, transaction) {
  try {
    return await model.libraryBookInventoryModel.create(inventoryData, { transaction });
  } catch (error) {
    console.error("Error creating inventory:", error);
    throw error;
  }
}

export async function getAllBooks(universityId, libraryCreationId, libraryFloorId) {
  const floor = await model.libraryFloorModel.findOne({
    attributes: ["libraryFloorId"],
    where: {
      libraryFloorId,
      universityId,
      libraryCreationId,
    },
  });

  if (!floor) return [];

  return model.libraryBookModel.findAll({
    where: { libraryCreationId },
    attributes: {
      exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"],
    },
    include: [
      {
        model: model.libraryBookInventoryModel,
        as: "inventoryCopies",
        attributes: {
          exclude: ["createdAt", "updatedAt", "deletedAt"],
        },
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
      },
    ],
    order: [
      ["libraryBookId", "DESC"],
      [{ model: model.libraryBookInventoryModel, as: "inventoryCopies" }, "inventoryId", "DESC"],
    ],
  });
}

export async function getSingleBookDetails(libraryBookId, transaction) {
  return await model.libraryBookModel.findOne({
    where: { libraryBookId },
    transaction,
    attributes: {
      exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"],
    },
    include: [
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
            attributes: ["employee_id", "employeeCode", "department", "employeeName"],
          },
        ],
      },
    ],
  });
}

export async function updateBook(libraryBookId, data, transaction) {
  try {
    const result = await model.libraryBookModel.update(data, {
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
    const result = await model.libraryBookInventoryModel.update(data, {
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

export async function countInventoryCopiesByLibraryBookId(libraryBookId, transaction) {
  return model.libraryBookInventoryModel.count({
    where: { libraryBookId },
    transaction,
  });
}

export async function deleteBook(libraryBookId) {
  const t = await sequelize.transaction();
  try {
    await model.libraryBookInventoryModel.destroy({
      where: { libraryBookId },
      transaction: t,
    });

    const deletedBook = await model.libraryBookModel.destroy({
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
    const deleted = await model.libraryBookInventoryModel.destroy({
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

/** Soft-deletes all inventory rows for a book except those in keepInventoryIds. Empty keepInventoryIds deletes every copy for the book. */
export async function deleteInventoryCopiesForBookExceptIds(
  libraryBookId,
  keepInventoryIds,
  transaction,
) {
  const keep = [...new Set((keepInventoryIds || []).map(Number).filter((n) => !Number.isNaN(n)))];
  const where = { libraryBookId };
  if (keep.length > 0) {
    where.inventoryId = { [Op.notIn]: keep };
  }
  return await model.libraryBookInventoryModel.destroy({ where, transaction });
}

export async function getLibraryBookIdByInventoryId(inventoryId, transaction) {
  const row = await model.libraryBookInventoryModel.findByPk(inventoryId, {
    attributes: ["libraryBookId"],
    transaction,
  });
  return row?.libraryBookId ?? null;
}

export async function getAllIssuedBooks() {
  try {
    const result = await model.libraryBookInventoryModel.findAll({
      where: { status: "issued" },
      attributes: { exclude: ["deletedAt"] },

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
            "subjectId",
            "categoryId",
            "classSectionsId",
            "remark",
            "itemType",
          ],
          include: [
            {
              model: model.libraryCreationModel,
              as: "library",
              attributes: {
                exclude: ["createdAt", "updatedAt", "deletedAt"],
              },
            },
          ],
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
          attributes: ["employee_id", "employeeCode", "department", "employeeName"],
        },
        {
          model: model.libraryAisleModel,
          as: "aisleDetails",
          include: [
            {
              model: model.libraryFloorModel,
              as: "floor",
              attributes: {
                exclude: ["createdAt", "updatedAt", "deletedAt"],
              },
            },
          ],
        },
      ],
    });

    return result;
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
            "subjectId",
            "categoryId",
            "classSectionsId",
            "remark",
            "itemType",
          ],
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

export async function getBooksIssuedToEmployee(employeeId) {
  try {
    const result = await model.libraryBookInventoryModel.findAll({
      where: { employeeId, status: "issued" },

      attributes: [
        "inventoryId",
        "libraryBookId",
        "accessionNumber",
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
            "subjectId",
            "categoryId",
            "classSectionsId",
            "remark",
            "itemType",
          ],
        },
        {
          model: model.employeeModel,
          as: "employeeDetailsBook",
          attributes: ["employee_id", "employeeCode", "department", "employeeName"],
        },
      ],
    });

    return result;
  } catch (error) {
    console.error("Error fetching employee issued books:", error);
    throw new Error("Failed to fetch books issued to employee. " + error.message);
  }
}

export async function findBookByIsbn(isbn, transaction) {
  return model.libraryBookModel.findOne({
    where: { isbn },
    transaction,
  });
}

export async function findBookByTitle(title, libraryCreationId, transaction) {
  const where = {
    [Op.and]: [
      sequelize.where(
        sequelize.fn("LOWER", sequelize.col("title")),
        title.trim().toLowerCase(),
      ),
    ],
  };

  if (libraryCreationId != null) {
    where.libraryCreationId = libraryCreationId;
  }

  return model.libraryBookModel.findOne({
    where,
    transaction,
  });
}

export async function createInventoryBulk(data, transaction) {
  return model.libraryBookInventoryModel.create(data, { transaction });
}

export async function getCategoriesByIds(ids) {
  if (!ids || ids.length === 0) return [];
  return await model.libraryCategoryModel.findAll({
    where: { libraryCategoryId: ids },
    attributes: ["libraryCategoryId", "name"]
  });
}

export async function getSubjectsByIds(ids) {
  if (!ids || ids.length === 0) return [];
  return await model.subjectModel.findAll({
    where: { subjectId: ids },
    attributes: ["subjectId", "subjectName"]
  });
}

export async function getCategoriesByNames(names) {
  if (!names || names.length === 0) return [];
  return await model.libraryCategoryModel.findAll({
    where: { name: names },
    attributes: ["libraryCategoryId", "name"],
  });
}

export async function getSubjectsByNames(names) {
  if (!names || names.length === 0) return [];
  return await model.subjectModel.findAll({
    where: { subjectName: names },
    attributes: ["subjectId", "subjectName"],
  });
}
