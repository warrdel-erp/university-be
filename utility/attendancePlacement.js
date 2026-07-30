import { Op } from 'sequelize';
import * as model from '../models/index.js';
import { findClassSectionTermById } from '../repository/classSectionTermRepository.js';
import {
  resolveTimeTableRoutineSection,
  timeTableRoutineClassSectionInclude,
} from './classSectionIncludes.js';

/**
 * Resolve class_section_term → placement keys for attendance APIs.
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

function dateWiseCellInclude() {
  return [
    {
      model: model.timeTableCellModel,
      as: 'timeTableCell',
      required: true,
      attributes: [
        'timeTableCellId',
        'timeTableRoutineId',
        'timeTableCreationId',
        'period',
        'day',
        'isSameTeacher',
        'subjectId',
        'electiveSubjectId',
        'teacherSubjectMappingId',
        'isAttendence',
      ],
      include: [
        {
          model: model.timeTableRoutineModel,
          as: 'timeTableRoutine',
          attributes: ['timeTableRoutineId', 'classSectionTermId', 'startingDate', 'endingDate', 'academicGroupId'],
          required: true,
          include: [
            timeTableRoutineClassSectionInclude({
              termAttributes: ['classSectionTermId', 'term', 'classSectionsId'],
              sectionAttributes: ['classSectionsId', 'year', 'section'],
            }),
            {
              model: model.academicGroupModel,
              as: 'academicGroup',
              attributes: ['academicGroupId', 'groupName', 'academicGroupScopeId', 'groupCode'],
              required: false,
              include: [
                {
                  model: model.academicGroupScopeModel,
                  as: 'scope',
                  attributes: ['academicGroupScopeId', 'title', 'academicContextType', 'courseId', 'sessionId', 'term'],
                  required: false,
                },
              ],
            },
          ],
        },
        {
          model: model.timeTableStructurePeriodsModel,
          as: 'timeTablecreation',
          attributes: ['timeTableCreationId', 'periodName', 'startTime', 'endTime', 'isBreak'],
          required: false,
        },
        {
          model: model.subjectModel,
          as: 'timeTableSubject',
          attributes: ['subjectId', 'subjectName'],
          required: false,
        },
        {
          model: model.electiveSubjectModel,
          as: 'timeTableElective',
          attributes: ['electiveSubjectId', 'electiveSubjectName'],
          required: false,
        },
        {
          model: model.teacherSubjectMappingModel,
          as: 'timeTableTeacherSubject',
          attributes: ['teacherSubjectMappingId', 'userId'],
          required: false,
          include: [
            {
              model: model.subjectModel,
              as: 'employeeSubject',
              attributes: ['subjectId', 'subjectName'],
              required: false,
            },
          ],
        },
      ],
    },
  ];
}

/**
 * Date-wise cells must belong to the given classSectionTermId.
 */
export async function assertDateWiseCellsBelongToTerm(dateWiseIds, classSectionTermId, options = {}) {
  const uniqueIds = [...new Set(dateWiseIds.map((id) => Number(id)).filter(Boolean))];
  if (!uniqueIds.length) {
    throw new Error('timeTableCellDateWiseId is required');
  }

  const rows = await model.timeTableCellDateWiseModel.findAll({
    where: { timeTableCellDateWiseId: { [Op.in]: uniqueIds } },
    attributes: ['timeTableCellDateWiseId', 'timeTableCellId', 'date', 'classRoomSectionId'],
    include: dateWiseCellInclude(),
    transaction: options.transaction,
  });

  if (rows.length !== uniqueIds.length) {
    throw new Error('Invalid timeTableCellDateWiseId');
  }

  for (const row of rows) {
    const plain = row.get({ plain: true });
    const routine = plain.timeTableCell.timeTableRoutine;
    if (Number(routine.classSectionTermId) !== Number(classSectionTermId)) {
      throw new Error(
        `timeTableCellDateWiseId ${plain.timeTableCellDateWiseId} does not belong to classSectionTermId ${classSectionTermId}`,
      );
    }
  }

  return rows;
}

export function resolveDateWiseRoutinePlacement(dateWiseRow) {
  const plain = dateWiseRow.get ? dateWiseRow.get({ plain: true }) : dateWiseRow;
  const cell = plain.timeTableCell;
  const routine = cell.timeTableRoutine;
  const termRow = routine.timeTableClassSectionTerm ?? null;
  const section = termRow?.classSection ?? resolveTimeTableRoutineSection(routine);

  return {
    classSectionTermId: routine.classSectionTermId ?? termRow?.classSectionTermId ?? null,
    academicGroupId: routine.academicGroupId ?? null,
    term: termRow?.term ?? null,
    year: section?.year ?? null,
    classSectionsId: section?.classSectionsId ?? termRow?.classSectionsId ?? null,
  };
}

