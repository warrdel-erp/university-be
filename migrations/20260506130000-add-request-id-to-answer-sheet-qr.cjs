'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('answer_sheet_qr', 'request_id', {
      type: Sequelize.UUID,
      allowNull: true,
      after: 'qr',
    });

    // Backfill existing rows so list APIs can return request ids consistently.
    await queryInterface.sequelize.query(`
      UPDATE answer_sheet_qr
      SET request_id = UUID()
      WHERE request_id IS NULL
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('answer_sheet_qr', 'request_id');
  },
};
