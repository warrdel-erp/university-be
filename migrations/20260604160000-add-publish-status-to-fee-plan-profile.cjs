"use strict";

const TABLE = "fee_plan_profile";
const COLUMN = "publish_status";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(TABLE, COLUMN, {
      type: Sequelize.ENUM("draft", "published"),
      allowNull: false,
      defaultValue: "draft",
      charset: "latin1",
      collate: "latin1_swedish_ci",
    });

    await queryInterface.bulkUpdate(TABLE, { [COLUMN]: "published" }, {});
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(TABLE, COLUMN);
  },
};
