'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Backfill assessment_plan_subject_mapping.curriculum_subject_term_mapping_id via curriculum_batch_mapping
      await queryInterface.sequelize.query(
        `UPDATE assessment_plan_subject_mapping apsm
         INNER JOIN curriculum_batch_mapping cbm ON cbm.batch_id = apsm.batch_id
         INNER JOIN curriculum_subject_term_mapping cstm ON cstm.curriculum_id = cbm.curriculum_id AND cstm.subject_id = apsm.subject_id
         SET apsm.curriculum_subject_term_mapping_id = cstm.curriculum_subject_term_mapping_id
         WHERE apsm.curriculum_subject_term_mapping_id IS NULL AND apsm.batch_id IS NOT NULL;`,
        { transaction }
      );

      // 2. Backfill assessment_plan_subject_mapping.curriculum_subject_term_mapping_id via subject_id fallback
      await queryInterface.sequelize.query(
        `UPDATE assessment_plan_subject_mapping apsm
         INNER JOIN (
           SELECT subject_id, MIN(curriculum_subject_term_mapping_id) AS min_cstm_id
           FROM curriculum_subject_term_mapping
           GROUP BY subject_id
         ) cstm_sub ON cstm_sub.subject_id = apsm.subject_id
         SET apsm.curriculum_subject_term_mapping_id = cstm_sub.min_cstm_id
         WHERE apsm.curriculum_subject_term_mapping_id IS NULL;`,
        { transaction }
      );

      // 3. Backfill assessment_plan_subject_mapping.batch_id via curriculum_subject_term_mapping + curriculum_batch_mapping
      await queryInterface.sequelize.query(
        `UPDATE assessment_plan_subject_mapping apsm
         INNER JOIN curriculum_subject_term_mapping cstm ON cstm.curriculum_subject_term_mapping_id = apsm.curriculum_subject_term_mapping_id
         INNER JOIN curriculum_batch_mapping cbm ON cbm.curriculum_id = cstm.curriculum_id
         SET apsm.batch_id = cbm.batch_id
         WHERE apsm.batch_id IS NULL AND apsm.curriculum_subject_term_mapping_id IS NOT NULL;`,
        { transaction }
      );

      // 4. Backfill exam_schedule.curriculum_subject_term_mapping_id from assessment_plan_subject_mapping
      await queryInterface.sequelize.query(
        `UPDATE exam_schedule es
         INNER JOIN assessment_plan_subject_mapping apsm ON apsm.subject_id = es.subject_id AND (es.batch_id IS NULL OR apsm.batch_id = es.batch_id)
         SET es.curriculum_subject_term_mapping_id = apsm.curriculum_subject_term_mapping_id
         WHERE es.curriculum_subject_term_mapping_id IS NULL AND apsm.curriculum_subject_term_mapping_id IS NOT NULL;`,
        { transaction }
      );

      // 5. Backfill exam_schedule.curriculum_subject_term_mapping_id from curriculum_subject_term_mapping by subject_id + term
      await queryInterface.sequelize.query(
        `UPDATE exam_schedule es
         INNER JOIN (
           SELECT subject_id, term, MIN(curriculum_subject_term_mapping_id) AS min_cstm_id
           FROM curriculum_subject_term_mapping
           GROUP BY subject_id, term
         ) cstm ON cstm.subject_id = es.subject_id AND cstm.term = es.term
         SET es.curriculum_subject_term_mapping_id = cstm.min_cstm_id
         WHERE es.curriculum_subject_term_mapping_id IS NULL;`,
        { transaction }
      );

      // 6. Backfill exam_schedule.batch_id from assessment_plan_subject_mapping
      await queryInterface.sequelize.query(
        `UPDATE exam_schedule es
         INNER JOIN assessment_plan_subject_mapping apsm ON apsm.subject_id = es.subject_id AND (es.curriculum_subject_term_mapping_id IS NULL OR apsm.curriculum_subject_term_mapping_id = es.curriculum_subject_term_mapping_id)
         SET es.batch_id = apsm.batch_id
         WHERE es.batch_id IS NULL AND apsm.batch_id IS NOT NULL;`,
        { transaction }
      );

      // 7. Backfill exam_schedule.batch_id from examination_session_term -> session -> batch
      await queryInterface.sequelize.query(
        `UPDATE exam_schedule es
         INNER JOIN examination_session_term est ON est.examination_session_id = es.examination_session_id AND est.term = es.term
         INNER JOIN batch b ON b.session_id = est.session_id
         SET es.batch_id = b.batch_id
         WHERE es.batch_id IS NULL;`,
        { transaction }
      );

      await transaction.commit();
      console.log('Backfill migration for exam_schedule and assessment_plan_subject_mapping completed successfully.');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // Backfill data migration — no rollback needed
  },
};
