'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('answer_sheet_qr', 'file_upload_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 's3_files',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('answer_sheet_qr', 'file_upload_id');
  }
};
