import { Op } from "sequelize";
import * as model from "../models/index.js";
import { buildScope, scoped } from "./scoped.js";
import * as examinationSessionRepository from "../repository/examinationSessionRepository.js";

/**
 * Resolve courseSessionMapping selections → { courseId, sessionId, terms }[].
 */
export async function resolveSelectionCombinations(selections, options = {}) {
  if (!selections || !selections.length) return [];

  const mappingIds = [];
  for (const sel of selections) {
    mappingIds.push(Number(sel.courseSessionMappingId));
  }

  const dbMappings =
    await examinationSessionRepository.findSessionCourseMappingsByIds(
      mappingIds,
      options,
    );
  const dbMappingsMap = new Map();
  for (const mapping of dbMappings) {
    dbMappingsMap.set(Number(mapping.sessionCourseMappingId), mapping);
  }

  const combinations = [];
  for (const sel of selections) {
    const mapping = dbMappingsMap.get(Number(sel.courseSessionMappingId));
    if (!mapping) continue;

    const terms = [];
    for (const term of sel.terms || []) {
      terms.push(Number(term));
    }
    if (!terms.length) continue;

    combinations.push({
      courseId: Number(mapping.courseId),
      sessionId: Number(mapping.sessionId),
      terms,
    });
  }

  return combinations;
}

/**
 * Selections → matching exam_schedule ids (course + session + schedule.term).
 * Returns null when selections are empty (no filter).
 * Returns [] when selections resolve to no schedules.
 */
export async function findExamScheduleIdsBySelections(
  {
    examinationSessionId,
    examDate,
    examinationSessionSlotId,
    selections,
  },
  options = {},
) {
  if (!selections || !selections.length) return null;

  const combinations = await resolveSelectionCombinations(selections, options);
  if (!combinations.length) return [];

  const scheduleIds = [];
  const seen = new Set();

  for (const comb of combinations) {
    const where = {
      examinationSessionId: Number(examinationSessionId),
      sessionId: comb.sessionId,
      term: { [Op.in]: comb.terms },
      ...buildScope(model.examScheduleModel),
    };
    if (examDate) where.examDate = examDate;
    if (examinationSessionSlotId != null) {
      where.examinationSessionSlotId = Number(examinationSessionSlotId);
    }

    const rows = await scoped(model.examScheduleModel).findAll({
      where,
      attributes: ["examScheduleId"],
      include: [
        {
          model: model.subjectModel,
          as: "subjectSchedule",
          required: true,
          attributes: [],
          where: {
            courseId: comb.courseId,
            ...buildScope(model.subjectModel),
          },
        },
      ],
      raw: true,
      transaction: options.transaction,
    });

    for (const row of rows) {
      const id = Number(row.examScheduleId);
      if (seen.has(id)) continue;
      seen.add(id);
      scheduleIds.push(id);
    }
  }

  return scheduleIds;
}
