'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDefinition = await queryInterface.describeTable('semester');
    if (tableDefinition.total_semester) {
      await queryInterface.renameColumn('semester', 'total_semester', 'total_terms');
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDefinition = await queryInterface.describeTable('semester');
    if (tableDefinition.total_terms) {
      await queryInterface.renameColumn('semester', 'total_terms', 'total_semester');
    }
  }
};
