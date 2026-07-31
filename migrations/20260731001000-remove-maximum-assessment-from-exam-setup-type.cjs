'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('exam_setup_type');

    if (tableInfo.maximum_assessment) {
      await queryInterface.removeColumn('exam_setup_type', 'maximum_assessment');
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('exam_setup_type');
    if (!tableInfo.maximum_assessment) {
      await queryInterface.addColumn('exam_setup_type', 'maximum_assessment', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
  }
};
