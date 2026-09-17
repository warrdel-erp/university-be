'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Update assessment_plan_subject_mapping
      const apsmDescription = await queryInterface.describeTable(
        'assessment_plan_subject_mapping',
        { transaction }
      ).catch(() => ({}));

      if (!apsmDescription.curriculum_batch_term_mapping_id) {
        // Add column without inline references to avoid auto-generating an identifier exceeding 64 chars
        await queryInterface.addColumn(
          'assessment_plan_subject_mapping',
          'curriculum_batch_term_mapping_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          { transaction }
        );

        // Add foreign key constraint with an explicit, shortened name (<= 64 chars)
        await queryInterface.addConstraint('assessment_plan_subject_mapping', {
          fields: ['curriculum_batch_term_mapping_id'],
          type: 'foreign key',
          name: 'fk_apsm_curriculum_batch_term_mapping',
          references: {
            table: 'curriculum_batch_term_mapping',
            field: 'curriculum_batch_term_mapping_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          transaction,
        });
      }

      // Update unique index to include curriculum_batch_term_mapping_id
      try {
        await queryInterface.removeIndex(
          'assessment_plan_subject_mapping',
          'unique_subject_course_session_assessment_plan',
          { transaction }
        );
      } catch (err) {
        console.log('Index unique_subject_course_session_assessment_plan does not exist or already removed:', err.message);
      }

      try {
        await queryInterface.addIndex(
          'assessment_plan_subject_mapping',
          [
            'subject_id',
            'curriculum_batch_term_mapping_id',
            'course_id',
            'session_id',
            'assessment_plan_id',
          ],
          {
            unique: true,
            name: 'unique_subject_batch_term_plan',
            transaction,
          }
        );
      } catch (err) {
        console.log('Index unique_subject_batch_term_plan already exists or cannot be created:', err.message);
      }

      // 2. Update exam_schedule
      const esDescription = await queryInterface.describeTable(
        'exam_schedule',
        { transaction }
      ).catch(() => ({}));

      if (!esDescription.curriculum_batch_term_mapping_id) {
        await queryInterface.addColumn(
          'exam_schedule',
          'curriculum_batch_term_mapping_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          { transaction }
        );

        await queryInterface.addConstraint('exam_schedule', {
          fields: ['curriculum_batch_term_mapping_id'],
          type: 'foreign key',
          name: 'fk_exam_schedule_curriculum_batch_term_mapping',
          references: {
            table: 'curriculum_batch_term_mapping',
            field: 'curriculum_batch_term_mapping_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          transaction,
        });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Revert exam_schedule
      const esDescription = await queryInterface.describeTable(
        'exam_schedule',
        { transaction }
      ).catch(() => ({}));

      if (esDescription.curriculum_batch_term_mapping_id) {
        try {
          await queryInterface.removeConstraint(
            'exam_schedule',
            'fk_exam_schedule_curriculum_batch_term_mapping',
            { transaction }
          );
        } catch (err) {
          console.log('Constraint fk_exam_schedule_curriculum_batch_term_mapping cannot be removed:', err.message);
        }

        await queryInterface.removeColumn(
          'exam_schedule',
          'curriculum_batch_term_mapping_id',
          { transaction }
        );
      }

      // 2. Revert assessment_plan_subject_mapping
      const apsmDescription = await queryInterface.describeTable(
        'assessment_plan_subject_mapping',
        { transaction }
      ).catch(() => ({}));

      try {
        await queryInterface.removeIndex(
          'assessment_plan_subject_mapping',
          'unique_subject_batch_term_plan',
          { transaction }
        );
      } catch (err) {
        console.log('Index unique_subject_batch_term_plan does not exist or already removed:', err.message);
      }

      try {
        await queryInterface.addIndex(
          'assessment_plan_subject_mapping',
          ['subject_id', 'course_id', 'session_id', 'assessment_plan_id'],
          {
            unique: true,
            name: 'unique_subject_course_session_assessment_plan',
            transaction,
          }
        );
      } catch (err) {
        console.log('Index unique_subject_course_session_assessment_plan cannot be restored:', err.message);
      }

      if (apsmDescription.curriculum_batch_term_mapping_id) {
        try {
          await queryInterface.removeConstraint(
            'assessment_plan_subject_mapping',
            'fk_apsm_curriculum_batch_term_mapping',
            { transaction }
          );
        } catch (err) {
          console.log('Constraint fk_apsm_curriculum_batch_term_mapping cannot be removed:', err.message);
        }

        await queryInterface.removeColumn(
          'assessment_plan_subject_mapping',
          'curriculum_batch_term_mapping_id',
          { transaction }
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
