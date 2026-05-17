'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('fee_plan_item', {
      fee_plan_item_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      create_date: { type: Sequelize.DATEONLY, allowNull: false },
      due_date: { type: Sequelize.DATEONLY, allowNull: true },
      term_name: { type: Sequelize.STRING, allowNull: true },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      fee_plan_profile_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'fee_plan_profile', key: 'fee_plan_profile_id' },
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
    await queryInterface.dropTable('fee_plan_item');
  },
};
