'use strict';

/**
 * Align existing payment_item tables with paymentItemModel.js.
 * Safe when table was created from an older 20260518100009 (reference_id column).
 * No-op when columns already match (student_fee_invoice_id + reference_type).
 */

async function tableColumns(queryInterface, tableName) {
  const table = await queryInterface.describeTable(tableName);
  return Object.keys(table);
}

async function dropInvoiceForeignKeyOnPaymentItem(queryInterface) {
  const [rows] = await queryInterface.sequelize.query(`
    SELECT CONSTRAINT_NAME
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'payment_item'
      AND COLUMN_NAME = 'student_fee_invoice_id'
      AND REFERENCED_TABLE_NAME IS NOT NULL
  `);

  for (const row of rows) {
    await queryInterface.sequelize.query(
      `ALTER TABLE payment_item DROP FOREIGN KEY \`${row.CONSTRAINT_NAME}\``
    );
  }
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await tableColumns(queryInterface, 'payment_item');

    const indexes = await queryInterface.showIndex('payment_item');
    const indexNames = indexes.map((idx) => idx.name);

    if (indexNames.includes('idx_payment_item_reference')) {
      await queryInterface.removeIndex('payment_item', 'idx_payment_item_reference');
    }
    if (indexNames.includes('idx_payment_item_reference_type_invoice')) {
      await queryInterface.removeIndex('payment_item', 'idx_payment_item_reference_type_invoice');
    }

    if (columns.includes('reference_id') && !columns.includes('student_fee_invoice_id')) {
      await queryInterface.renameColumn('payment_item', 'reference_id', 'student_fee_invoice_id');
    }

    const columnsAfterRename = await tableColumns(queryInterface, 'payment_item');

    if (!columnsAfterRename.includes('reference_type')) {
      await queryInterface.addColumn('payment_item', 'reference_type', {
        type: Sequelize.ENUM('STUDENT_FEE_INVOICE', 'STUDENT_LIBRARY_INVOICE'),
        allowNull: false,
        defaultValue: 'STUDENT_FEE_INVOICE',
        after: 'student_fee_invoice_id',
      });
    }

    await dropInvoiceForeignKeyOnPaymentItem(queryInterface);

    const finalColumns = await tableColumns(queryInterface, 'payment_item');
    if (finalColumns.includes('student_fee_invoice_id')) {
      await queryInterface.changeColumn('payment_item', 'student_fee_invoice_id', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'student_fee_invoice', key: 'student_fee_invoice_id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      });
    }

    await queryInterface.addIndex('payment_item', ['reference_type', 'student_fee_invoice_id'], {
      name: 'idx_payment_item_reference',
    });
  },

  async down(queryInterface, Sequelize) {
    const columns = await tableColumns(queryInterface, 'payment_item');

    await queryInterface.removeIndex('payment_item', 'idx_payment_item_reference');

    await dropInvoiceForeignKeyOnPaymentItem(queryInterface);

    if (columns.includes('reference_type')) {
      await queryInterface.removeColumn('payment_item', 'reference_type');
    }

    if (columns.includes('student_fee_invoice_id') && !columns.includes('reference_id')) {
      await queryInterface.renameColumn('payment_item', 'student_fee_invoice_id', 'reference_id');
    }

    await queryInterface.addIndex('payment_item', ['reference_type', 'reference_id'], {
      name: 'idx_payment_item_reference',
    });
  },
};
