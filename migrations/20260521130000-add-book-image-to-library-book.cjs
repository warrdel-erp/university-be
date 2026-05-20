'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDefinition = await queryInterface.describeTable('library_book');

    if (!tableDefinition.book_image) {
      await queryInterface.addColumn('library_book', 'book_image', {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const tableDefinition = await queryInterface.describeTable('library_book');

    if (tableDefinition.book_image) {
      await queryInterface.removeColumn('library_book', 'book_image');
    }
  },
};
