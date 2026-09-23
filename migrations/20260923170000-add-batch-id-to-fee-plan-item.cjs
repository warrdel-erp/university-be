'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('fee_plan_item');

    if (!desc.batch_id) {
      await queryInterface.addColumn('fee_plan_item', 'batch_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'batch',
          key: 'batch_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }

    if (desc.fee_plan_profile_id && desc.fee_plan_profile_id.allowNull === false) {
      await queryInterface.changeColumn('fee_plan_item', 'fee_plan_profile_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'fee_plan_profile',
          key: 'fee_plan_profile_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }
  },

  async down(queryInterface) {
    const desc = await queryInterface.describeTable('fee_plan_item');
    if (desc.batch_id) {
      await queryInterface.removeColumn('fee_plan_item', 'batch_id');
    }
  },
};
