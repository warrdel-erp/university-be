'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDefinition = await queryInterface.describeTable('library_book');

    if (!tableDefinition.subject_id) {
      await queryInterface.addColumn('library_book', 'subject_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    if (!tableDefinition.class_sections_id) {
      await queryInterface.addColumn('library_book', 'class_sections_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    if (!tableDefinition.remark) {
      await queryInterface.addColumn('library_book', 'remark', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    if (!tableDefinition.item_type) {
      await queryInterface.addColumn('library_book', 'item_type', {
        type: Sequelize.ENUM('print', 'Xerox', 'Digital'),
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const tableDefinition = await queryInterface.describeTable('library_book');

    if (tableDefinition.item_type) {
      await queryInterface.removeColumn('library_book', 'item_type');
    }
    if (tableDefinition.remark) {
      await queryInterface.removeColumn('library_book', 'remark');
    }
    if (tableDefinition.class_sections_id) {
      await queryInterface.removeColumn('library_book', 'class_sections_id');
    }
    if (tableDefinition.subject_id) {
      await queryInterface.removeColumn('library_book', 'subject_id');
    }
  },
};
