'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE library_book_inventory
        DROP INDEX unique_active_accession_number
      `);
    } catch (e) {
      // Ignore if index doesn't exist
    }

    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE library_book_inventory
        DROP COLUMN active_accession_number
      `);
    } catch (e) {
      // Ignore if column doesn't exist
    }
  },

  async down(queryInterface, Sequelize) {
    // Add a virtual column that contains accession_number when active, NULL when deleted.
    // Indexing this virtual column enforces uniqueness only for active records in MariaDB/MySQL.
    await queryInterface.sequelize.query(`
      ALTER TABLE library_book_inventory
      ADD COLUMN active_accession_number VARCHAR(255) GENERATED ALWAYS AS (IF(deleted_at IS NULL, accession_number, NULL)) VIRTUAL
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX unique_active_accession_number
      ON library_book_inventory (active_accession_number)
    `);
  },
};
