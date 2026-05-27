'use strict';

/**
 * Removes legacy library member / add-item / issue-book flow tables.
 * Replaced by library_issue_book_transaction + library_book_issue_inventory_item.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.dropTable('library_issue_book');
    await queryInterface.dropTable('library_author_details');
    await queryInterface.dropTable('library_multiple_book_details');
    await queryInterface.dropTable('library_add_item');
    await queryInterface.dropTable('library_member');
  },

  async down() {
    // Legacy tables are not recreated automatically.
  },
};
