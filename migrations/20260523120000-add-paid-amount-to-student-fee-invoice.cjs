'use strict';

/** Denormalized sum of payment_item amounts for STUDENT_FEE_INVOICE (INCOMING payments). */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('student_fee_invoice', 'paid_amount', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      after: 'payment_status',
    });

    await queryInterface.sequelize.query(`
      UPDATE student_fee_invoice sfi
      SET paid_amount = COALESCE((
        SELECT SUM(pi.amount)
        FROM payment_item pi
        INNER JOIN student_fee_payment sfp
          ON sfp.student_fee_payment_id = pi.payment_id
        WHERE pi.reference_id = sfi.student_fee_invoice_id
          AND pi.reference_type = 'STUDENT_FEE_INVOICE'
          AND sfp.payment_type = 'INCOMING'
      ), 0)
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('student_fee_invoice', 'paid_amount');
  },
};
