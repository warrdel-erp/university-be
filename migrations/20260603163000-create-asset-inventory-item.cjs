'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [tables] = await queryInterface.sequelize.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asset_inventory_item'`
    );
    if (tables.length) return;

    await queryInterface.createTable(
      'asset_inventory_item',
      {
        asset_inventory_item_id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        code: { type: Sequelize.STRING, allowNull: false },
        barcode: { type: Sequelize.STRING, allowNull: true },
        asset_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'asset', key: 'asset_id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        institute_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'institute', key: 'institute_id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        location_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'asset_locations', key: 'asset_location_id' },
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
  },

  async down(queryInterface) {
    await queryInterface.dropTable('asset_inventory_item');
  },
};
