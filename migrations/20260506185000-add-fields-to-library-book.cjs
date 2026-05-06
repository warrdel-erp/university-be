'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('library_book', 'subject_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('library_book', 'class_sections_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('library_book', 'remark', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('library_book', 'item_type', {
      type: Sequelize.ENUM('print', 'Xerox', 'Digital'),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('library_book', 'item_type');
    await queryInterface.removeColumn('library_book', 'remark');
    await queryInterface.removeColumn('library_book', 'class_sections_id');
    await queryInterface.removeColumn('library_book', 'subject_id');
  },
};
