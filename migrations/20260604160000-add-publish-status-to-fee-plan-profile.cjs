"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("fee_plan_profile", "publish_status", {
      type: Sequelize.ENUM("draft", "published"),
      allowNull: false,
      defaultValue: "draft",
    });

    await queryInterface.sequelize.query(
      "UPDATE fee_plan_profile SET publish_status = 'published'"
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("fee_plan_profile", "publish_status");
  },
};
