import { Op } from 'sequelize';
import * as model from '../models/index.js';
import { findClassSectionTermById } from '../repository/classSectionTermRepository.js';

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
