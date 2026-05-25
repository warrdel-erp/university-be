'use strict';

/**
 * payment_item: reference_id (polymorphic), reference_type incl. OTHER, no invoice FK.
 * Replaces separate rename + add-OTHER migrations for this table.
 */

async function tableColumns(queryInterface, tableName) {
  const table = await queryInterface.describeTable(tableName);
  return Object.keys(table);
}

async function dropForeignKeysOnColumn(queryInterface, columnName) {
  const [rows] = await queryInterface.sequelize.query(
    `
    SELECT CONSTRAINT_NAME
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'payment_item'
      AND COLUMN_NAME = :columnName
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `,
    { replacements: { columnName } }
  );

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

    if (columns.includes('student_fee_invoice_id')) {
      await dropForeignKeysOnColumn(queryInterface, 'student_fee_invoice_id');
    }

    if (columns.includes('student_fee_invoice_id') && !columns.includes('reference_id')) {
      await queryInterface.renameColumn(
        'payment_item',
        'student_fee_invoice_id',
        'reference_id'
      );
    }

    const columnsAfterRename = await tableColumns(queryInterface, 'payment_item');

    if (columnsAfterRename.includes('reference_id')) {
      await dropForeignKeysOnColumn(queryInterface, 'reference_id');

      await queryInterface.changeColumn('payment_item', 'reference_id', {
        type: Sequelize.INTEGER,
        allowNull: false,
      });
    }

    if (columnsAfterRename.includes('reference_type')) {
      await queryInterface.changeColumn('payment_item', 'reference_type', {
        type: Sequelize.ENUM('STUDENT_FEE_INVOICE', 'STUDENT_LIBRARY_INVOICE', 'OTHER'),
        allowNull: false,
      });
    }

    await queryInterface.addIndex('payment_item', ['reference_type', 'reference_id'], {
      name: 'idx_payment_item_reference',
    });
  },

  async down(queryInterface, Sequelize) {
    const columns = await tableColumns(queryInterface, 'payment_item');

    const indexes = await queryInterface.showIndex('payment_item');
    const indexNames = indexes.map((idx) => idx.name);

    if (indexNames.includes('idx_payment_item_reference')) {
      await queryInterface.removeIndex('payment_item', 'idx_payment_item_reference');
    }

    if (columns.includes('reference_type')) {
      await queryInterface.changeColumn('payment_item', 'reference_type', {
        type: Sequelize.ENUM('STUDENT_FEE_INVOICE', 'STUDENT_LIBRARY_INVOICE'),
        allowNull: false,
      });
    }

    if (columns.includes('reference_id') && !columns.includes('student_fee_invoice_id')) {
      await dropForeignKeysOnColumn(queryInterface, 'reference_id');

      await queryInterface.renameColumn('payment_item', 'reference_id', 'student_fee_invoice_id');
    }

    const columnsAfterRename = await tableColumns(queryInterface, 'payment_item');
    if (columnsAfterRename.includes('student_fee_invoice_id')) {
      await dropForeignKeysOnColumn(queryInterface, 'student_fee_invoice_id');

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
};
