'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const planTable = await queryInterface.describeTable('assessment_plan');

    if (planTable.grading_scheme) {
      await queryInterface.removeColumn('assessment_plan', 'grading_scheme');
    }

    if (!planTable.grading_id) {
      await queryInterface.addColumn('assessment_plan', 'grading_id', {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {
          model: 'grading',
          key: 'grading_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
      await queryInterface.addIndex('assessment_plan', ['grading_id']);
    }
  },

  async down(queryInterface, Sequelize) {
    const planTable = await queryInterface.describeTable('assessment_plan');

    if (planTable.grading_id) {
      await queryInterface.removeColumn('assessment_plan', 'grading_id');
    }

    if (!planTable.grading_scheme) {
      await queryInterface.addColumn('assessment_plan', 'grading_scheme', {
        type: Sequelize.STRING(50),
        allowNull: true,
      });
    }
  }
};
