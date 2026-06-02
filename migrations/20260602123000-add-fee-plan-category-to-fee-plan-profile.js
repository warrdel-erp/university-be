"use strict";

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn("fee_plan_profile", "category", {
    type: Sequelize.STRING,
    allowNull: false,
    defaultValue: "non-scholarship",
    after: "plan_type",
  });
}

export async function down(queryInterface) {
  await queryInterface.removeColumn("fee_plan_profile", "category");
}
