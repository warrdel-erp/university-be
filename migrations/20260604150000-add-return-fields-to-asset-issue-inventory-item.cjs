'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = 'asset_issue_inventory_item';

    const [damageCol] = await queryInterface.sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND COLUMN_NAME = 'damage_notes'`,
      { replacements: [table] }
    );
    if (!damageCol.length) {
      await queryInterface.addColumn(table, 'damage_notes', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    const [conditionCol] = await queryInterface.sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND COLUMN_NAME = 'return_condition'`,
      { replacements: [table] }
    );
    if (!conditionCol.length) {
      await queryInterface.addColumn(table, 'return_condition', {
        type: Sequelize.ENUM('GOOD', 'FAIR', 'EXCELLENT', 'BAD'),
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const table = 'asset_issue_inventory_item';

    const [conditionCol] = await queryInterface.sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND COLUMN_NAME = 'return_condition'`,
      { replacements: [table] }
    );
    if (conditionCol.length) {
      await queryInterface.removeColumn(table, 'return_condition');
    }

    const [damageCol] = await queryInterface.sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND COLUMN_NAME = 'damage_notes'`,
      { replacements: [table] }
    );
    if (damageCol.length) {
      await queryInterface.removeColumn(table, 'damage_notes');
    }
  },
};
