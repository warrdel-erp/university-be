'use strict';

const {
  enforceSemesterIdNotNull,
  relaxSemesterIdNullable,
  runInTransaction,
} = require('./helpers/semesterBackfillHelpers.cjs');

async function seedMissingSemestersForExams(queryInterface, transaction) {
  const [gaps] = await queryInterface.sequelize.query(
    `
    SELECT DISTINCT
      c.course_id, es.acedmic_year_id, c.university_id, c.institute_id,
      c.term_type, c.course_duration, c.total_terms, c.created_by
    FROM exam_schedule es
    INNER JOIN exam_setup_type_term est ON est.exam_setup_type_term_id = es.exam_setup_type_term_id
    INNER JOIN course c ON c.course_id = est.course_id AND c.deleted_at IS NULL
    WHERE es.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM semester sem
        WHERE sem.course_id = est.course_id
          AND sem.acedmic_year_id = es.acedmic_year_id
          AND sem.deleted_at IS NULL
      )
    `,
    { transaction },
  );

  for (const gap of gaps) {
    const [[template]] = await queryInterface.sequelize.query(
      `SELECT semester_duration FROM semester WHERE course_id = :courseId AND deleted_at IS NULL ORDER BY semester_id LIMIT 1`,
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
        SELECT :universityId, :courseId, :acedmicYearId, :instituteId,
          :termType, :name, :semesterDuration, :courseDuration, :totalTerms, :createdBy
        FROM DUAL
        WHERE NOT EXISTS (
          SELECT 1 FROM semester sem
          WHERE sem.course_id = :courseId AND sem.acedmic_year_id = :acedmicYearId
            AND sem.name = :name AND sem.deleted_at IS NULL
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
}

/**
 * Step 6 — exam_schedule.semester_id
 * Depends on: 20260622150400-backfill-semester-id-on-class-student-mapper
 * Next: 20260622150600-backfill-semester-id-on-internal-assessment
 */
module.exports = {
  async up(queryInterface) {
    await runInTransaction(queryInterface, async (transaction) => {
      await seedMissingSemestersForExams(queryInterface, transaction);

      await queryInterface.sequelize.query(
        `
        UPDATE exam_schedule es
        INNER JOIN class_subject_mapper csm ON csm.subject_id = es.subject_id AND csm.deleted_at IS NULL
        SET es.semester_id = csm.semester_id
        WHERE es.semester_id IS NULL AND es.subject_id IS NOT NULL AND es.deleted_at IS NULL
        `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        UPDATE exam_schedule es
        INNER JOIN (
          SELECT es.exam_schedule_id, MIN(sem.semester_id) AS semester_id
          FROM exam_schedule es
          INNER JOIN exam_setup_type_term est ON est.exam_setup_type_term_id = es.exam_setup_type_term_id
          INNER JOIN course co ON co.course_id = est.course_id AND co.deleted_at IS NULL
          INNER JOIN semester sem ON sem.course_id = est.course_id AND sem.institute_id = co.institute_id
            AND sem.acedmic_year_id = es.acedmic_year_id AND sem.deleted_at IS NULL
            AND LOWER(TRIM(sem.name)) = LOWER(TRIM(CONCAT(co.term_type, ' ', est.term)))
          WHERE es.semester_id IS NULL AND es.deleted_at IS NULL
          GROUP BY es.exam_schedule_id
        ) matched ON matched.exam_schedule_id = es.exam_schedule_id
        SET es.semester_id = matched.semester_id
        `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        UPDATE exam_schedule es
        INNER JOIN (
          SELECT es.exam_schedule_id, MIN(sem.semester_id) AS semester_id
          FROM exam_schedule es
          INNER JOIN exam_setup_type_term est ON est.exam_setup_type_term_id = es.exam_setup_type_term_id
          INNER JOIN course co ON co.course_id = est.course_id AND co.deleted_at IS NULL
          INNER JOIN semester sem ON sem.course_id = est.course_id AND sem.institute_id = co.institute_id
            AND sem.acedmic_year_id = es.acedmic_year_id AND sem.deleted_at IS NULL
            AND CAST(REGEXP_SUBSTR(sem.name, '[0-9]+') AS UNSIGNED) = est.term
          WHERE es.semester_id IS NULL AND es.deleted_at IS NULL
          GROUP BY es.exam_schedule_id
        ) matched ON matched.exam_schedule_id = es.exam_schedule_id
        SET es.semester_id = matched.semester_id
        `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        UPDATE exam_schedule es
        INNER JOIN (
          SELECT es.exam_schedule_id, ranked.semester_id
          FROM exam_schedule es
          INNER JOIN exam_setup_type_term est ON est.exam_setup_type_term_id = es.exam_setup_type_term_id
          INNER JOIN course co ON co.course_id = est.course_id AND co.deleted_at IS NULL
          INNER JOIN (
            SELECT sem.course_id, sem.institute_id, sem.acedmic_year_id, sem.semester_id,
              ROW_NUMBER() OVER (
                PARTITION BY sem.course_id, sem.institute_id, sem.acedmic_year_id
                ORDER BY sem.semester_id
              ) AS term_index
            FROM semester sem WHERE sem.deleted_at IS NULL
          ) ranked ON ranked.course_id = est.course_id AND ranked.institute_id = co.institute_id
            AND ranked.acedmic_year_id = es.acedmic_year_id AND ranked.term_index = est.term
          WHERE es.semester_id IS NULL AND es.deleted_at IS NULL
        ) matched ON matched.exam_schedule_id = es.exam_schedule_id
        SET es.semester_id = matched.semester_id
        `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        UPDATE exam_schedule es
        INNER JOIN (
          SELECT es.exam_schedule_id, MIN(sem.semester_id) AS semester_id
          FROM exam_schedule es
          INNER JOIN exam_setup_type_term est ON est.exam_setup_type_term_id = es.exam_setup_type_term_id
          INNER JOIN course co ON co.course_id = est.course_id AND co.deleted_at IS NULL
          INNER JOIN semester sem ON sem.course_id = est.course_id AND sem.institute_id = co.institute_id
            AND sem.deleted_at IS NULL
            AND LOWER(TRIM(sem.name)) = LOWER(TRIM(CONCAT(co.term_type, ' ', est.term)))
          WHERE es.semester_id IS NULL AND es.deleted_at IS NULL
          GROUP BY es.exam_schedule_id
        ) matched ON matched.exam_schedule_id = es.exam_schedule_id
        SET es.semester_id = matched.semester_id
        `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        UPDATE exam_schedule es
        INNER JOIN (
          SELECT es.exam_schedule_id, MIN(sem.semester_id) AS semester_id
          FROM exam_schedule es
          INNER JOIN exam_setup_type_term est ON est.exam_setup_type_term_id = es.exam_setup_type_term_id
          INNER JOIN course co ON co.course_id = est.course_id AND co.deleted_at IS NULL
          INNER JOIN semester sem ON sem.course_id = est.course_id AND sem.institute_id = co.institute_id
            AND sem.deleted_at IS NULL
            AND CAST(REGEXP_SUBSTR(sem.name, '[0-9]+') AS UNSIGNED) = est.term
          WHERE es.semester_id IS NULL AND es.deleted_at IS NULL
          GROUP BY es.exam_schedule_id
        ) matched ON matched.exam_schedule_id = es.exam_schedule_id
        SET es.semester_id = matched.semester_id
        `,
        { transaction },
      );

      await enforceSemesterIdNotNull(queryInterface, 'exam_schedule', transaction);
    });
  },

  async down(queryInterface) {
    await runInTransaction(queryInterface, async (transaction) => {
      await relaxSemesterIdNullable(queryInterface, 'exam_schedule', transaction);
    });
  },
};
