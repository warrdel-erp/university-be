'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.renameTable('exam_setup', 'exam_setup_depricated', { transaction });
      await queryInterface.renameTable('exam_setup_type_term', 'exam_setup_type_term_depricated', { transaction });
      await queryInterface.renameTable('exam_structure_schedule_mapper', 'exam_structure_schedule_mapper_depricated', { transaction });
    });
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.renameTable('exam_setup_depricated', 'exam_setup', { transaction });
      await queryInterface.renameTable('exam_setup_type_term_depricated', 'exam_setup_type_term', { transaction });
      await queryInterface.renameTable('exam_structure_schedule_mapper_depricated', 'exam_structure_schedule_mapper', { transaction });
    });
  }
};
