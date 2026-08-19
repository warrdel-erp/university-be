'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const addColumnIfNotExists = async (table, column, referenceModel, referenceKey) => {
      const desc = await queryInterface.describeTable(table);
      if (!desc[column]) {
        await queryInterface.addColumn(table, column, {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: referenceModel ? {
            model: referenceModel,
            key: referenceKey
          } : undefined
        });
      }
    };

    // Add missing campus_id columns to library tables
    await addColumnIfNotExists('library_creation', 'campus_id', 'campus', 'campus_id');
    await addColumnIfNotExists('library_book', 'campus_id', 'campus', 'campus_id');
    await addColumnIfNotExists('library_issue_book_transaction', 'campus_id', 'campus', 'campus_id');
    await addColumnIfNotExists('library_return_book_transaction', 'campus_id', 'campus', 'campus_id');

    // BACKFILL QUERIES FROM INSTITUTE

    await queryInterface.sequelize.query(`
      UPDATE library_creation lc
      JOIN institute i ON lc.institute_id = i.institute_id
      SET lc.campus_id = i.campus_id
      WHERE lc.campus_id IS NULL AND i.campus_id IS NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      UPDATE library_book lb
      JOIN institute i ON lb.institute_id = i.institute_id
      SET lb.campus_id = i.campus_id
      WHERE lb.campus_id IS NULL AND i.campus_id IS NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      UPDATE library_issue_book_transaction lbt
      JOIN institute i ON lbt.institute_id = i.institute_id
      SET lbt.campus_id = i.campus_id
      WHERE lbt.campus_id IS NULL AND i.campus_id IS NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      UPDATE library_return_book_transaction lrbt
      JOIN institute i ON lrbt.institute_id = i.institute_id
      SET lrbt.campus_id = i.campus_id
      WHERE lrbt.campus_id IS NULL AND i.campus_id IS NOT NULL;
    `);
  },

  async down(queryInterface, Sequelize) {
    const removeColumnIfExists = async (table, column) => {
      const desc = await queryInterface.describeTable(table);
      if (desc[column]) {
        await queryInterface.removeColumn(table, column);
      }
    };

    await removeColumnIfExists('library_creation', 'campus_id');
    await removeColumnIfExists('library_book', 'campus_id');
    await removeColumnIfExists('library_issue_book_transaction', 'campus_id');
    await removeColumnIfExists('library_return_book_transaction', 'campus_id');
  }
};
