'use strict';

/** Allocates a payment amount to a fee or library invoice. */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('payment_item', {
      payment_item_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      payment_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'student_fee_payment', key: 'student_fee_payment_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      reference_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      reference_type: {
        type: Sequelize.ENUM('STUDENT_FEE_INVOICE', 'STUDENT_LIBRARY_INVOICE'),
        allowNull: false,
      },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
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

    await queryInterface.addIndex('payment_item', ['payment_id'], {
      name: 'idx_payment_item_payment',
    });
    await queryInterface.addIndex('payment_item', ['reference_type', 'reference_id'], {
      name: 'idx_payment_item_reference',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('payment_item', 'idx_payment_item_reference');
    await queryInterface.removeIndex('payment_item', 'idx_payment_item_payment');
    await queryInterface.dropTable('payment_item');
  },
};
