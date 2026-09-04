"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const [deadlineDateColumns] = await queryInterface.sequelize.query(
        `SHOW COLUMNS FROM answer_sheet_qr LIKE 'deadline_date'`,
        { transaction },
      );

      if (!deadlineDateColumns?.length) {
        await queryInterface.addColumn(
          "answer_sheet_qr",
          "deadline_date",
          {
            type: Sequelize.DATEONLY,
            allowNull: true,
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
      const [deadlineDateColumns] = await queryInterface.sequelize.query(
        `SHOW COLUMNS FROM answer_sheet_qr LIKE 'deadline_date'`,
        { transaction },
      );

      if (deadlineDateColumns?.length) {
        await queryInterface.removeColumn("answer_sheet_qr", "deadline_date", {
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
