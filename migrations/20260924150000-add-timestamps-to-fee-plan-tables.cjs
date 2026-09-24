'use strict';

/** Ensure created_at and updated_at columns exist on fee_plan_item and fee_plan_sub_items. */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Check & add columns to fee_plan_item
    const descItem = await queryInterface.describeTable('fee_plan_item');
    if (!descItem.created_at) {
      await queryInterface.addColumn('fee_plan_item', 'created_at', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      });
    }
    if (!descItem.updated_at) {
      await queryInterface.addColumn('fee_plan_item', 'updated_at', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      });
    }

    // 2. Check & add columns to fee_plan_sub_items
    const descSub = await queryInterface.describeTable('fee_plan_sub_items');
    if (!descSub.created_at) {
      await queryInterface.addColumn('fee_plan_sub_items', 'created_at', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      });
    }
    if (!descSub.updated_at) {
      await queryInterface.addColumn('fee_plan_sub_items', 'updated_at', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      });
    }
  },

  async down(queryInterface) {
    const descItem = await queryInterface.describeTable('fee_plan_item');
    if (descItem.created_at) {
      await queryInterface.removeColumn('fee_plan_item', 'created_at');
    }
    if (descItem.updated_at) {
      await queryInterface.removeColumn('fee_plan_item', 'updated_at');
    }

    const descSub = await queryInterface.describeTable('fee_plan_sub_items');
    if (descSub.created_at) {
      await queryInterface.removeColumn('fee_plan_sub_items', 'created_at');
    }
    if (descSub.updated_at) {
      await queryInterface.removeColumn('fee_plan_sub_items', 'updated_at');
    }
  },
};
