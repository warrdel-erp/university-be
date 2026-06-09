'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [columns] = await queryInterface.sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'asset_inventory_item'
         AND COLUMN_NAME = 'status'`
    );
    if (columns.length) return;

    await queryInterface.addColumn('asset_inventory_item', 'status', {
      type: Sequelize.ENUM('NOT_ASSIGNED', 'ASSIGNED'),
      allowNull: false,
      defaultValue: 'NOT_ASSIGNED',
    });

    await queryInterface.sequelize.query(
      `UPDATE asset_inventory_item
       SET status = 'ASSIGNED'
       WHERE class_room_section_id IS NOT NULL`
    );
  },

  async down(queryInterface) {
    const [columns] = await queryInterface.sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'asset_inventory_item'
         AND COLUMN_NAME = 'status'`
    );
    if (!columns.length) return;

    await queryInterface.removeColumn('asset_inventory_item', 'status');
  },
};
