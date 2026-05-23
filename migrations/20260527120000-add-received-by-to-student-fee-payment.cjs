'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('student_fee_payment', 'received_by', {
      type: Sequelize.STRING(150),
      allowNull: true,
      defaultValue: null,
      after: 'transaction_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('student_fee_payment', 'received_by');
  },
};
