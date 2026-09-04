'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [markingStatusColumns] = await queryInterface.sequelize.query(`
      SHOW COLUMNS FROM answer_sheet_qr LIKE 'marking_status'
    `);

    if (!markingStatusColumns?.length) {
      await queryInterface.addColumn('answer_sheet_qr', 'marking_status', {
        type: Sequelize.ENUM('pending', 'submit'),
        allowNull: false,
        defaultValue: 'pending',
      });
    }
  },

  async down(queryInterface) {
    const [markingStatusColumns] = await queryInterface.sequelize.query(`
      SHOW COLUMNS FROM answer_sheet_qr LIKE 'marking_status'
    `);

    if (markingStatusColumns?.length) {
      await queryInterface.removeColumn('answer_sheet_qr', 'marking_status');
    }
  },
};
