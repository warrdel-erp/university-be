'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [columns] = await queryInterface.sequelize.query(
      `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'payment_item'
         AND COLUMN_NAME = 'reference_type'`
    );
    if (!columns.length) return;

    const columnType = columns[0].COLUMN_TYPE ?? '';
    if (columnType.includes('ASSET_SECURITY')) return;

    await queryInterface.changeColumn('payment_item', 'reference_type', {
      type: Sequelize.ENUM(
        'STUDENT_FEE_INVOICE',
        'STUDENT_LIBRARY_INVOICE',
        'OTHER',
        'ASSET_SECURITY'
      ),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    const [rows] = await queryInterface.sequelize.query(
      `SELECT COUNT(*) AS cnt FROM payment_item WHERE reference_type = 'ASSET_SECURITY'`
    );
    if (Number(rows[0]?.cnt) > 0) {
      throw new Error('Cannot revert: payment_item rows use ASSET_SECURITY');
    }

    await queryInterface.changeColumn('payment_item', 'reference_type', {
      type: Sequelize.ENUM('STUDENT_FEE_INVOICE', 'STUDENT_LIBRARY_INVOICE', 'OTHER'),
      allowNull: false,
    });
  },
};
