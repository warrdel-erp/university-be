'use strict';

/**
 * Fee v2 additional fee lines (production baseline).
 * fee_plan_item_id nullable — plan term fees or standalone catalog fees (e.g. misconduct).
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('additional_fee', {
      additional_fee_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      fee_type_catalog_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'fee_type_catalog', key: 'fee_type_catalog_id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      fee_plan_item_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'fee_plan_item', key: 'fee_plan_item_id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      institute_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'institute', key: 'institute_id' },
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
    await queryInterface.dropTable('additional_fee');
  },
};
