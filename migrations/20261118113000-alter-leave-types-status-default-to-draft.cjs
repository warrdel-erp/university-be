'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      const rawTables = await queryInterface.showAllTables({ transaction: t });
      const tableNames = rawTables.map((tbl) =>
        typeof tbl === 'string' ? tbl : tbl.tableName || tbl.name || String(tbl)
      );

      if (!tableNames.includes('leave_types')) {
        return;
      }

      await queryInterface.sequelize.query(
        "ALTER TABLE `leave_types` MODIFY COLUMN `status` ENUM('Active', 'Inactive', 'Draft', 'Published') NOT NULL DEFAULT 'Draft'",
        { transaction: t }
      );
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      const rawTables = await queryInterface.showAllTables({ transaction: t });
      const tableNames = rawTables.map((tbl) =>
        typeof tbl === 'string' ? tbl : tbl.tableName || tbl.name || String(tbl)
      );

      if (!tableNames.includes('leave_types')) {
        return;
      }

      await queryInterface.sequelize.query(
        "ALTER TABLE `leave_types` MODIFY COLUMN `status` ENUM('Active', 'Inactive', 'Draft', 'Published') NOT NULL DEFAULT 'Active'",
        { transaction: t }
      );
    });
  },
};
