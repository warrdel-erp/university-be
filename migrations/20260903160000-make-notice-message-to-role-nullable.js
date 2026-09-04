"use strict";

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  const transaction = await queryInterface.sequelize.transaction();
  try {
    await queryInterface.changeColumn(
      "notice",
      "message_to",
      {
        type: Sequelize.JSON,
        allowNull: true,
      },
      { transaction },
    );

    await queryInterface.changeColumn(
      "notice",
      "role",
      {
        type: Sequelize.STRING,
        allowNull: true,
      },
      { transaction },
    );

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function down(queryInterface, Sequelize) {
  const transaction = await queryInterface.sequelize.transaction();
  try {
    await queryInterface.changeColumn(
      "notice",
      "message_to",
      {
        type: Sequelize.JSON,
        allowNull: false,
      },
      { transaction },
    );

    await queryInterface.changeColumn(
      "notice",
      "role",
      {
        type: Sequelize.STRING,
        allowNull: false,
      },
      { transaction },
    );

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
