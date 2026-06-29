'use strict';

const MIGRATION_YEAR_TITLE = 'Default Academic Year (auto)';

/** Ensure every existing institute has at least one acedmic_year row. */
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `
        INSERT INTO acedmic_year (
          university_id,
          institute_id,
          year_title,
          starting_date,
          ending_date,
          is_active,
          updated_by,
          created_at,
          updated_at
        )
        SELECT
          COALESCE(
            i.university_id,
            (
              SELECT c.university_id
              FROM campus c
              WHERE c.campus_id = i.campus_id
                AND c.deleted_at IS NULL
              LIMIT 1
            )
          ) AS university_id,
          i.institute_id,
          CONCAT(
            '${MIGRATION_YEAR_TITLE} ',
            YEAR(CURRENT_DATE),
            '-',
            YEAR(CURRENT_DATE) + 1
          ) AS year_title,
          CONCAT(YEAR(CURRENT_DATE), '-04-01') AS starting_date,
          CONCAT(YEAR(CURRENT_DATE) + 1, '-03-31') AS ending_date,
          1 AS is_active,
          COALESCE(
            i.created_by,
            (
              SELECT MIN(u.user_id)
              FROM users u
              WHERE u.university_id = COALESCE(
                i.university_id,
                (
                  SELECT c.university_id
                  FROM campus c
                  WHERE c.campus_id = i.campus_id
                    AND c.deleted_at IS NULL
                  LIMIT 1
                )
              )
            ),
            (SELECT MIN(u.user_id) FROM users u)
          ) AS updated_by,
          CURRENT_TIMESTAMP AS created_at,
          CURRENT_TIMESTAMP AS updated_at
        FROM institute i
        WHERE i.deleted_at IS NULL
          AND COALESCE(
            i.university_id,
            (
              SELECT c.university_id
              FROM campus c
              WHERE c.campus_id = i.campus_id
                AND c.deleted_at IS NULL
              LIMIT 1
            )
          ) IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM acedmic_year ay
            WHERE ay.institute_id = i.institute_id
              AND ay.deleted_at IS NULL
          )
        `,
        { transaction },
      );

      const [[{ missingCount }]] = await queryInterface.sequelize.query(
        `
        SELECT COUNT(*) AS missingCount
        FROM institute i
        WHERE i.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1
            FROM acedmic_year ay
            WHERE ay.institute_id = i.institute_id
              AND ay.deleted_at IS NULL
          )
        `,
        { transaction },
      );

      if (Number(missingCount) > 0) {
        throw new Error(
          `Academic year backfill incomplete: ${missingCount} institute(s) still have no acedmic_year`,
        );
      }
    });
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(
      `
      DELETE FROM acedmic_year
      WHERE year_title LIKE CONCAT('${MIGRATION_YEAR_TITLE} ', '%')
        AND deleted_at IS NULL
      `,
    );
  },
};
