'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const [columns] = await queryInterface.sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'asset_inventory_item'
         AND COLUMN_NAME = 'location_id'`
    );
    if (!columns.length) return;

    const [fks] = await queryInterface.sequelize.query(
      `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'asset_inventory_item'
         AND COLUMN_NAME = 'location_id'
         AND REFERENCED_TABLE_NAME IS NOT NULL`
    );
    if (fks.length) return;

    await queryInterface.addConstraint('asset_inventory_item', {
      fields: ['location_id'],
      type: 'foreign key',
      name: 'asset_inventory_item_location_id_fkey',
      references: { table: 'asset_locations', field: 'asset_location_id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface) {
    try {
      await queryInterface.removeConstraint(
        'asset_inventory_item',
        'asset_inventory_item_location_id_fkey'
      );
    } catch {
      // constraint may not exist
    }
  },
};
