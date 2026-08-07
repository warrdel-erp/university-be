'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('exam_type');

    if (!tableInfo.assessment_code) {
      await queryInterface.addColumn('exam_type', 'assessment_code', {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: 'ASSESSMENT',
      });
    }

    if (!tableInfo.assessment_category) {
      await queryInterface.addColumn('exam_type', 'assessment_category', {
        type: Sequelize.ENUM(
          'EXAMINATION',
          'CONTINUOUS_ASSESSMENT',
          'PRACTICAL_EVALUATION',
          'PROJECT_RESEARCH_EVALUATION',
          'PARTICIPATION_ENGAGEMENT'
        ),
        allowNull: false,
        defaultValue: 'EXAMINATION',
      });
    }

    if (!tableInfo.assessment_sub_category) {
      await queryInterface.addColumn('exam_type', 'assessment_sub_category', {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: 'General',
      });
    }

    if (!tableInfo.description) {
      await queryInterface.addColumn('exam_type', 'description', {
        type: Sequelize.STRING(500),
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('exam_type');

    if (tableInfo.description) {
      await queryInterface.removeColumn('exam_type', 'description');
    }
    if (tableInfo.assessment_sub_category) {
      await queryInterface.removeColumn('exam_type', 'assessment_sub_category');
    }
    if (tableInfo.assessment_category) {
      await queryInterface.removeColumn('exam_type', 'assessment_category');
    }
    if (tableInfo.assessment_code) {
      await queryInterface.removeColumn('exam_type', 'assessment_code');
    }
  }
};
