'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove duplicate active records first
    await queryInterface.sequelize.query(`
      DELETE t1
      FROM library_book_inventory t1
      INNER JOIN library_book_inventory t2
        ON t1.accession_number = t2.accession_number
        AND t1.inventory_id > t2.inventory_id
      WHERE t1.deleted_at IS NULL
        AND t2.deleted_at IS NULL
    `);

    // Add unique constraint
    await queryInterface.addConstraint('library_book_inventory', {
      fields: ['accession_number'],
      type: 'unique',
      name: 'unique_accession_number',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint(
      'library_book_inventory',
      'unique_accession_number'
    );
  },
};