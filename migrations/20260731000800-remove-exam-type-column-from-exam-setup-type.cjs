'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('exam_setup_type');

    if (tableInfo.exam_type) {
      await queryInterface.removeColumn('exam_setup_type', 'exam_type');
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('exam_setup_type');
    if (!tableInfo.exam_type) {
      await queryInterface.addColumn('exam_setup_type', 'exam_type', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  }
};
