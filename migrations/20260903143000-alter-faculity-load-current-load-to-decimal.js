"use strict";

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  await queryInterface.changeColumn("faculity_load", "current_load", {
    type: Sequelize.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0,
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.changeColumn("faculity_load", "current_load", {
    type: Sequelize.INTEGER,
    allowNull: true,
    defaultValue: 0,
  });
}
