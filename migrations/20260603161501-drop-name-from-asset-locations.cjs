'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const [columns] = await queryInterface.sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'asset_locations'
         AND COLUMN_NAME = 'name'`
    );
    if (!columns.length) return;

    await queryInterface.removeColumn('asset_locations', 'name');
  },

  async down(queryInterface, Sequelize) {
    const [tables] = await queryInterface.sequelize.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asset_locations'`
    );
    if (!tables.length) return;

    const [columns] = await queryInterface.sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'asset_locations'
         AND COLUMN_NAME = 'name'`
    );
    if (columns.length) return;

    await queryInterface.addColumn('asset_locations', 'name', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: '',
    });
  },
};
