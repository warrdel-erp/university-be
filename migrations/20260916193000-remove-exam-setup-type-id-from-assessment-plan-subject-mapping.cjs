'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface
      .describeTable('assessment_plan_subject_mapping')
      .catch(() => ({}));

    if (tableDescription.exam_setup_type_id) {
      // Remove foreign key constraint if it exists
      try {
        await queryInterface.removeConstraint(
          'assessment_plan_subject_mapping',
          'assessment_plan_subject_mapping_ibfk_5'
        );
      } catch (err) {
        // FK might have a different name or already removed
      }

      await queryInterface.removeColumn(
        'assessment_plan_subject_mapping',
        'exam_setup_type_id'
      );
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDescription = await queryInterface
      .describeTable('assessment_plan_subject_mapping')
      .catch(() => ({}));

    if (!tableDescription.exam_setup_type_id) {
      await queryInterface.addColumn(
        'assessment_plan_subject_mapping',
        'exam_setup_type_id',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'exam_setup_type',
            key: 'exam_setup_type_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        }
      );
    }
  },
};
