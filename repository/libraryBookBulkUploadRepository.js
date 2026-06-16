import * as model from "../models/index.js";
import { Op } from "sequelize";
import sequelize from "../database/sequelizeConfig.js";
import { buildScope, scoped } from "../utility/scoped.js";

function accessionLookupChunkSize() {
  return 500;
}

function uniquePositiveIds(ids) {
  return [...new Set((ids || []).map(Number).filter((id) => !Number.isNaN(id) && id > 0))];
}

function scopedLibraryInclude(required = true) {
  return {
    model: model.libraryCreationModel.unscoped(),
    as: "library",
    attributes: ["libraryCreationId", "instituteId"],
    where: buildScope(model.libraryCreationModel),
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

export async function findLibraryCreationById(libraryCreationId) {
  return assertScopedLibraryCreation(libraryCreationId);
}

export async function getInstituteIdByLibraryCreationId(libraryCreationId, transaction) {
  const row = await assertScopedLibraryCreation(libraryCreationId, transaction);
  return row?.instituteId ?? null;
}

export async function getCategoriesByIds(ids, transaction) {
  if (!ids?.length) return [];
  return scoped(model.libraryCategoryModel).findAll({
    where: { libraryCategoryId: ids },
    attributes: ["libraryCategoryId", "name"],
    transaction,
  });
}

export async function getSubjectsByIds(ids, transaction) {
  if (!ids?.length) return [];
  return scoped(model.subjectModel).findAll({
    where: { subjectId: ids },
    attributes: ["subjectId", "subjectName"],
    transaction,
  });
}

export async function findExistingBookKeysByLibraryId(libraryCreationId) {
  const library = await assertScopedLibraryCreation(libraryCreationId);
  if (!library) {
    return [];
  }

  return model.libraryBookModel.unscoped().findAll({
    where: { libraryCreationId },
    attributes: ["libraryBookId", "title", "isbn"],
  });
}

export async function bulkInsertLibraryBooks(bookPayloadList, transaction) {
  if (!bookPayloadList.length) return [];

  const libraryCreationId = bookPayloadList[0]?.libraryCreationId;
  if (libraryCreationId != null) {
    const library = await assertScopedLibraryCreation(libraryCreationId, transaction);
    if (!library) {
      throw new Error("Library not found");
    }
  }

  return model.libraryBookModel.unscoped().bulkCreate(bookPayloadList, { transaction });
}

export async function bulkInsertLibraryBookInventory(inventoryPayloadList, transaction) {
  if (!inventoryPayloadList.length) return [];

  const libraryBookIds = [...new Set(inventoryPayloadList.map((row) => row.libraryBookId).filter(Boolean))];
  for (const libraryBookId of libraryBookIds) {
    const book = await model.libraryBookModel.unscoped().findOne({
      attributes: ["libraryBookId"],
      where: { libraryBookId },
      include: [scopedLibraryInclude()],
      transaction,
    });
    if (!book) {
      throw new Error("Library book not found");
    }
  }

  return model.libraryBookInventoryModel.unscoped().bulkCreate(inventoryPayloadList, { transaction });
}

export async function replaceBookCategoryMappings(libraryBookId, categoryId, transaction) {
  const book = await model.libraryBookModel.unscoped().findOne({
    attributes: ["libraryBookId"],
    where: { libraryBookId },
    include: [scopedLibraryInclude()],
    transaction,
  });
  if (!book) {
    throw new Error("Library book not found");
  }

  await model.libraryBookCategoryMappingModel.unscoped().destroy({
    where: { libraryBookId },
    transaction,
  });

  const uniqueIds = uniquePositiveIds(categoryId);
  if (!uniqueIds.length) return [];

  return scoped(model.libraryBookCategoryMappingModel).bulkCreate(
    uniqueIds.map((libraryCategoryId) => ({
      libraryBookId,
      libraryCategoryId,
    })),
    { transaction }
  );
}

export async function replaceBookSubjectMappings(libraryBookId, subjectId, transaction) {
  const book = await model.libraryBookModel.unscoped().findOne({
    attributes: ["libraryBookId"],
    where: { libraryBookId },
    include: [scopedLibraryInclude()],
    transaction,
  });
  if (!book) {
    throw new Error("Library book not found");
  }

  await model.libraryBookSubjectMappingModel.unscoped().destroy({
    where: { libraryBookId },
    transaction,
  });

  const uniqueIds = uniquePositiveIds(subjectId);
  if (!uniqueIds.length) return [];

  return scoped(model.libraryBookSubjectMappingModel).bulkCreate(
    uniqueIds.map((librarySubjectId) => ({
      libraryBookId,
      librarySubjectId,
    })),
    { transaction }
  );
}

export async function getCategoryIdByName(name, transaction) {
  const trimmed = String(name).trim();
  if (!trimmed) return null;

  const nameMatch = sequelize.where(
    sequelize.fn("LOWER", sequelize.col("name")),
    trimmed.toLowerCase()
  );

  const row = await scoped(model.libraryCategoryModel).findOne({
    where: { [Op.and]: [nameMatch] },
    attributes: ["libraryCategoryId"],
    transaction,
  });

  return row?.libraryCategoryId ?? null;
}

export async function getSubjectIdByName(name, transaction) {
  const trimmed = String(name).trim();
  if (!trimmed) return null;

  const row = await scoped(model.subjectModel).findOne({
    where: sequelize.where(
      sequelize.fn("LOWER", sequelize.col("subject_name")),
      trimmed.toLowerCase()
    ),
    attributes: ["subjectId"],
    transaction,
  });

  return row?.subjectId ?? null;
}

export async function findLibraryCategoriesForBulkUpload() {
  return scoped(model.libraryCategoryModel).findAll({
    attributes: ["libraryCategoryId", "name", "instituteId"],
  });
}

export async function findAllSubjectsForBulkUpload() {
  return scoped(model.subjectModel).findAll({
    attributes: ["subjectId", "subjectName"],
  });
}

export async function findExistingAccessionNumbersInList(accessionNumbers) {
  const unique = [
    ...new Set((accessionNumbers || []).map((value) => String(value).trim()).filter(Boolean)),
  ];
  if (!unique.length) return [];

  const chunkSize = accessionLookupChunkSize();
  const found = [];

  for (let index = 0; index < unique.length; index += chunkSize) {
    const chunk = unique.slice(index, index + chunkSize);
    const rows = await model.libraryBookInventoryModel.unscoped().findAll({
      where: { accessionNumber: { [Op.in]: chunk } },
      attributes: ["accessionNumber"],
      include: [
        {
          model: model.libraryBookModel.unscoped(),
          as: "bookDetails",
          attributes: [],
          required: true,
          include: [scopedLibraryInclude()],
        },
      ],
      raw: true,
    });
    found.push(...rows);
  }

  return found;
}
