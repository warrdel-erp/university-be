"use strict";

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  await queryInterface.changeColumn("notice", "message_to", {
    type: Sequelize.JSON,
    allowNull: true,
  });

  await queryInterface.changeColumn("notice", "role", {
    type: Sequelize.STRING,
    allowNull: true,
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.changeColumn("notice", "message_to", {
    type: Sequelize.JSON,
    allowNull: false,
  });

  await queryInterface.changeColumn("notice", "role", {
    type: Sequelize.STRING,
    allowNull: false,
  });
}
