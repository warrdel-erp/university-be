'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('student_fee_invoice_items', {
      student_fee_invoice_items_id: {
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
        onDelete: 'CASCADE',
      },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      is_main_item: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      waiver: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      fee_type_catalog_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'fee_type_catalog', key: 'fee_type_catalog_id' },
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
  },

  async down(queryInterface) {
    await queryInterface.dropTable('student_fee_invoice_items');
  },
};
