'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDefinition = await queryInterface.describeTable('library_book_inventory');

    if (!tableDefinition.accession_date) {
      await queryInterface.addColumn('library_book_inventory', 'accession_date', {
        type: Sequelize.DATEONLY,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const tableDefinition = await queryInterface.describeTable('library_book_inventory');

    if (tableDefinition.accession_date) {
      await queryInterface.removeColumn('library_book_inventory', 'accession_date');
    }
  },
};
