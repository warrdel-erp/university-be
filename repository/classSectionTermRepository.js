import * as model from '../models/index.js';
import { Op } from 'sequelize';
import { buildScope, scoped } from '../utility/scoped.js';

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

export async function countTeacherMappingsForClassSectionTerm(
  classSectionTermId,
  classSectionsId,
  options = {},
) {
  const termId = Number(classSectionTermId);
  const sectionId = Number(classSectionsId);
  const transaction = options.transaction;

  const teacherSectionCount = await scoped(model.teacherSectionMappingModel).count({
    where: { classSectionsId: sectionId },
    transaction,
  });

  const routineScope = buildScope(model.timeTableRoutineModel);
  const timetableTeacherCount = await scoped(model.classScheduleModel).count({
    where: { employeeId: { [Op.ne]: null } },
    include: [
      {
        model: model.timeTableRoutineModel,
        as: 'timeTablecreate',
        required: true,
        where: {
          ...routineScope,
          classSectionTermId: termId,
        },
        attributes: [],
      },
    ],
    transaction,
  });

  return teacherSectionCount + timetableTeacherCount;
}

export async function countTeacherMappingsForClassSectionTerms(
  classSectionId,
  classSectionTermIds,
  options = {},
) {
  const ids = [];
  for (const classSectionTermId of classSectionTermIds) {
    ids.push(Number(classSectionTermId));
  }

  const transaction = options.transaction;

  const teacherSectionCount = await scoped(model.teacherSectionMappingModel).count({
    where: { classSectionsId: Number(classSectionId) },
    transaction,
  });

  const routineScope = buildScope(model.timeTableRoutineModel);
  const timetableTeacherCount = await scoped(model.classScheduleModel).count({
    where: { employeeId: { [Op.ne]: null } },
    include: [
      {
        model: model.timeTableRoutineModel,
        as: 'timeTablecreate',
        required: true,
        where: {
          ...routineScope,
          classSectionTermId: { [Op.in]: ids },
        },
        attributes: [],
      },
    ],
    transaction,
  });

  return teacherSectionCount + timetableTeacherCount;
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
