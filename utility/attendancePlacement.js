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
            sectionAttributes: ['classSectionsId', 'year', 'section', 'courseId'],
            sectionNestedIncludes: [
              {
                model: model.courseModel,
                as: 'courseSection',
                attributes: ['courseId', 'courseName'],
              },
            ],
          }),
        ],
      },
    ],
    transaction: options.transaction,
  });

  if (!mapping) {
    throw new Error('Invalid timeTableMappingId');
  }

  const placement = resolveMappingRoutinePlacement(mapping);
  if (!placement.classSectionTermId) {
    throw new Error('Period could not be resolved to a class section term');
  }

  return placement;
}
