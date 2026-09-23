'use strict';

/**
 * Seed class_sections.batch_id from session + program year + academic calendar year.
 * Does NOT drop course_id / session_id (kept denormalized for existing queries).
 *
 * Formula:
 *   activeCalendarYear = YEAR(academic_year.starting_date)
 *                        OR class_sections.active_year
 *                        OR YEAR(session academic year starting_date)
 *   batchYear          = activeCalendarYear - (programYear - 1)
 *
 * Example: academic year starting 2026 → year 1 = batch 2026, year 2 = batch 2025.
 */
module.exports = {
  async up(queryInterface) {
    const t = await queryInterface.sequelize.transaction();
    try {
      // 1. Ensure batch rows exist for every (session_id, computed batch year)
      await queryInterface.sequelize.query(
        `
        INSERT IGNORE INTO batch (session_id, batch, status, created_by, created_at, updated_at)
        SELECT
          cs.session_id,
          (
            COALESCE(
              YEAR(ay.starting_date),
              cs.active_year,
              YEAR(say.starting_date)
            ) - (IFNULL(cs.year, 1) - 1)
          ),
          'published',
          MIN(cs.created_by),
          NOW(),
          NOW()
        FROM class_sections cs
        LEFT JOIN acedmic_year ay
          ON ay.acedmic_year_id = cs.acedmic_year_id
        LEFT JOIN session s
          ON s.session_id = cs.session_id
         AND s.deleted_at IS NULL
        LEFT JOIN acedmic_year say
          ON say.acedmic_year_id = s.acedmic_year_id
        WHERE cs.deleted_at IS NULL
          AND cs.session_id IS NOT NULL
          AND COALESCE(
            YEAR(ay.starting_date),
            cs.active_year,
            YEAR(say.starting_date)
          ) IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM batch b
            WHERE b.session_id = cs.session_id
              AND b.batch = (
                COALESCE(
                  YEAR(ay.starting_date),
                  cs.active_year,
                  YEAR(say.starting_date)
                ) - (IFNULL(cs.year, 1) - 1)
              )
          )
        GROUP BY
          cs.session_id,
          (
            COALESCE(
              YEAR(ay.starting_date),
              cs.active_year,
              YEAR(say.starting_date)
            ) - (IFNULL(cs.year, 1) - 1)
          )
        `,
        { transaction: t },
      );

      // 2. Backfill batch_id
      await queryInterface.sequelize.query(
        `
        UPDATE class_sections cs
        LEFT JOIN acedmic_year ay
          ON ay.acedmic_year_id = cs.acedmic_year_id
        LEFT JOIN session s
          ON s.session_id = cs.session_id
         AND s.deleted_at IS NULL
        LEFT JOIN acedmic_year say
          ON say.acedmic_year_id = s.acedmic_year_id
        INNER JOIN batch b
          ON b.session_id = cs.session_id
         AND b.batch = (
           COALESCE(
             YEAR(ay.starting_date),
             cs.active_year,
             YEAR(say.starting_date)
           ) - (IFNULL(cs.year, 1) - 1)
         )
        SET cs.batch_id = b.batch_id
        WHERE cs.deleted_at IS NULL
          AND (
            cs.batch_id IS NULL
            OR cs.batch_id <> b.batch_id
          )
        `,
        { transaction: t },
      );

      // 3. Fallback using active_year math only
      await queryInterface.sequelize.query(
        `
        UPDATE class_sections cs
        INNER JOIN batch b
          ON b.session_id = cs.session_id
         AND b.batch = (cs.active_year - (IFNULL(cs.year, 1) - 1))
        SET cs.batch_id = b.batch_id
        WHERE cs.deleted_at IS NULL
          AND cs.batch_id IS NULL
          AND cs.active_year IS NOT NULL
        `,
        { transaction: t },
      );

      const [[nullBatchCount]] = await queryInterface.sequelize.query(
        `
        SELECT COUNT(*) AS cnt
        FROM class_sections
        WHERE deleted_at IS NULL
          AND batch_id IS NULL
        `,
        { transaction: t },
      );

      if (Number(nullBatchCount.cnt) > 0) {
        console.warn(
          `[MIGRATION] ${nullBatchCount.cnt} class_sections still have NULL batch_id ` +
            '(missing session_id / year / academic year / active_year). Left as NULL.',
        );
      } else {
        console.log('[MIGRATION] All active class_sections have batch_id seeded.');
      }

      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  async down() {
    // Non-destructive seed; no rollback of batch_id values.
  },
};
