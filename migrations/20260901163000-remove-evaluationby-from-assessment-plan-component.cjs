'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('assessment_plan_component');
    if (tableInfo.evaluation_by) {
      await queryInterface.removeColumn('assessment_plan_component', 'evaluation_by');
    }
  },

  async down (queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('assessment_plan_component');
    if (!tableInfo.evaluation_by) {
      await queryInterface.addColumn('assessment_plan_component', 'evaluation_by', {
        type: Sequelize.ENUM('Faculty', 'CoE', 'External'),
        allowNull: false,
        defaultValue: 'Faculty',
      });
    }
  }
};
