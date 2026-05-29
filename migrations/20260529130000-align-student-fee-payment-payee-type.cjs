'use strict';

/**
 * student_fee_payment.payee_type: STUDENT | VENDOR | OTHER (no DB default).
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('student_fee_payment', 'payee_type', {
      type: Sequelize.ENUM('STUDENT', 'VENDOR', 'OTHER'),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('student_fee_payment', 'payee_type', {
      type: Sequelize.ENUM('STUDENT', 'VENDOR'),
      allowNull: false,
      defaultValue: 'STUDENT',
    });
  },
};
