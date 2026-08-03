'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('exam_setup_type');

    if (tableInfo.is_publish) {
      await queryInterface.removeColumn('exam_setup_type', 'is_publish');
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('exam_setup_type');
    if (!tableInfo.is_publish) {
      await queryInterface.addColumn('exam_setup_type', 'is_publish', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }
  }
};
