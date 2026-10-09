'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // Drop foreign keys referencing these tables if any, then drop tables
      const tablesToDrop = [
        'exam_setup_depricated',
        'exam_setup',
        'exam_setup_type_term_depricated',
        'exam_setup_type_term',
        'exam_structure_schedule_mapper_depricated',
        'exam_structure_schedule_mapper',
      ];

      for (const table of tablesToDrop) {
        try {
          await queryInterface.dropTable(table, { transaction });
        } catch (error) {
          // Table or foreign key might not exist; safe to continue
        }
      }
    });
  },

  async down(queryInterface, Sequelize) {
    // Deprecated tables intentionally not restored
  }
};
