'use strict';

/**
 * Fee v2 payments. payment_status lives on student_fee_invoice (see 20260518100006).
 * addColumn below is only for DBs that ran an older 100006 without payment_status.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('student_fee_payment', {      student_fee_payment_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      student_fee_invoice_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'student_fee_invoice', key: 'student_fee_invoice_id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      institute_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'institute', key: 'institute_id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      paid_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      payment_date: { type: Sequelize.DATEONLY, allowNull: false },
      payment_method: { type: Sequelize.STRING(100), allowNull: false },
      reference_number: { type: Sequelize.STRING(150), allowNull: true },
      notes: { type: Sequelize.STRING(500), allowNull: true },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'user_id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('student_fee_payment', ['student_fee_invoice_id'], {
      name: 'idx_student_fee_payment_invoice',
    });

    const invoiceTable = await queryInterface.describeTable('student_fee_invoice');
    if (!invoiceTable.payment_status) {
      await queryInterface.addColumn('student_fee_invoice', 'payment_status', {
        type: Sequelize.ENUM('unpaid', 'partial', 'paid'),
        allowNull: false,
        defaultValue: 'unpaid',
      });
    }
  },

  async down(queryInterface) {
    const invoiceTable = await queryInterface.describeTable('student_fee_invoice');
    if (invoiceTable.payment_status) {
      await queryInterface.removeColumn('student_fee_invoice', 'payment_status');
    }
    await queryInterface.dropTable('student_fee_payment');
  },
};
