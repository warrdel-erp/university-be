'use strict';

const {
  enforceSemesterIdNotNull,
  relaxSemesterIdNullable,
  runInTransaction,
} = require('./helpers/semesterBackfillHelpers.cjs');

/**
 * Step 7 — internal_assessment.semester_id
 * Depends on: 20260622150500-backfill-semester-id-on-exam-schedule
 */
module.exports = {
  async up(queryInterface) {
    await runInTransaction(queryInterface, async (transaction) => {
      await queryInterface.sequelize.query(
        `
        UPDATE internal_assessment ia
        INNER JOIN (
          SELECT ia.exam_assessment_id, MIN(csm.semester_id) AS semester_id
          FROM internal_assessment ia
          INNER JOIN class_subject_mapper csm ON csm.subject_id = ia.subject_id AND csm.deleted_at IS NULL
          WHERE ia.semester_id IS NULL AND ia.deleted_at IS NULL
          GROUP BY ia.exam_assessment_id
        ) matched ON matched.exam_assessment_id = ia.exam_assessment_id
        SET ia.semester_id = matched.semester_id
        `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        UPDATE internal_assessment ia
        INNER JOIN subject sub ON sub.subject_id = ia.subject_id AND sub.deleted_at IS NULL
        INNER JOIN course co ON co.course_id = sub.course_id AND co.deleted_at IS NULL
        INNER JOIN semester sem
          ON sem.course_id = sub.course_id AND sem.institute_id = co.institute_id
          AND sem.acedmic_year_id = sub.acedmic_year_id AND sem.deleted_at IS NULL
          AND sub.term IS NOT NULL
          AND LOWER(TRIM(sem.name)) = LOWER(TRIM(CONCAT(co.term_type, ' ', sub.term)))
        SET ia.semester_id = sem.semester_id
        WHERE ia.semester_id IS NULL AND ia.deleted_at IS NULL
        `,
        { transaction },
      );

      await enforceSemesterIdNotNull(queryInterface, 'internal_assessment', transaction);
    });
  },

  async down(queryInterface) {
    await runInTransaction(queryInterface, async (transaction) => {
      await relaxSemesterIdNullable(queryInterface, 'internal_assessment', transaction);
    });
  },
};
