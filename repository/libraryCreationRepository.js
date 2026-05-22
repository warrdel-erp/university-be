import * as model from "../models/index.js";
import { Op } from "sequelize";
import sequelize from "../database/sequelizeConfig.js";

const bookMappingIncludes = [
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

export async function deleteCategoryMappingsByCategoryId(libraryCategoryId, transaction) {
  return model.libraryBookCategoryMappingModel.destroy({
    where: { libraryCategoryId },
    transaction,
  });
}

export async function deleteCategoryMappingsByBookId(libraryBookId, transaction) {
  return model.libraryBookCategoryMappingModel.destroy({
    where: { libraryBookId },
    transaction,
  });
}

export async function deleteSubjectMappingsByBookId(libraryBookId, transaction) {
  return model.libraryBookSubjectMappingModel.destroy({
    where: { libraryBookId },
    transaction,
  });
}

export async function replaceBookCategoryMappings(
  libraryBookId,
  categoryId,
  instituteId,
  transaction,
) {
  await deleteCategoryMappingsByBookId(libraryBookId, transaction);

  const uniqueId = [...new Set((categoryId || []).map(Number).filter((id) => !Number.isNaN(id) && id > 0))];
  if (!uniqueId.length) return [];

  return model.libraryBookCategoryMappingModel.bulkCreate(
    uniqueId.map((libraryCategoryId) => ({
      libraryBookId,
      libraryCategoryId,
      instituteId,
    })),
    { transaction },
  );
}

export async function replaceBookSubjectMappings(
  libraryBookId,
  subjectId,
  instituteId,
  transaction,
) {
  await deleteSubjectMappingsByBookId(libraryBookId, transaction);

  const uniqueId = [...new Set((subjectId || []).map(Number).filter((id) => !Number.isNaN(id) && id > 0))];
  if (!uniqueId.length) return [];

  return model.libraryBookSubjectMappingModel.bulkCreate(
    uniqueId.map((librarySubjectId) => ({
      libraryBookId,
      librarySubjectId,
      instituteId,
    })),
    { transaction },
  );
}

export async function getInstituteIdByLibraryCreationId(libraryCreationId, transaction) {
  const row = await model.libraryCreationModel.findByPk(libraryCreationId, {
    attributes: ["instituteId"],
    transaction,
  });
  return row?.instituteId ?? null;
}

export async function getInstituteIdByLibraryBookId(libraryBookId, transaction) {
  const row = await model.libraryBookModel.findByPk(libraryBookId, {
    attributes: ["libraryCreationId"],
    include: [
      {
        model: model.libraryCreationModel,
        as: "library",
        attributes: ["instituteId"],
      },
    ],
    transaction,
  });

  return row?.library?.instituteId ?? null;
}

export async function deleteCategory(libraryCategoryId, transaction) {
  const deleted = await model.libraryCategoryModel.destroy({
    where: { libraryCategoryId },
    transaction,
  });
  return deleted > 0;
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

export async function createBook(bookData, transaction) {
  try {
    return await model.libraryBookModel.create(bookData, { transaction });
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
  return await model.libraryBookInventoryModel.create(inventoryData, { transaction });
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
      ...bookMappingIncludes,
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

export async function bookExistsById(libraryBookId, transaction) {
  const row = await model.libraryBookModel.findByPk(libraryBookId, {
    attributes: ["libraryBookId"],
    transaction,
  });
  return Boolean(row);
}

export async function getSingleBookDetails(libraryBookId, transaction) {
  return await model.libraryBookModel.findOne({
    where: { libraryBookId },
    transaction,
    attributes: {
      exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"],
    },
    include: [
      ...bookMappingIncludes,
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

export async function deleteBook(libraryBookId) {
  const t = await sequelize.transaction();
  try {
    await deleteCategoryMappingsByBookId(libraryBookId, t);
    await deleteSubjectMappingsByBookId(libraryBookId, t);

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
            "classSectionsId",
            "remark",
            "itemType",
          ],
          include: [
            ...bookMappingIncludes,
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
            "classSectionsId",
            "remark",
            "itemType",
          ],
          include: bookMappingIncludes,
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

export async function getCategoriesByIds(ids, transaction) {
  if (!ids || ids.length === 0) return [];
  return await model.libraryCategoryModel.findAll({
    where: { libraryCategoryId: ids },
    attributes: ["libraryCategoryId", "name"],
    transaction,
  });
}

export async function getSubjectsByIds(ids, transaction) {
  if (!ids || ids.length === 0) return [];
  return await model.subjectModel.findAll({
    where: { subjectId: ids },
    attributes: ["subjectId", "subjectName"],
    transaction,
  });
}
