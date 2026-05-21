import * as model from "../models/index.js";

/** Returns library row if libraryCreationId exists, else null. */
export async function findLibraryCreationById(libraryCreationId) {
  return model.libraryCreationModel.findOne({
    where: { libraryCreationId },
    attributes: ["libraryCreationId"],
  });
}

/** Existing books (title/isbn) for duplicate detection during bulk import. */
export async function findExistingBookKeysByLibraryId(libraryCreationId) {
  const where = {};
  if (libraryCreationId != null) {
    where.libraryCreationId = libraryCreationId;
  }
  return model.libraryBookModel.findAll({
    where,
    attributes: ["libraryBookId", "title", "isbn"],
  });
}

/** Insert many library_book rows in one query. */
export async function bulkInsertLibraryBooks(bookPayloadList, transaction) {
  if (!bookPayloadList.length) return [];
  return model.libraryBookModel.bulkCreate(bookPayloadList, { transaction });
}

/** Insert many library_book_inventory rows in one query. */
export async function bulkInsertLibraryBookInventory(inventoryPayloadList, transaction) {
  if (!inventoryPayloadList.length) return [];
  return model.libraryBookInventoryModel.bulkCreate(inventoryPayloadList, { transaction });
}

/** Categories used to resolve category names from Excel. */
export async function findLibraryCategoriesForBulkUpload(instituteId) {
  return model.libraryCategoryModel.findAll({
    where: instituteId ? { instituteId } : {},
    attributes: ["libraryCategoryId", "name", "instituteId"],
  });
}

/** Subjects used to resolve subject names from Excel. */
export async function findAllSubjectsForBulkUpload() {
  return model.subjectModel.findAll({
    attributes: ["subjectId", "subjectName"],
  });
}

/** All accession numbers already in DB — used to block duplicate inventory inserts. */
export async function findAllExistingAccessionNumbers() {
  return model.libraryBookInventoryModel.findAll({
    attributes: ["accessionNumber"],
    raw: true,
  });
}