/**
 * Copy-period guard: source and targets share the same term and batch (year).
 */
export async function assertCopyPeriodDateWiseMatch(
  sourceDateWiseId,
  targetDateWiseIds,
  classSectionTermId,
  options = {},
) {
  const uniqueTargetIds = [...new Set(targetDateWiseIds.map((id) => Number(id)).filter(Boolean))];
  const allIds = [...new Set([Number(sourceDateWiseId), ...uniqueTargetIds])];

  const rows = await model.timeTableCellDateWiseModel.findAll({
    where: { timeTableCellDateWiseId: { [Op.in]: allIds } },
    attributes: ['timeTableCellDateWiseId', 'timeTableCellId', 'date'],
    include: dateWiseCellInclude(),
    transaction: options.transaction,
  });

  if (rows.length !== allIds.length) {
    throw new Error('Invalid timeTableCellDateWiseId');
  }

  let sourcePlacement = null;
  const targetPlacements = [];

  for (const row of rows) {
    const placement = resolveDateWiseRoutinePlacement(row);
    const dateWiseId = Number(row.timeTableCellDateWiseId);

    if (dateWiseId === Number(sourceDateWiseId)) {
      sourcePlacement = placement;
    } else {
      targetPlacements.push({ dateWiseId, placement });
    }
  }

  if (!sourcePlacement?.classSectionTermId && !sourcePlacement?.academicGroupId) {
    throw new Error('Source period could not be resolved to a class section term or academic group');
  }

  // NOTE: If using academicGroupId for copy, might need to change classSectionTermId matching. 
  // For now, keeping existing logic for classSectionTermId match.
  if (classSectionTermId && Number(classSectionTermId) !== Number(sourcePlacement.classSectionTermId)) {
    throw new Error('classSectionTermId does not match the source period');
  }

  for (const { dateWiseId, placement } of targetPlacements) {
    if (sourcePlacement.classSectionTermId && Number(placement.classSectionTermId) !== Number(sourcePlacement.classSectionTermId)) {
      throw new Error(
        `timeTableCellDateWiseId ${dateWiseId} is not in the same term as the source period`,
      );
    }

    if (
      sourcePlacement.term != null
      && placement.term != null
      && Number(placement.term) !== Number(sourcePlacement.term)
    ) {
      throw new Error(
        `timeTableCellDateWiseId ${dateWiseId} is not in the same term as the source period`,
      );
    }

    if (
      sourcePlacement.year != null
      && placement.year != null
      && Number(placement.year) !== Number(sourcePlacement.year)
    ) {
      throw new Error(
        `timeTableCellDateWiseId ${dateWiseId} is not in the same batch as the source period`,
      );
    }
  }

  return sourcePlacement;
}

export async function resolveSourcePeriodByDateWiseId(sourceDateWiseId, options = {}) {
  const row = await model.timeTableCellDateWiseModel.findOne({
    where: { timeTableCellDateWiseId: Number(sourceDateWiseId) },
    attributes: ['timeTableCellDateWiseId', 'timeTableCellId', 'date', 'classRoomSectionId'],
    include: dateWiseCellInclude(),
    transaction: options.transaction,
  });

  if (!row) {
    throw new Error('Invalid timeTableCellDateWiseId');
  }

  const plain = row.get({ plain: true });
  const cell = plain.timeTableCell;
  const routine = cell.timeTableRoutine;
  const placement = resolveDateWiseRoutinePlacement(row);

  if (!placement.classSectionTermId && !placement.academicGroupId) {
    throw new Error('Period could not be resolved to a class section term or academic group');
  }

  return {
    ...placement,
    timeTableCellDateWiseId: Number(sourceDateWiseId),
    timeTableCellId: Number(plain.timeTableCellId),
    date: plain.date,
    day: cell.day,
    period: cell.period,
    isSameTeacher: cell.isSameTeacher,
    timeTableRoutineId: cell.timeTableRoutineId ?? routine.timeTableRoutineId,
    startingDate: routine.startingDate,
    endingDate: routine.endingDate,
    timeTablecreation: cell.timeTablecreation ?? null,
    timeTableSubject: cell.timeTableSubject ?? null,
    timeTableElective: cell.timeTableElective ?? null,
    timeTableTeacherSubject: cell.timeTableTeacherSubject ?? null,
    timeTableCell: cell,
    timeTableRoutine: routine,
    academicGroupId: routine.academicGroupId ?? null,
    academicGroup: routine.academicGroup ?? null,
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
