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

  async down(queryInterface, Sequelize) {
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
};