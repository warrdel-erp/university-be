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

export async function deleteClassSectionTermById(classSectionTermId, options = {}) {
  return scoped(model.classSectionTermModel).destroy({
    where: { classSectionTermId: Number(classSectionTermId) },
    transaction: options.transaction,
  });
}
