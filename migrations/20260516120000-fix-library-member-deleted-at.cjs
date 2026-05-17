"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = "library_member";

    await queryInterface.changeColumn(tableName, "deleted_at", {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
    });

    // Keep active rows: clear invalid / zero-date markers (treated as not deleted)
    await queryInterface.sequelize.query(`
      UPDATE ${tableName}
      SET deleted_at = NULL
      WHERE deleted_at < '1971-01-01'
    `);

    // Permanently remove rows that were intentionally soft-deleted
    await queryInterface.bulkDelete(tableName, {
      deleted_at: {
        [Sequelize.Op.ne]: null,
      },
    });

    await queryInterface.removeColumn(tableName, "deleted_at");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn("library_member", "deleted_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },
};
