'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('grading');
    if (!tableInfo.maximum_marks) {
      await queryInterface.addColumn('grading', 'maximum_marks', {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: true,
      });
    }
    if (!tableInfo.minimum_passing_marks) {
      await queryInterface.addColumn('grading', 'minimum_passing_marks', {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('grading');
    if (tableInfo.maximum_marks) {
      await queryInterface.removeColumn('grading', 'maximum_marks');
    }
    if (tableInfo.minimum_passing_marks) {
      await queryInterface.removeColumn('grading', 'minimum_passing_marks');
    }
  }
};
