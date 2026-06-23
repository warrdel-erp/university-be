'use strict';

const {
  enforceSemesterIdNotNull,
  relaxSemesterIdNullable,
  runInTransaction,
} = require('./helpers/semesterBackfillHelpers.cjs');

/**
 * Step 5 — class_student_mapper.semester_id
 * Depends on: 20260622150300-backfill-semester-id-on-students
 * Next: 20260622150500-backfill-semester-id-on-exam-schedule
 */
module.exports = {
  async up(queryInterface) {
    await runInTransaction(queryInterface, async (transaction) => {
      await queryInterface.sequelize.query(
        `
        UPDATE class_student_mapper csm
        INNER JOIN students s ON s.student_id = csm.student_id AND s.deleted_at IS NULL
        SET csm.semester_id = s.semester_id
        WHERE csm.semester_id IS NULL AND s.semester_id IS NOT NULL AND csm.deleted_at IS NULL
        `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        UPDATE class_student_mapper csm
        INNER JOIN students s ON s.student_id = csm.student_id AND s.deleted_at IS NULL
        INNER JOIN class_sections cs ON cs.class_sections_id = s.class_sections_id AND cs.deleted_at IS NULL
        SET csm.semester_id = cs.semester_id
        WHERE csm.semester_id IS NULL AND cs.semester_id IS NOT NULL AND csm.deleted_at IS NULL
        `,
        { transaction },
      );

      await enforceSemesterIdNotNull(queryInterface, 'class_student_mapper', transaction);
    });
  },

  async down(queryInterface) {
    await runInTransaction(queryInterface, async (transaction) => {
      await relaxSemesterIdNullable(queryInterface, 'class_student_mapper', transaction);
    });
  },
};
