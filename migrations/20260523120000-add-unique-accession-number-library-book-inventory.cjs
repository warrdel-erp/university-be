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

    // Add a partial unique index so only non-deleted rows are constrained.
    // A plain UNIQUE constraint would incorrectly block soft-deleted duplicates.
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX unique_accession_number
      ON library_book_inventory (accession_number)
      WHERE deleted_at IS NULL
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS unique_accession_number ON library_book_inventory
    `);
  },
};