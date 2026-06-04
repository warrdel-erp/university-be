'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [tables] = await queryInterface.sequelize.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asset_issue_inventory_item'`
    );
    if (tables.length) return;

    await queryInterface.createTable(
      'asset_issue_inventory_item',
      {
        asset_issue_inventory_item_id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        asset_issue_transaction_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'asset_issue_transaction', key: 'asset_issue_transaction_id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        asset_inventory_item_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'asset_inventory_item', key: 'asset_inventory_item_id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        asset_return_transaction_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'asset_return_transaction', key: 'asset_return_transaction_id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
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
      },
      { charset: 'latin1', collate: 'latin1_swedish_ci' }
    );

    await queryInterface.addIndex('asset_issue_inventory_item', ['asset_issue_transaction_id'], {
      name: 'idx_asset_issue_inventory_item_transaction',
    });
    await queryInterface.addIndex('asset_issue_inventory_item', ['asset_inventory_item_id'], {
      name: 'idx_asset_issue_inventory_item_inventory',
    });
  },

  async down(queryInterface) {
    const [tables] = await queryInterface.sequelize.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asset_issue_inventory_item'`
    );
    if (!tables.length) return;

    await queryInterface.dropTable('asset_issue_inventory_item');
  },
};
