'use strict';

const {
  enforceSemesterIdNotNull,
  relaxSemesterIdNullable,
  runInTransaction,
} = require('./helpers/semesterBackfillHelpers.cjs');

/**
 * Step 3 — class_sections.semester_id
 * Depends on: 20260622150100-backfill-semester-id-on-class
 * Next: 20260622150300-backfill-semester-id-on-students
 */
module.exports = {
  async up(queryInterface) {
    await runInTransaction(queryInterface, async (transaction) => {
      await queryInterface.sequelize.query(
        `
        UPDATE class_sections cs
        INNER JOIN class c ON c.class_id = cs.class_id AND c.deleted_at IS NULL
        SET cs.semester_id = c.semester_id
        WHERE cs.semester_id IS NULL AND c.semester_id IS NOT NULL AND cs.deleted_at IS NULL
        `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        UPDATE class_sections cs
        INNER JOIN class c ON c.class_id = cs.class_id AND c.deleted_at IS NULL
        INNER JOIN course co ON co.course_id = cs.course_id AND co.deleted_at IS NULL
        INNER JOIN semester sem
          ON sem.course_id = cs.course_id AND sem.institute_id = cs.institute_id
          AND sem.acedmic_year_id = cs.acedmic_year_id AND sem.deleted_at IS NULL
          AND c.term IS NOT NULL
          AND LOWER(TRIM(sem.name)) = LOWER(TRIM(CONCAT(co.term_type, ' ', c.term)))
        SET cs.semester_id = sem.semester_id
        WHERE cs.semester_id IS NULL AND cs.deleted_at IS NULL
        `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        UPDATE class_sections cs
        INNER JOIN class c ON c.class_id = cs.class_id AND c.deleted_at IS NULL
        SET cs.class = CAST(c.term AS CHAR)
        WHERE cs.class IS NULL AND c.term IS NOT NULL AND cs.deleted_at IS NULL
        `,
        { transaction },
      );

      await enforceSemesterIdNotNull(queryInterface, 'class_sections', transaction);
    });
  },

  async down(queryInterface) {
    await runInTransaction(queryInterface, async (transaction) => {
      await relaxSemesterIdNullable(queryInterface, 'class_sections', transaction);
    });
  },
};
