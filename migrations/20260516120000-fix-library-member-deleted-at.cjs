"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = "library_member";

    // Remove only soft-deleted records
    await queryInterface.bulkDelete(tableName, {
      deleted_at: {
        [Sequelize.Op.ne]: null,
      },
    });

    // Remove deleted_at column
    await queryInterface.removeColumn(tableName, "deleted_at");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn("library_member", "deleted_at", {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
    });
  },
};