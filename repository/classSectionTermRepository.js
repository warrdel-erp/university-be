import * as model from '../models/index.js';
import { Op } from 'sequelize';
import { scoped } from '../utility/scoped.js';

export async function findClassSectionTermBySectionAndTerm(
  classSectionsId,
  term,
  options = {},
) {
  if (classSectionsId == null || term == null) return null;

  return scoped(model.classSectionTermModel).findOne({
    where: {
      classSectionsId: Number(classSectionsId),
      term: Number(term),
    },
    transaction: options.transaction,
  });
}

export async function resolveClassSectionTermId(
  { classSectionsId, term },
  options = {},
) {
  const row = await findClassSectionTermBySectionAndTerm(
    classSectionsId,
    term,
    options,
  );
  if (!row) return null;
  const plain = row.get ? row.get({ plain: true }) : row;
  return plain.classSectionTermId ?? null;
}

export async function findClassSectionTermById(classSectionTermId, options = {}) {
  if (classSectionTermId == null) return null;

  return scoped(model.classSectionTermModel).findOne({
    where: { classSectionTermId: Number(classSectionTermId) },
    include: [
      {
        model: model.classSectionModel,
        as: 'classSection',
        required: false,
      },
    ],
    transaction: options.transaction,
  });
}

export async function findClassSectionInTenantScope(classSectionId, options = {}) {
  return scoped(model.classSectionModel).findOne({
    where: { classSectionsId: Number(classSectionId) },
    attributes: ['classSectionsId'],
    transaction: options.transaction,
  });
}

export async function findClassSectionTermsByClassSectionId(classSectionId, options = {}) {
  const section = await findClassSectionInTenantScope(classSectionId, options);
  if (!section) {
    return null;
  }

  return model.classSectionTermModel.findAll({
    where: { classSectionsId: Number(classSectionId) },
    attributes: ['classSectionTermId', 'classSectionsId', 'term'],
    transaction: options.transaction,
  });
}

export async function countStudentsForClassSectionTerm(classSectionTermId, options = {}) {
  const id = Number(classSectionTermId);
  const transaction = options.transaction;

  const onStudent = await scoped(model.studentModel).count({
    where: { classSectionTermId: id },
    transaction,
  });

  const onMapper = await scoped(model.classStudentMapperModel).count({
    where: { classSectionTermId: id },
    transaction,
  });

  return onStudent + onMapper;
}

export async function countStudentsForClassSectionTerms(classSectionTermIds, options = {}) {
  const ids = [];
  for (const classSectionTermId of classSectionTermIds) {
    ids.push(Number(classSectionTermId));
  }

  const transaction = options.transaction;
  const whereClause = { classSectionTermId: { [Op.in]: ids } };

  const onStudent = await scoped(model.studentModel).count({
    where: whereClause,
    transaction,
  });

  const onMapper = await scoped(model.classStudentMapperModel).count({
    where: whereClause,
    transaction,
  });

  return onStudent + onMapper;
}

export async function countActiveTeacherSectionMappings(classSectionId, options = {}) {
  return model.teacherSectionMappingModel.count({
    where: { classSectionsId: Number(classSectionId) },
    transaction: options.transaction,
  });
}

export async function softDeleteTeacherSectionMappingsForClassSection(classSectionId, options = {}) {
  return model.teacherSectionMappingModel.destroy({
    where: { classSectionsId: Number(classSectionId) },
    transaction: options.transaction,
  });
}

export async function countTeacherMappingsForClassSectionTerm(
  classSectionTermId,
  classSectionsId,
  options = {},
) {
  return countActiveTeacherSectionMappings(classSectionsId, options);
}

export async function countTeacherMappingsForClassSectionTerms(
  classSectionId,
  classSectionTermIds,
  options = {},
) {
  return countActiveTeacherSectionMappings(classSectionId, options);
}

export async function deleteClassSectionTermById(classSectionTermId, options = {}) {
  return scoped(model.classSectionTermModel).destroy({
    where: { classSectionTermId: Number(classSectionTermId) },
    transaction: options.transaction,
  });
}

export async function countTimetableRoutinesForClassSectionTerms(classSectionTermIds, options = {}) {
  const ids = [];
  for (const classSectionTermId of classSectionTermIds) {
    ids.push(Number(classSectionTermId));
  }
  if (!ids.length) {
    return 0;
  }

  return scoped(model.timeTableRoutineModel).count({
    where: { classSectionTermId: { [Op.in]: ids } },
    transaction: options.transaction,
  });
}

export async function deleteClassSectionTermsByClassSectionId(classSectionId, options = {}) {
  const section = await findClassSectionInTenantScope(classSectionId, options);
  if (!section) {
    return null;
  }

  return model.classSectionTermModel.destroy({
    where: { classSectionsId: Number(classSectionId) },
    transaction: options.transaction,
  });
}

export async function deleteClassSectionById(classSectionId, options = {}) {
  const section = await findClassSectionInTenantScope(classSectionId, options);
  if (!section) {
    return null;
  }

  return scoped(model.classSectionModel).destroy({
    where: { classSectionsId: Number(classSectionId) },
    transaction: options.transaction,
  });
}
