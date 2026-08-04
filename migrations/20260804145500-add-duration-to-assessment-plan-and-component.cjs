'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const assessmentPlanDescription = await queryInterface.describeTable('assessment_plan').catch(() => ({}));
    if (assessmentPlanDescription && !assessmentPlanDescription.duration) {
      await queryInterface.addColumn('assessment_plan', 'duration', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Duration in minutes',
      });
    }

    const componentDescription = await queryInterface.describeTable('assessment_plan_component').catch(() => ({}));
    if (componentDescription && !componentDescription.duration) {
      await queryInterface.addColumn('assessment_plan_component', 'duration', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Duration in minutes',
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const assessmentPlanDescription = await queryInterface.describeTable('assessment_plan').catch(() => ({}));
    if (assessmentPlanDescription && assessmentPlanDescription.duration) {
      await queryInterface.removeColumn('assessment_plan', 'duration');
    }

    const componentDescription = await queryInterface.describeTable('assessment_plan_component').catch(() => ({}));
    if (componentDescription && componentDescription.duration) {
      await queryInterface.removeColumn('assessment_plan_component', 'duration');
    }
  }
};
