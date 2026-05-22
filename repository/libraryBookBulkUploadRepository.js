import * as model from "../models/index.js";
import { Op } from "sequelize";
import sequelize from "../database/sequelizeConfig.js";

const ACCESSION_LOOKUP_CHUNK_SIZE = 500;

const uniquePositiveIds = (ids) =>
  [...new Set((ids || []).map(Number).filter((id) => !Number.isNaN(id) && id > 0))];

export async function findLibraryCreationById(libraryCreationId) {
  return model.libraryCreationModel.findOne({
    where: { libraryCreationId },
    attributes: ["libraryCreationId", "instituteId"],
  });
}

export async function getInstituteIdByLibraryCreationId(libraryCreationId, transaction) {
  const row = await model.libraryCreationModel.findByPk(libraryCreationId, {
    attributes: ["instituteId"],
    transaction,
  });
  return row?.instituteId ?? null;
}

export async function getCategoriesByIds(ids, transaction) {
  if (!ids?.length) return [];
  return model.libraryCategoryModel.findAll({
    where: { libraryCategoryId: ids },
    attributes: ["libraryCategoryId", "name"],
    transaction,
  });
}

export async function getSubjectsByIds(ids, transaction) {
  if (!ids?.length) return [];
  return model.subjectModel.findAll({
    where: { subjectId: ids },
    attributes: ["subjectId", "subjectName"],
    transaction,
  });
}

export async function findExistingBookKeysByLibraryId(libraryCreationId) {
  return model.libraryBookModel.findAll({
    where: libraryCreationId != null ? { libraryCreationId } : {},
    attributes: ["libraryBookId", "title", "isbn"],
  });
}

export async function bulkInsertLibraryBooks(bookPayloadList, transaction) {
  if (!bookPayloadList.length) return [];
  return model.libraryBookModel.bulkCreate(bookPayloadList, { transaction });
}

export async function bulkInsertLibraryBookInventory(inventoryPayloadList, transaction) {
  if (!inventoryPayloadList.length) return [];
  return model.libraryBookInventoryModel.bulkCreate(inventoryPayloadList, { transaction });
}

export async function replaceBookCategoryMappings(
  libraryBookId,
  categoryId,
  instituteId,
  transaction,
) {
  await model.libraryBookCategoryMappingModel.destroy({
    where: { libraryBookId },
    transaction,
  });

  const uniqueIds = uniquePositiveIds(categoryId);
  if (!uniqueIds.length) return [];

  return model.libraryBookCategoryMappingModel.bulkCreate(
    uniqueIds.map((libraryCategoryId) => ({
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
  await model.libraryBookSubjectMappingModel.destroy({
    where: { libraryBookId },
    transaction,
  });

  const uniqueIds = uniquePositiveIds(subjectId);
  if (!uniqueIds.length) return [];

  return model.libraryBookSubjectMappingModel.bulkCreate(
    uniqueIds.map((librarySubjectId) => ({
      libraryBookId,
      librarySubjectId,
      instituteId,
    })),
    { transaction },
  );
}

export async function getCategoryIdByName(name, instituteId, transaction) {
  const trimmed = String(name).trim();
  if (!trimmed) return null;

  const nameMatch = sequelize.where(
    sequelize.fn("LOWER", sequelize.col("name")),
    trimmed.toLowerCase(),
  );

  const row = await model.libraryCategoryModel.findOne({
    where: instituteId ? { [Op.and]: [nameMatch, { instituteId }] } : nameMatch,
    attributes: ["libraryCategoryId"],
    transaction,
  });

  return row?.libraryCategoryId ?? null;
}

export async function getSubjectIdByName(name, transaction) {
  const trimmed = String(name).trim();
  if (!trimmed) return null;

  const row = await model.subjectModel.findOne({
    where: sequelize.where(
      sequelize.fn("LOWER", sequelize.col("subject_name")),
      trimmed.toLowerCase(),
    ),
    attributes: ["subjectId"],
    transaction,
  });

  return row?.subjectId ?? null;
}

export async function findLibraryCategoriesForBulkUpload(instituteId) {
  return model.libraryCategoryModel.findAll({
    where: instituteId ? { instituteId } : {},
    attributes: ["libraryCategoryId", "name", "instituteId"],
  });
}

export async function findAllSubjectsForBulkUpload() {
  return model.subjectModel.findAll({
    attributes: ["subjectId", "subjectName"],
  });
}

export async function findExistingAccessionNumbersInList(accessionNumbers) {
  const unique = [
    ...new Set(
      (accessionNumbers || []).map((value) => String(value).trim()).filter(Boolean),
    ),
  ];
  if (!unique.length) return [];

  const found = [];
  for (let index = 0; index < unique.length; index += ACCESSION_LOOKUP_CHUNK_SIZE) {
    const chunk = unique.slice(index, index + ACCESSION_LOOKUP_CHUNK_SIZE);
    const rows = await model.libraryBookInventoryModel.findAll({
      where: { accessionNumber: { [Op.in]: chunk } },
      attributes: ["accessionNumber"],
      raw: true,
    });
    found.push(...rows);
  }

  return found;
}
