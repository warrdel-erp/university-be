'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add column to students table (allowNull: true initially)
    await queryInterface.addColumn('students', 'batch_year', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    // 2. Backfill data based on classSectionTerm
    await queryInterface.sequelize.query(`
      UPDATE students s
      JOIN class_section_term cst ON s.class_section_term_id = cst.class_section_term_id
      JOIN class_sections cs ON cst.class_sections_id = cs.class_sections_id
      SET s.batch_year = 2026 - (COALESCE(cs.year, 1) - 1)
      WHERE s.class_section_term_id IS NOT NULL
    `);

    // 3. For any remaining students without classSectionTerm, set to default 2026
    await queryInterface.sequelize.query(`
      UPDATE students
      SET batch_year = 2026
      WHERE batch_year IS NULL
    `);

    // 4. Change column to allowNull: false
    await queryInterface.changeColumn('students', 'batch_year', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('students', 'batch_year');
  }
};
