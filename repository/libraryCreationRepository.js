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
  return await model.libraryCreationModel.findAll({
    attributes: {
      exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"],
    },
    where: { libraryCreationId },
    include: [
      {
        model: model.libraryBookModel,
        as: "books",
        attributes: {
          exclude: ["createdAt", "updatedAt", "deletedAt", "studentId", "employeeId"],
          order: [["libraryBookId", "DESC"]],
        },
        include: [
          {
            model: model.libraryBookInventoryModel,
            as: "inventoryCopies",
            attributes: {
              exclude: ["createdAt", "updatedAt", "deletedAt", "studentId", "employeeId"],
            },
          },
        ],
      },
      {
        model: model.libraryFloorModel,
        as: "floorDetails",
        attributes: {
          exclude: [
            "createdAt",
            "updatedAt",
            "deletedAt",
            "campus_id",
            "institute_id",
            "library_creation_id",
            "campusId",
            "instituteId",
            "createdBy",
            "updatedBy",
          ],
        },
        where: {
          libraryFloorId,
          universityId,
          libraryCreationId,
        },
      },
    ],
  });
}

export async function getSingleBookDetails(libraryBookId) {
  return await model.libraryBookModel.findOne({
    where: { libraryBookId },
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
            attributes: ["library_aisle_id", "name", "description"],
          },
          {
            model: model.libraryRackModel,
            as: "rackDetails",
            attributes: ["library_rack_id", "name", "description"],
          },
          {
            model: model.libraryRowModel,
            as: "rowDetails",
            attributes: ["library_row_id", "name", "description"],
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

export async function updateBook(libraryBookId, data) {
  try {
    const result = await model.libraryBookModel.update(data, {
      where: { libraryBookId },
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

export async function updateInventory(inventoryId, data) {
  try {
    const result = await model.libraryBookInventoryModel.update(data, {
      where: { inventoryId },
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
          ],
          include: [
            {
              model: model.libraryCreationModel,
              as: "library",
              attributes: {
                exclude: ["createdAt", "updatedAt", "deletedAt"],
              },
              include: [
                {
                  model: model.libraryFloorModel,
                  as: "libraryFloor",
                  attributes: {
                    exclude: ["createdAt", "updatedAt", "deletedAt"],
                  },
                },
              ],
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
        "excisionNumber",
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
        "excisionNumber",
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

export async function findOrCreateBook(bookData) {
  try {
    let book = await model.libraryBookModel.findOne({
      where: { isbn: bookData.isbn },
    });

    // if (!book) {
    book = await model.libraryBookModel.create(bookData);
    // }

    return book;
  } catch (error) {
    throw new Error("Failed to create/find book: " + error.message);
  }
}

export async function createInventoryBulk(data) {
  try {
    return await model.libraryBookInventoryModel.create(data);
  } catch (error) {
    throw new Error("Failed to create inventory copy: " + error.message);
  }
}
