import { Op } from 'sequelize';
import * as model from '../models/index.js';
import { findClassSectionTermById } from '../repository/classSectionTermRepository.js';
import {
  resolveTimeTableRoutineSection,
  timeTableRoutineClassSectionInclude,
} from './classSectionIncludes.js';

/**
 * Resolve class_section_term row → placement keys for attendance APIs.
 */
export async function resolveAttendancePlacement(classSectionTermId, options = {}) {
  if (classSectionTermId == null || classSectionTermId === '') {
    throw new Error('classSectionTermId is required');
  }

  const termRow = await findClassSectionTermById(Number(classSectionTermId), options);
  if (!termRow) {
    throw new Error('classSectionTermId not found');
  }

  const plain = termRow.get ? termRow.get({ plain: true }) : termRow;
  const classSectionsId =
    plain.classSectionsId
    ?? plain.classSection?.classSectionsId
    ?? null;

  if (!classSectionsId) {
    throw new Error('classSectionTermId could not be resolved to a class section');
  }

  return {
    classSectionTermId: Number(classSectionTermId),
    classSectionsId: Number(classSectionsId),
    term: plain.term ?? null,
    classSection: plain.classSection ?? null,
  };
}

/**
 * Timetable chain: class_schedule_item → time_table_routine.class_section_term_id
 */
export async function assertMappingsBelongToTerm(mappingIds, classSectionTermId, options = {}) {
  const uniqueIds = [...new Set(mappingIds.map((id) => Number(id)).filter(Boolean))];
  if (!uniqueIds.length) {
    throw new Error('timeTableMappingId is required');
  }

  const mappings = await model.classScheduleModel.findAll({
    where: { timeTableMappingId: { [Op.in]: uniqueIds } },
    attributes: ['timeTableMappingId', 'timeTableRoutineId', 'timeTableCreationId', 'period', 'day'],
    include: [
      {
        model: model.timeTableRoutineModel,
        as: 'timeTablecreate',
        attributes: ['timeTableRoutineId', 'classSectionTermId', 'startingDate', 'endingDate'],
        required: true,
      },
      {
        model: model.timeTableStructurePeriodsModel,
        as: 'timeTablecreation',
        attributes: ['timeTableCreationId', 'periodName', 'startTime', 'endTime', 'isBreak'],
        required: false,
      },
    ],
    transaction: options.transaction,
  });

  if (mappings.length !== uniqueIds.length) {
    throw new Error('Invalid timeTableMappingId');
  }

  for (const mapping of mappings) {
    const routine = mapping.timeTablecreate;
    if (Number(routine.classSectionTermId) !== Number(classSectionTermId)) {
      throw new Error(
        `timeTableMappingId ${mapping.timeTableMappingId} does not belong to classSectionTermId ${classSectionTermId}`,
      );
    }
  }

  return mappings;
}

export function resolveMappingRoutinePlacement(mapping) {
  const plain = mapping.get ? mapping.get({ plain: true }) : mapping;
  const routine = plain.timeTablecreate;
  const termRow = routine?.timeTableClassSectionTerm ?? null;
  const section = termRow?.classSection ?? resolveTimeTableRoutineSection(routine);

  return {
    classSectionTermId: routine?.classSectionTermId ?? termRow?.classSectionTermId ?? null,
    term: termRow?.term ?? null,
    year: section?.year ?? null,
    classSectionsId: section?.classSectionsId ?? termRow?.classSectionsId ?? null,
  };
}

/**
 * Copy-period guard: source and every target must share the same program term and batch (year).
 */
