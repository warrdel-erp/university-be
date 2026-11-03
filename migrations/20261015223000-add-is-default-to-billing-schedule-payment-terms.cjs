"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      const [columns] = await queryInterface.sequelize.query(
        "SHOW COLUMNS FROM `billing_schedule_payment_terms`;",
        { transaction }
      );
      const columnNames = new Set(columns.map((c) => c.Field));

      if (!columnNames.has("is_default")) {
        await queryInterface.addColumn(
          "billing_schedule_payment_terms",
          "is_default",
          {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          { transaction }
        );
      }
    });
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      const [columns] = await queryInterface.sequelize.query(
        "SHOW COLUMNS FROM `billing_schedule_payment_terms`;",
        { transaction }
      );
      const columnNames = new Set(columns.map((c) => c.Field));

      if (columnNames.has("is_default")) {
        await queryInterface.removeColumn(
          "billing_schedule_payment_terms",
          "is_default",
          { transaction }
        );
      }
    });
  },
};
