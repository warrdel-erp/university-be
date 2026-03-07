'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDefinition = await queryInterface.describeTable('course');
    if (tableDefinition.total_semester) {
      await queryInterface.renameColumn('course', 'total_semester', 'total_terms');
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDefinition = await queryInterface.describeTable('course');
    if (tableDefinition.total_terms) {
      await queryInterface.renameColumn('course', 'total_terms', 'total_semester');
    }
  }
};