export async function assertCopyPeriodMappingsMatch(
  sourceMappingId,
  targetMappingIds,
  classSectionTermId,
  options = {},
) {
  const uniqueTargetIds = [...new Set(targetMappingIds.map((id) => Number(id)).filter(Boolean))];
  const allIds = [...new Set([Number(sourceMappingId), ...uniqueTargetIds])];

  const mappings = await model.classScheduleModel.findAll({
    where: { timeTableMappingId: { [Op.in]: allIds } },
    attributes: ['timeTableMappingId'],
    include: [
      {
        model: model.timeTableRoutineModel,
        as: 'timeTablecreate',
        attributes: ['timeTableRoutineId', 'classSectionTermId'],
        required: true,
        include: [
          timeTableRoutineClassSectionInclude({
            termAttributes: ['classSectionTermId', 'term', 'classSectionsId'],
            sectionAttributes: ['classSectionsId', 'year', 'section'],
          }),
        ],
      },
    ],
    transaction: options.transaction,
  });

  if (mappings.length !== allIds.length) {
    throw new Error('Invalid timeTableMappingId');
  }

  let sourcePlacement = null;
  const targetPlacements = [];

  for (const mapping of mappings) {
    const placement = resolveMappingRoutinePlacement(mapping);
    const mappingId = Number(mapping.timeTableMappingId);

    if (mappingId === Number(sourceMappingId)) {
      sourcePlacement = placement;
    } else {
      targetPlacements.push({ mappingId, placement });
    }
  }

  if (!sourcePlacement?.classSectionTermId) {
    throw new Error('Source period could not be resolved to a class section term');
  }

  if (Number(classSectionTermId) !== Number(sourcePlacement.classSectionTermId)) {
    throw new Error('classSectionTermId does not match the source period');
  }

  for (const { mappingId, placement } of targetPlacements) {
    if (Number(placement.classSectionTermId) !== Number(sourcePlacement.classSectionTermId)) {
      throw new Error(
        `timeTableMappingId ${mappingId} is not in the same term as the source period`,
      );
    }

    if (
      sourcePlacement.term != null
      && placement.term != null
      && Number(placement.term) !== Number(sourcePlacement.term)
    ) {
      throw new Error(
        `timeTableMappingId ${mappingId} is not in the same term as the source period`,
      );
    }

    if (
      sourcePlacement.year != null
      && placement.year != null
      && Number(placement.year) !== Number(sourcePlacement.year)
    ) {
      throw new Error(
        `timeTableMappingId ${mappingId} is not in the same batch as the source period`,
      );
    }
  }

  return sourcePlacement;
}

export async function resolveSourcePeriodByMappingId(sourceMappingId, options = {}) {
  const mapping = await model.classScheduleModel.findOne({
    where: { timeTableMappingId: Number(sourceMappingId) },
    attributes: ['timeTableMappingId', 'day', 'period', 'timeTableRoutineId', 'isSameTeacher'],
    include: [
      {
        model: model.timeTableRoutineModel,
        as: 'timeTablecreate',
        attributes: ['timeTableRoutineId', 'classSectionTermId', 'startingDate', 'endingDate'],
        required: true,
        include: [
          timeTableRoutineClassSectionInclude({
            termAttributes: ['classSectionTermId', 'term', 'classSectionsId'],
            sectionAttributes: ['classSectionsId', 'year', 'section'],
          }),
        ],
      },
      {
        model: model.timeTableStructurePeriodsModel,
        as: 'timeTablecreation',
        attributes: ['periodName', 'startTime', 'endTime', 'isBreak'],
        required: false,
      },
      {
        model: model.subjectModel,
        as: 'timeTableSubject',
        attributes: ['subjectId', 'subjectName'],
      },
      {
        model: model.electiveSubjectModel,
        as: 'timeTableElective',
        attributes: ['electiveSubjectId', 'electiveSubjectName'],
      },
      {
        model: model.teacherSubjectMappingModel,
        as: 'timeTableTeacherSubject',
        attributes: ['teacherSubjectMappingId'],
        include: [
          {
            model: model.subjectModel,
            as: 'employeeSubject',
            attributes: ['subjectId', 'subjectName'],
          },
        ],
      },
    ],
    transaction: options.transaction,
  });

  if (!mapping) {
    throw new Error('Invalid timeTableMappingId');
  }

  const plain = mapping.get ? mapping.get({ plain: true }) : mapping;
  const routine = plain.timeTablecreate ?? {};
  const placement = resolveMappingRoutinePlacement(mapping);

  if (!placement.classSectionTermId) {
    throw new Error('Period could not be resolved to a class section term');
  }

  return {
    ...placement,
    timeTableMappingId: Number(sourceMappingId),
    day: plain.day,
    period: plain.period,
    isSameTeacher: plain.isSameTeacher,
    timeTableRoutineId: plain.timeTableRoutineId ?? routine.timeTableRoutineId,
    startingDate: routine.startingDate,
    endingDate: routine.endingDate,
    timeTablecreation: plain.timeTablecreation ?? null,
    timeTableSubject: plain.timeTableSubject ?? null,
    timeTableElective: plain.timeTableElective ?? null,
    timeTableTeacherSubject: plain.timeTableTeacherSubject ?? null,
  };
}

export function canCopyPeriodToTarget(sourcePlacement, targetPlacement) {
  if (Number(targetPlacement.classSectionTermId) !== Number(sourcePlacement.classSectionTermId)) {
    return false;
  }

  if (
    sourcePlacement.term != null
    && targetPlacement.term != null
    && Number(targetPlacement.term) !== Number(sourcePlacement.term)
  ) {
    return false;
  }

  if (
    sourcePlacement.year != null
    && targetPlacement.year != null
    && Number(targetPlacement.year) !== Number(sourcePlacement.year)
  ) {
    return false;
  }

  return true;
}
