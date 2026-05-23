'use strict';

/** Invoice linkage lives on payment_item (reference_id + reference_type). */

async function dropInvoiceForeignKey(queryInterface) {
  const [rows] = await queryInterface.sequelize.query(`
    SELECT CONSTRAINT_NAME
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'student_fee_payment'
      AND COLUMN_NAME = 'student_fee_invoice_id'
      AND REFERENCED_TABLE_NAME IS NOT NULL
  `);

  for (const row of rows) {
    await queryInterface.sequelize.query(
      `ALTER TABLE student_fee_payment DROP FOREIGN KEY \`${row.CONSTRAINT_NAME}\``
    );
  }
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await dropInvoiceForeignKey(queryInterface);

    const indexes = await queryInterface.showIndex('student_fee_payment');
    if (indexes.some((idx) => idx.name === 'idx_student_fee_payment_invoice')) {
      await queryInterface.removeIndex('student_fee_payment', 'idx_student_fee_payment_invoice');
    }

    const table = await queryInterface.describeTable('student_fee_payment');
    if (table.student_fee_invoice_id) {
      await queryInterface.removeColumn('student_fee_payment', 'student_fee_invoice_id');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('student_fee_payment', 'student_fee_invoice_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'student_fee_invoice', key: 'student_fee_invoice_id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
      after: 'student_fee_payment_id',
    });

    await queryInterface.sequelize.query(`
      UPDATE student_fee_payment sfp
      INNER JOIN payment_item pi ON pi.payment_id = sfp.student_fee_payment_id
      SET sfp.student_fee_invoice_id = pi.reference_id
      WHERE pi.reference_type = 'STUDENT_FEE_INVOICE'
    `);

    await queryInterface.changeColumn('student_fee_payment', 'student_fee_invoice_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'student_fee_invoice', key: 'student_fee_invoice_id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });

    await queryInterface.addIndex('student_fee_payment', ['student_fee_invoice_id'], {
      name: 'idx_student_fee_payment_invoice',
    });
  },
};
