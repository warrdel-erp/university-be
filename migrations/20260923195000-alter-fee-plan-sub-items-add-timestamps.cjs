'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('fee_plan_sub_items');
    if (!desc.created_at) {
      await queryInterface.addColumn('fee_plan_sub_items', 'created_at', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      });
    }
    if (!desc.updated_at) {
      await queryInterface.addColumn('fee_plan_sub_items', 'updated_at', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      });
    }
  },

  async down(queryInterface) {
    const desc = await queryInterface.describeTable('fee_plan_sub_items');
    if (desc.created_at) {
      await queryInterface.removeColumn('fee_plan_sub_items', 'created_at');
    }
    if (desc.updated_at) {
      await queryInterface.removeColumn('fee_plan_sub_items', 'updated_at');
    }
  },
};
