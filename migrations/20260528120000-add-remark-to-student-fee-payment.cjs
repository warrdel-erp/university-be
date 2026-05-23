'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('student_fee_payment', 'remark', {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: null,
      after: 'received_by',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('student_fee_payment', 'remark');
  },
};
