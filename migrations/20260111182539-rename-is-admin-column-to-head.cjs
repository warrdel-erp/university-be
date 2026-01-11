'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDefinition = await queryInterface.describeTable('head');

    // Add column only if it does NOT exist
    if (!tableDefinition.is_admin) {
      await queryInterface.addColumn('head', 'is_admin', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDefinition = await queryInterface.describeTable('head');

    if (tableDefinition.is_admin) {
      await queryInterface.removeColumn('head', 'is_admin');
    }
  }
};