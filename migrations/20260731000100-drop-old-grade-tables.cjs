'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const rawTables = await queryInterface.showAllTables();
    const existingTables = rawTables.map((t) => (typeof t === 'string' ? t : t.tableName || t.name || String(t)));

    const oldTables = ['grade_pass_fail', 'grade_course', 'grade_scale', 'grade'];

    for (const table of oldTables) {
      if (existingTables.includes(table)) {
        await queryInterface.dropTable(table);
        console.log(`Dropped old table: ${table}`);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // Migration is non-reversible as old grade flow has been decommissioned.
  },
};
