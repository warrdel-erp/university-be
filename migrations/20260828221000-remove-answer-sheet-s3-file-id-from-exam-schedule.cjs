'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.removeColumn('exam_schedule', 'answer_sheet_s3_file_id');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('exam_schedule', 'answer_sheet_s3_file_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 's3_files', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },
};
