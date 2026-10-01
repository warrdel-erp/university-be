'use strict';

/**
 * Adds session_batch_mapping_id FK to curriculum_batch_mapping.
 *
 * Backfill logic:
 *   For each curriculum_batch_mapping row, find the matching session_batch_mapping
 *   by joining on: sbm.batch = cbm.batch AND course matches via session_course_mapping.
 *
 *   - Exactly 1 match → set session_batch_mapping_id automatically.
 *   - 0 or >1 matches → leave NULL, print audit log for manual resolution.
 *
 * The old `batch` integer column is left nullable (not dropped here) for safety.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      // 1. Add the new FK column (nullable for safety during migration)
      await queryInterface.addColumn(
        'curriculum_batch_mapping',
        'session_batch_mapping_id',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'session_batch_mapping',
            key: 'session_batch_mapping_id',
          },
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        },
        { transaction: t },
      );

      // 2. Backfill rows where exactly ONE session_batch_mapping matches course+batch
      await queryInterface.sequelize.query(
        `UPDATE curriculum_batch_mapping cbm
         JOIN (
           SELECT
             cbm2.curriculum_batch_mapping_id,
             MIN(sbm.session_batch_mapping_id) AS resolved_id,
             COUNT(*)                           AS match_count
           FROM curriculum_batch_mapping cbm2
           JOIN curriculum c             ON c.curriculum_id   = cbm2.curriculum_id
           JOIN session_course_mapping scm ON scm.course_id  = c.course_id
           JOIN session_batch_mapping sbm  ON sbm.session_id = scm.session_id
                                          AND sbm.batch      = cbm2.batch
           WHERE cbm2.session_batch_mapping_id IS NULL
           GROUP BY cbm2.curriculum_batch_mapping_id
           HAVING COUNT(*) = 1
         ) resolved
           ON resolved.curriculum_batch_mapping_id = cbm.curriculum_batch_mapping_id
         SET cbm.session_batch_mapping_id = resolved.resolved_id`,
        { transaction: t },
      );

      // 3. Audit: find and log rows that could NOT be auto-resolved
      const [unresolved] = await queryInterface.sequelize.query(
        `SELECT
           cbm.curriculum_batch_mapping_id,
           cbm.curriculum_id,
           cbm.batch                         AS batch_year,
           c.course_id,
           COUNT(sbm.session_batch_mapping_id) AS candidate_count
         FROM curriculum_batch_mapping cbm
         JOIN curriculum c               ON c.curriculum_id  = cbm.curriculum_id
         LEFT JOIN session_course_mapping scm ON scm.course_id = c.course_id
         LEFT JOIN session_batch_mapping sbm  ON sbm.session_id = scm.session_id
                                             AND sbm.batch      = cbm.batch
         WHERE cbm.session_batch_mapping_id IS NULL
         GROUP BY cbm.curriculum_batch_mapping_id, cbm.curriculum_id, cbm.batch, c.course_id`,
        { transaction: t },
      );

      if (unresolved.length > 0) {
        console.warn(
          '\n[MIGRATION AUDIT] The following curriculum_batch_mapping rows could NOT be auto-resolved',
          '(0 or multiple session_batch_mapping candidates).',
          'Set session_batch_mapping_id manually before making the column NOT NULL.\n',
        );
        console.table(unresolved);
      } else {
        console.log('[MIGRATION] All curriculum_batch_mapping rows successfully backfilled.');
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.removeColumn(
        'curriculum_batch_mapping',
        'session_batch_mapping_id',
        { transaction: t },
      );
    });
  },
};
