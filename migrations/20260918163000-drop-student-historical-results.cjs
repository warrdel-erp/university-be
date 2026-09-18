'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Drop dependent child table first, then parent table
      const tables = await queryInterface.showAllTables({ transaction });
      const tableNames = Array.isArray(tables)
        ? tables.map((t) => (typeof t === 'string' ? t : t.tableName || Object.values(t)[0]))
        : [];

      if (tableNames.includes('student_historical_subject_mark')) {
        await queryInterface.dropTable('student_historical_subject_mark', { transaction });
      }
      if (tableNames.includes('student_historical_result')) {
        await queryInterface.dropTable('student_historical_result', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // No-op or recreate if needed
  },
};
