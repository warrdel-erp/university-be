'use strict';

/** Fee v2 payment ledger (line allocation in payment_item). */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('student_fee_payment', {
      student_fee_payment_id: {
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
      payment_type: {
        type: Sequelize.ENUM('INCOMING', 'OUTGOING'),
        allowNull: false,
        defaultValue: 'INCOMING',
      },
      payee_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      payee_type: {
        type: Sequelize.ENUM('STUDENT', 'VENDOR'),
        allowNull: false,
        defaultValue: 'STUDENT',
      },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      payment_method: {
        type: Sequelize.ENUM('credit_card', 'bank_transfer', 'cash', 'cheque'),
        allowNull: false,
      },
      reference_number: { type: Sequelize.STRING(150), allowNull: true },
      transaction_id: { type: Sequelize.STRING(150), allowNull: true },
      institute_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'institute', key: 'institute_id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
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
    }, { charset: 'latin1', collate: 'latin1_swedish_ci' });

    await queryInterface.addIndex('student_fee_payment', ['student_fee_invoice_id'], {
      name: 'idx_student_fee_payment_invoice',
    });
    await queryInterface.addIndex('student_fee_payment', ['institute_id', 'payee_id', 'payee_type'], {
      name: 'idx_student_fee_payment_payee',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('student_fee_payment', 'idx_student_fee_payment_payee');
    await queryInterface.removeIndex('student_fee_payment', 'idx_student_fee_payment_invoice');
    await queryInterface.dropTable('student_fee_payment');
  },
};
