'use strict';

const {
  enforceSemesterIdNotNull,
  relaxSemesterIdNullable,
  runInTransaction,
} = require('./helpers/semesterBackfillHelpers.cjs');

/**
 * Step 4 — students.semester_id
 * Depends on: 20260622150200-backfill-semester-id-on-class-sections
 * Next: 20260622150400-backfill-semester-id-on-class-student-mapper
 */
module.exports = {
  async up(queryInterface) {
    await runInTransaction(queryInterface, async (transaction) => {
      await queryInterface.sequelize.query(
        `
        UPDATE students s
        INNER JOIN class_sections cs ON cs.class_sections_id = s.class_sections_id AND cs.deleted_at IS NULL
        SET s.semester_id = cs.semester_id
        WHERE s.semester_id IS NULL AND cs.semester_id IS NOT NULL AND s.deleted_at IS NULL
        `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        UPDATE students s
        INNER JOIN class_sections cs ON cs.class_sections_id = s.class_sections_id AND cs.deleted_at IS NULL
        INNER JOIN class c ON c.class_id = cs.class_id AND c.deleted_at IS NULL
        SET s.semester_id = c.semester_id
        WHERE s.semester_id IS NULL AND c.semester_id IS NOT NULL AND s.deleted_at IS NULL
        `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        UPDATE students s
        INNER JOIN class_sections cs ON cs.class_sections_id = s.class_sections_id AND cs.deleted_at IS NULL
        INNER JOIN class c ON c.class_id = cs.class_id AND c.deleted_at IS NULL
        INNER JOIN course co ON co.course_id = s.course_id AND co.deleted_at IS NULL
        INNER JOIN semester sem
          ON sem.course_id = s.course_id AND sem.institute_id = s.institute_id
          AND sem.acedmic_year_id = cs.acedmic_year_id AND sem.deleted_at IS NULL
          AND c.term IS NOT NULL
          AND LOWER(TRIM(sem.name)) = LOWER(TRIM(CONCAT(co.term_type, ' ', c.term)))
        SET s.semester_id = sem.semester_id
        WHERE s.semester_id IS NULL AND s.deleted_at IS NULL
        `,
        { transaction },
      );

      await enforceSemesterIdNotNull(queryInterface, 'students', transaction);
    });
  },

  async down(queryInterface) {
    await runInTransaction(queryInterface, async (transaction) => {
      await relaxSemesterIdNullable(queryInterface, 'students', transaction);
    });
  },
};
