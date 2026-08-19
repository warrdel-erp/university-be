'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
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
    const componentDescription = await queryInterface.describeTable('assessment_plan_component').catch(() => ({}));
    if (componentDescription && componentDescription.duration) {
      await queryInterface.removeColumn('assessment_plan_component', 'duration');
    }
  }
};
