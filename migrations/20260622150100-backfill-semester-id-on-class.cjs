'use strict';

const {
  enforceSemesterIdNotNull,
  relaxSemesterIdNullable,
  runInTransaction,
} = require('./helpers/semesterBackfillHelpers.cjs');

/**
 * Step 2 — class.semester_id
 * Depends on: 20260622150000-seed-missing-semesters-for-course-years
 * Next: 20260622150200-backfill-semester-id-on-class-sections
 */
module.exports = {
  async up(queryInterface) {
    await runInTransaction(queryInterface, async (transaction) => {
      await queryInterface.sequelize.query(
        `
        UPDATE class c
        INNER JOIN (
          SELECT cs.class_id, MIN(cs.semester_id) AS semester_id
          FROM class_sections cs
          INNER JOIN semester sem ON sem.semester_id = cs.semester_id AND sem.deleted_at IS NULL
          WHERE cs.semester_id IS NOT NULL AND cs.deleted_at IS NULL
          GROUP BY cs.class_id
        ) src ON src.class_id = c.class_id
        SET c.semester_id = src.semester_id
        WHERE c.semester_id IS NULL AND c.deleted_at IS NULL
        `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        UPDATE class c
        INNER JOIN (
          SELECT cs.class_id, MIN(CAST(cs.class AS UNSIGNED)) AS term_num
          FROM class_sections cs
          WHERE cs.class IS NOT NULL AND cs.class REGEXP '^[0-9]+$' AND cs.deleted_at IS NULL
          GROUP BY cs.class_id
        ) src ON src.class_id = c.class_id
        SET c.term = src.term_num
        WHERE c.term IS NULL AND c.deleted_at IS NULL
        `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        UPDATE class
        SET term = CAST(REGEXP_SUBSTR(class_name, '[0-9]+$') AS UNSIGNED)
        WHERE term IS NULL AND deleted_at IS NULL AND class_name REGEXP '[0-9]+$'
        `,
        { transaction },
      );

      const termMatchSteps = [
        `
        INNER JOIN session sess ON sess.session_id = c.session_id AND sess.deleted_at IS NULL
        INNER JOIN semester sem
          ON sem.course_id = c.course_id AND sem.institute_id = c.institute_id
          AND sem.acedmic_year_id = sess.acedmic_year_id AND sem.deleted_at IS NULL
          AND c.term IS NOT NULL
          AND LOWER(TRIM(sem.name)) = LOWER(TRIM(CONCAT(co.term_type, ' ', c.term)))
        `,
        `
        INNER JOIN semester sem
          ON sem.course_id = c.course_id AND sem.institute_id = c.institute_id AND sem.deleted_at IS NULL
          AND c.term IS NOT NULL
          AND LOWER(TRIM(sem.name)) = LOWER(TRIM(CONCAT(co.term_type, ' ', c.term)))
        `,
        `
        INNER JOIN session sess ON sess.session_id = c.session_id AND sess.deleted_at IS NULL
        INNER JOIN semester sem
          ON sem.course_id = c.course_id AND sem.institute_id = c.institute_id
          AND sem.acedmic_year_id = sess.acedmic_year_id AND sem.deleted_at IS NULL
          AND c.term IS NOT NULL
          AND CAST(REGEXP_SUBSTR(sem.name, '[0-9]+') AS UNSIGNED) = c.term
        `,
        `
        INNER JOIN semester sem
          ON sem.course_id = c.course_id AND sem.institute_id = c.institute_id AND sem.deleted_at IS NULL
          AND c.term IS NOT NULL
          AND CAST(REGEXP_SUBSTR(sem.name, '[0-9]+') AS UNSIGNED) = c.term
        `,
      ];

      for (const joinClause of termMatchSteps) {
        await queryInterface.sequelize.query(
          `
          UPDATE class c
          INNER JOIN (
            SELECT c.class_id, MIN(sem.semester_id) AS semester_id
            FROM class c
            INNER JOIN course co ON co.course_id = c.course_id AND co.deleted_at IS NULL
            ${joinClause}
            WHERE c.semester_id IS NULL AND c.deleted_at IS NULL
            GROUP BY c.class_id
          ) matched ON matched.class_id = c.class_id
          SET c.semester_id = matched.semester_id
          `,
          { transaction },
        );
      }

      await queryInterface.sequelize.query(
        `
        UPDATE class c
        INNER JOIN (
          SELECT c.class_id, ranked.semester_id
          FROM class c
          INNER JOIN session sess ON sess.session_id = c.session_id AND sess.deleted_at IS NULL
          INNER JOIN (
            SELECT sem.course_id, sem.institute_id, sem.acedmic_year_id, sem.semester_id,
              ROW_NUMBER() OVER (
                PARTITION BY sem.course_id, sem.institute_id, sem.acedmic_year_id
                ORDER BY sem.semester_id
              ) AS term_index
            FROM semester sem WHERE sem.deleted_at IS NULL
          ) ranked
            ON ranked.course_id = c.course_id AND ranked.institute_id = c.institute_id
            AND ranked.acedmic_year_id = sess.acedmic_year_id AND ranked.term_index = c.term
          WHERE c.semester_id IS NULL AND c.term IS NOT NULL AND c.deleted_at IS NULL
        ) matched ON matched.class_id = c.class_id
        SET c.semester_id = matched.semester_id
        `,
        { transaction },
      );

      await enforceSemesterIdNotNull(queryInterface, 'class', transaction);
    });
  },

  async down(queryInterface) {
    await runInTransaction(queryInterface, async (transaction) => {
      await relaxSemesterIdNullable(queryInterface, 'class', transaction);
    });
  },
};
