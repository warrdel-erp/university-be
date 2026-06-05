"use strict";

const TABLE = "fee_plan_profile";
const COLUMN = "publish_status";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn(TABLE, COLUMN, {
      type: Sequelize.ENUM("draft", "published"),
      allowNull: false,
      defaultValue: "draft",
      charset: "latin1",
      collate: "latin1_swedish_ci",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn(TABLE, COLUMN, {
      type: Sequelize.ENUM("draft", "published"),
      allowNull: false,
      defaultValue: "draft",
      charset: "utf8mb4",
      collate: "utf8mb4_unicode_ci",
    });
  },
};
