'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`SET SESSION sql_mode = ''`);
    
    const addColumnIfNotExists = async (table, column, referenceModel, referenceKey) => {
      const desc = await queryInterface.describeTable(table);
      if (!desc[column]) {
        await queryInterface.addColumn(table, column, {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: referenceModel,
            key: referenceKey
          }
        });
      }
    };

    // Add missing columns
    await addColumnIfNotExists('library_book_category_mappings', 'acedmic_year_id', 'acedmic_year', 'acedmic_year_id');
    await addColumnIfNotExists('library_book_subject_mappings', 'acedmic_year_id', 'acedmic_year', 'acedmic_year_id');
    await addColumnIfNotExists('library_category', 'acedmic_year_id', 'acedmic_year', 'acedmic_year_id');
    await addColumnIfNotExists('library_creation', 'acedmic_year_id', 'acedmic_year', 'acedmic_year_id');

    // BACKFILL QUERIES

    await queryInterface.sequelize.query(`
      UPDATE library_book_subject_mappings m
      JOIN subject s ON m.library_subject_id = s.subject_id
      SET m.acedmic_year_id = s.acedmic_year_id
    `);

    // Note: library_book_category_mappings, library_category, and library_creation
    // do not have a reliable relationship to an academic year, so they are left as NULL.
  },

  async down(queryInterface, Sequelize) {
    const removeColumnIfExists = async (table, column) => {
      const desc = await queryInterface.describeTable(table);
      if (desc[column]) {
        await queryInterface.removeColumn(table, column);
      }
    };

    await removeColumnIfExists('library_book_category_mappings', 'acedmic_year_id');
    await removeColumnIfExists('library_book_subject_mappings', 'acedmic_year_id');
    await removeColumnIfExists('library_category', 'acedmic_year_id');
    await removeColumnIfExists('library_creation', 'acedmic_year_id');
  }
};
