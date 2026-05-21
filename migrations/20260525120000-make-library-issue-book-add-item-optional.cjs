'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE library_issue_book
      MODIFY COLUMN library_add_item_id INT NULL
    `);

    const tableDefinition = await queryInterface.describeTable('library_issue_book');

    if (!tableDefinition.library_book_id) {
      await queryInterface.addColumn('library_issue_book', 'library_book_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'library_book',
          key: 'library_book_id',
        },
      });
    }

    if (!tableDefinition.received_by) {
      await queryInterface.addColumn('library_issue_book', 'received_by', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    await queryInterface.sequelize.query('TRUNCATE TABLE library_issue_book');
  },

  async down(queryInterface) {
    const tableDefinition = await queryInterface.describeTable('library_issue_book');

    if (tableDefinition.received_by) {
      await queryInterface.removeColumn('library_issue_book', 'received_by');
    }

    if (tableDefinition.library_book_id) {
      await queryInterface.removeColumn('library_issue_book', 'library_book_id');
    }

    await queryInterface.sequelize.query(`
      ALTER TABLE library_issue_book
      MODIFY COLUMN library_add_item_id INT NOT NULL
    `);
  },
};
