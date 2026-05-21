'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDefinition = await queryInterface.describeTable('answer_sheet_qr');

    if (!tableDefinition.is_uploaded) {
      await queryInterface.addColumn('answer_sheet_qr', 'is_uploaded', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }
  },

  async down(queryInterface) {
    const tableDefinition = await queryInterface.describeTable('answer_sheet_qr');

    if (tableDefinition.is_uploaded) {
      await queryInterface.removeColumn('answer_sheet_qr', 'is_uploaded');
    }
  },
};
