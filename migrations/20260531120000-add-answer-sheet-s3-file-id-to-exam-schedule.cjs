'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDefinition = await queryInterface.describeTable('exam_schedule');

    if (!tableDefinition.answer_sheet_s3_file_id) {
      await queryInterface.addColumn('exam_schedule', 'answer_sheet_s3_file_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 's3_files',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }
  },

  async down(queryInterface) {
    const tableDefinition = await queryInterface.describeTable('exam_schedule');

    if (tableDefinition.answer_sheet_s3_file_id) {
      await queryInterface.removeColumn('exam_schedule', 'answer_sheet_s3_file_id');
    }
  },
};
