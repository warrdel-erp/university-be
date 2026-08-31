"use strict";

/**
 * Remap attendance / lesson_mapping from out-of-range date-wise cells
 * onto an in-range cell (same date, subject, shared teacher).
 * Unmatched rows on orphans are deleted.
 */

// orphan_id → one matching in-range target (same date + subject + teacher)
const ORPHAN_TO_TARGET = `
  SELECT
    orphan.time_table_cell_date_wise_id AS orphan_id,
    MIN(target.time_table_cell_date_wise_id) AS target_id
  FROM time_table_cell_date_wise orphan
  INNER JOIN time_table_cell oc
    ON oc.time_table_cell_id = orphan.time_table_cell_id
  INNER JOIN time_table_routine orr
    ON orr.time_table_routine_id = oc.time_table_routine_id
    AND orr.is_publish = 1
    AND (orphan.date < orr.starting_date OR orphan.date > orr.ending_date)
  INNER JOIN time_table_cell_teachers_date_wise ot
    ON ot.time_table_cell_date_wise_id = orphan.time_table_cell_date_wise_id
  INNER JOIN time_table_cell_date_wise target
    ON target.date = orphan.date
    AND target.time_table_cell_date_wise_id <> orphan.time_table_cell_date_wise_id
    AND orphan.subject_id <=> target.subject_id
    AND orphan.elective_subject_id <=> target.elective_subject_id
  INNER JOIN time_table_cell_teachers_date_wise tt
    ON tt.time_table_cell_date_wise_id = target.time_table_cell_date_wise_id
    AND tt.user_id = ot.user_id
  INNER JOIN time_table_cell tc
    ON tc.time_table_cell_id = target.time_table_cell_id
  INNER JOIN time_table_routine tr
    ON tr.time_table_routine_id = tc.time_table_routine_id
    AND tr.is_publish = 1
    AND target.date BETWEEN tr.starting_date AND tr.ending_date
  GROUP BY orphan.time_table_cell_date_wise_id
`;

/** Join + filter: row's date-wise id is an out-of-range published orphan */
function joinOrphanDateWise(fkColumn) {
  return `
    INNER JOIN time_table_cell_date_wise dw
      ON dw.time_table_cell_date_wise_id = ${fkColumn}
    INNER JOIN time_table_cell c
      ON c.time_table_cell_id = dw.time_table_cell_id
    INNER JOIN time_table_routine r
      ON r.time_table_routine_id = c.time_table_routine_id
      AND r.is_publish = 1
      AND (dw.date < r.starting_date OR dw.date > r.ending_date)
  `;
}

module.exports = {
  up: async (queryInterface) => {
    const q = (sql) => queryInterface.sequelize.query(sql);

    // --- attendance ---

    await q(`
      DELETE a
      FROM attendance a
      INNER JOIN (${ORPHAN_TO_TARGET}) map
        ON map.orphan_id = a.time_table_cell_date_wise_id
      INNER JOIN attendance existing
        ON existing.time_table_cell_date_wise_id = map.target_id
        AND existing.student_id = a.student_id
    `);

    await q(`
      UPDATE attendance a
      INNER JOIN (${ORPHAN_TO_TARGET}) map
        ON map.orphan_id = a.time_table_cell_date_wise_id
      INNER JOIN time_table_cell_date_wise target
        ON target.time_table_cell_date_wise_id = map.target_id
      SET
        a.time_table_cell_date_wise_id = map.target_id,
        a.time_table_cell_id = target.time_table_cell_id
    `);

    await q(`
      DELETE a
      FROM attendance a
      ${joinOrphanDateWise("a.time_table_cell_date_wise_id")}
    `);

    // --- lesson_mapping ---

    await q(`
      DELETE lm
      FROM lesson_mapping lm
      INNER JOIN (${ORPHAN_TO_TARGET}) map
        ON map.orphan_id = lm.time_table_cell_date_wise_id
      INNER JOIN lesson_mapping existing
        ON existing.time_table_cell_date_wise_id = map.target_id
        AND existing.topic_id = lm.topic_id
    `);

    await q(`
      UPDATE lesson_mapping lm
      INNER JOIN (${ORPHAN_TO_TARGET}) map
        ON map.orphan_id = lm.time_table_cell_date_wise_id
      INNER JOIN time_table_cell_date_wise target
        ON target.time_table_cell_date_wise_id = map.target_id
      SET
        lm.time_table_cell_date_wise_id = map.target_id,
        lm.time_table_cell_id = target.time_table_cell_id
    `);

    await q(`
      DELETE lm
      FROM lesson_mapping lm
      ${joinOrphanDateWise("lm.time_table_cell_date_wise_id")}
    `);
  },

  down: async () => {},
};
