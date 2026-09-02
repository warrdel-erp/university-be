'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [deadlineDateColumns] = await queryInterface.sequelize.query(`
      SHOW COLUMNS FROM answer_sheet_qr LIKE 'deadline_date'
    `);

    if (!deadlineDateColumns?.length) {
      await queryInterface.addColumn('answer_sheet_qr', 'deadline_date', {
        type: Sequelize.DATEONLY,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const [deadlineDateColumns] = await queryInterface.sequelize.query(`
      SHOW COLUMNS FROM answer_sheet_qr LIKE 'deadline_date'
    `);

    if (deadlineDateColumns?.length) {
      await queryInterface.removeColumn('answer_sheet_qr', 'deadline_date');
    }
  },
};
