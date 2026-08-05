'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('assessment_plan_subject_mapping').catch(() => ({}));

    // 1. Add exam_setup_type_id column if not present
    if (!tableDescription.exam_setup_type_id) {
      await queryInterface.addColumn('assessment_plan_subject_mapping', 'exam_setup_type_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'exam_setup_type',
          key: 'exam_setup_type_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }

    // 2. Add acedmic_year_id column if not present
    if (!tableDescription.acedmic_year_id) {
      await queryInterface.addColumn('assessment_plan_subject_mapping', 'acedmic_year_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'acedmic_year',
          key: 'acedmic_year_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('assessment_plan_subject_mapping').catch(() => ({}));

    if (tableDescription.exam_setup_type_id) {
      await queryInterface.removeColumn('assessment_plan_subject_mapping', 'exam_setup_type_id');
    }
  }
};
