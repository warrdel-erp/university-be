"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const [markingStatusColumns] = await queryInterface.sequelize.query(
        `SHOW COLUMNS FROM answer_sheet_qr LIKE 'marking_status'`,
        { transaction },
      );

      if (!markingStatusColumns?.length) {
        await queryInterface.addColumn(
          "answer_sheet_qr",
          "marking_status",
          {
            type: Sequelize.ENUM("pending", "submit"),
            allowNull: false,
            defaultValue: "pending",
          },
          { transaction },
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const [markingStatusColumns] = await queryInterface.sequelize.query(
        `SHOW COLUMNS FROM answer_sheet_qr LIKE 'marking_status'`,
        { transaction },
      );

      if (markingStatusColumns?.length) {
        await queryInterface.removeColumn("answer_sheet_qr", "marking_status", {
          transaction,
        });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
