'use strict';

const { runInTransaction } = require('./helpers/semesterBackfillHelpers.cjs');

/**
 * Step 1 — semester master rows required by later backfills.
 * Depends on: course, class, students, exam_schedule (read-only).
 * Next: 20260622150100-backfill-semester-id-on-class
 */
module.exports = {
  async up(queryInterface) {
    await runInTransaction(queryInterface, async (transaction) => {
      const [gaps] = await queryInterface.sequelize.query(
        `
        SELECT DISTINCT
          c.course_id,
          need.acedmic_year_id,
          c.university_id,
          c.institute_id,
          c.term_type,
          c.course_duration,
          c.total_terms,
          c.created_by
        FROM (
          SELECT est.course_id, es.acedmic_year_id
          FROM exam_schedule es
          INNER JOIN exam_setup_type_term est ON est.exam_setup_type_term_id = es.exam_setup_type_term_id
          WHERE es.deleted_at IS NULL
          UNION
          SELECT s.course_id, cs.acedmic_year_id
          FROM students s
          INNER JOIN class_sections cs ON cs.class_sections_id = s.class_sections_id
          WHERE s.deleted_at IS NULL
          UNION
          SELECT c.course_id, sess.acedmic_year_id
          FROM class c
          INNER JOIN session sess ON sess.session_id = c.session_id
          WHERE c.deleted_at IS NULL
        ) need
        INNER JOIN course c ON c.course_id = need.course_id AND c.deleted_at IS NULL
        WHERE NOT EXISTS (
          SELECT 1
          FROM semester sem
          WHERE sem.course_id = need.course_id
            AND sem.acedmic_year_id = need.acedmic_year_id
            AND sem.deleted_at IS NULL
        )
        `,
        { transaction },
      );

      for (const gap of gaps) {
        const [[template]] = await queryInterface.sequelize.query(
          `
          SELECT semester_duration
          FROM semester
          WHERE course_id = :courseId AND deleted_at IS NULL
          ORDER BY semester_id
          LIMIT 1
          `,
          { replacements: { courseId: gap.course_id }, transaction },
        );

        const semesterDuration = template?.semester_duration ?? 6;
        const totalTerms = Number(gap.total_terms) || 1;

        for (let term = 1; term <= totalTerms; term += 1) {
          await queryInterface.sequelize.query(
            `
            INSERT INTO semester (
              university_id, course_id, acedmic_year_id, institute_id,
              term_type, name, semester_duration, course_duration, total_terms, created_by
            )
            SELECT
              :universityId, :courseId, :acedmicYearId, :instituteId,
              :termType, :name, :semesterDuration, :courseDuration, :totalTerms, :createdBy
            FROM DUAL
            WHERE NOT EXISTS (
              SELECT 1 FROM semester sem
              WHERE sem.course_id = :courseId
                AND sem.acedmic_year_id = :acedmicYearId
                AND sem.name = :name
                AND sem.deleted_at IS NULL
            )
            `,
            {
              replacements: {
                universityId: gap.university_id,
                courseId: gap.course_id,
                acedmicYearId: gap.acedmic_year_id,
                instituteId: gap.institute_id,
                termType: gap.term_type,
                name: `${gap.term_type} ${term}`,
                semesterDuration,
                courseDuration: gap.course_duration,
                totalTerms,
                createdBy: gap.created_by,
              },
              transaction,
            },
          );
        }
      }
    });
  },

  async down() {
    // Seeded semester rows are not safely reversible.
  },
};
