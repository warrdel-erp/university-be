'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Backfill assessment_plan_subject_mapping.curriculum_batch_term_mapping_id
      // Matching via curriculum_subject_term_mapping first, and fallback to subject.term
      // for batches 2023, 2024, 2025 within current calendar year 2025
      const updateApsmQuery = `
        UPDATE assessment_plan_subject_mapping apsm
        JOIN subject s ON apsm.subject_id = s.subject_id
        SET apsm.curriculum_batch_term_mapping_id = COALESCE(
          (
            SELECT cbtm.curriculum_batch_term_mapping_id
            FROM curriculum_batch_term_mapping cbtm
            JOIN curriculum_batch_mapping cbm ON cbtm.curriculum_batch_mapping_id = cbm.curriculum_batch_mapping_id
            JOIN curriculum c ON cbm.curriculum_id = c.curriculum_id
            JOIN curriculum_subject_term_mapping cstm ON cstm.curriculum_id = cbm.curriculum_id AND cstm.term = cbtm.term
            WHERE cstm.subject_id = apsm.subject_id
              AND c.course_id = apsm.course_id
              AND cbm.batch IN (2023, 2024, 2025)
              AND cbtm.year = 2025
            ORDER BY cbtm.curriculum_batch_term_mapping_id ASC
            LIMIT 1
          ),
          (
            SELECT cbtm.curriculum_batch_term_mapping_id
            FROM curriculum_batch_term_mapping cbtm
            JOIN curriculum_batch_mapping cbm ON cbtm.curriculum_batch_mapping_id = cbm.curriculum_batch_mapping_id
            JOIN curriculum c ON cbm.curriculum_id = c.curriculum_id
            WHERE c.course_id = apsm.course_id
              AND cbtm.term = s.term
              AND cbm.batch IN (2023, 2024, 2025)
              AND cbtm.year = 2025
            ORDER BY cbtm.curriculum_batch_term_mapping_id ASC
            LIMIT 1
          )
        )
        WHERE apsm.curriculum_batch_term_mapping_id IS NULL;
      `;

      // 2. Backfill exam_schedule.curriculum_batch_term_mapping_id
      // Matching via curriculum_subject_term_mapping with exam_schedule.term first,
      // and fallback to es.term / s.term for batches 2023, 2024, 2025 within year 2025
      const updateEsQuery = `
        UPDATE exam_schedule es
        JOIN subject s ON es.subject_id = s.subject_id
        SET es.curriculum_batch_term_mapping_id = COALESCE(
          (
            SELECT cbtm.curriculum_batch_term_mapping_id
            FROM curriculum_batch_term_mapping cbtm
            JOIN curriculum_batch_mapping cbm ON cbtm.curriculum_batch_mapping_id = cbm.curriculum_batch_mapping_id
            JOIN curriculum c ON cbm.curriculum_id = c.curriculum_id
            JOIN curriculum_subject_term_mapping cstm ON cstm.curriculum_id = cbm.curriculum_id AND cstm.term = cbtm.term
            WHERE cstm.subject_id = es.subject_id
              AND cbtm.term = es.term
              AND c.course_id = s.course_id
              AND cbm.batch IN (2023, 2024, 2025)
              AND cbtm.year = 2025
            ORDER BY cbtm.curriculum_batch_term_mapping_id ASC
            LIMIT 1
          ),
          (
            SELECT cbtm.curriculum_batch_term_mapping_id
            FROM curriculum_batch_term_mapping cbtm
            JOIN curriculum_batch_mapping cbm ON cbtm.curriculum_batch_mapping_id = cbm.curriculum_batch_mapping_id
            JOIN curriculum c ON cbm.curriculum_id = c.curriculum_id
            WHERE c.course_id = s.course_id
              AND cbtm.term = COALESCE(es.term, s.term)
              AND cbm.batch IN (2023, 2024, 2025)
              AND cbtm.year = 2025
            ORDER BY cbtm.curriculum_batch_term_mapping_id ASC
            LIMIT 1
          )
        )
        WHERE es.curriculum_batch_term_mapping_id IS NULL;
      `;

      await queryInterface.sequelize.query(updateApsmQuery, { transaction });
      await queryInterface.sequelize.query(updateEsQuery, { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.sequelize.query(
        `UPDATE assessment_plan_subject_mapping SET curriculum_batch_term_mapping_id = NULL WHERE curriculum_batch_term_mapping_id IS NOT NULL;`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `UPDATE exam_schedule SET curriculum_batch_term_mapping_id = NULL WHERE curriculum_batch_term_mapping_id IS NOT NULL;`,
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
