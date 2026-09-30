import { Op } from "sequelize";
import * as model from "../models/index.js";
import { buildScope, scoped } from "./scoped.js";
import * as examinationSessionRepository from "../repository/examinationSessionRepository.js";

/**
 * Resolve selections (batchId, courseId, sessionId, terms) → { batchId, courseId, sessionId, terms }[].
 */
export async function resolveSelectionCombinations(selections, options = {}) {
  if (!selections || !selections.length) return [];

  const batchIds = [];
  for (const sel of selections) {
    if (sel.batchId != null) {
      batchIds.push(Number(sel.batchId));
    }
  }

  const batchMap = new Map();
  if (batchIds.length > 0) {
    const batches = await scoped(model.batchModel).findAll({
      where: { batchId: { [Op.in]: batchIds } },
      include: [
        {
          model: model.sessionModel,
          as: "session",
          attributes: ["sessionId", "courseId"],
        },
      ],
      transaction: options.transaction,
    });
    for (const b of batches) {
      const plain = b.get ? b.get({ plain: true }) : b;
      batchMap.set(Number(plain.batchId), plain);
    }
  }

  const combinations = [];
  for (const sel of selections) {
    let courseId = sel.courseId != null ? Number(sel.courseId) : null;
    let sessionId = sel.sessionId != null ? Number(sel.sessionId) : null;
    let batchYear = null;

    if (sel.batchId != null) {
      const b = batchMap.get(Number(sel.batchId));
      if (b) {
        sessionId = sessionId ?? (b.sessionId ? Number(b.sessionId) : null);
        courseId =
          courseId ?? (b.session?.courseId ? Number(b.session.courseId) : null);
        batchYear = b.batch != null ? Number(b.batch) : null;
      }
    }

    const terms = [];
    if (Array.isArray(sel.terms)) {
      for (const t of sel.terms) terms.push(Number(t));
    } else if (sel.term != null) {
      terms.push(Number(sel.term));
    }

    if (courseId != null || sessionId != null || sel.batchId != null) {
      combinations.push({
        batchId: sel.batchId != null ? Number(sel.batchId) : null,
        batchYear,
        courseId,
        sessionId,
        terms,
      });
    }
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
      ...buildScope(model.examScheduleModel),
    };
    if (comb.batchId != null) where.batchId = comb.batchId;
    if (comb.terms && comb.terms.length > 0) {
      where.term = { [Op.in]: comb.terms };
    }
    if (examDate) where.examDate = examDate;
    if (examinationSessionSlotId != null) {
      where.examinationSessionSlotId = Number(examinationSessionSlotId);
    }

    const include = [];
    if (comb.courseId != null) {
      include.push({
        model: model.subjectModel,
        as: "subjectSchedule",
        required: true,
        attributes: [],
        where: {
          courseId: comb.courseId,
          ...buildScope(model.subjectModel),
        },
      });
    }

    const rows = await scoped(model.examScheduleModel).findAll({
      where,
      attributes: ["examScheduleId"],
      include,
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
