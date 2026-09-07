"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const description = await queryInterface.describeTable(
        "internal_assessment",
        { transaction },
      );

      if (!description.title) {
        await queryInterface.addColumn(
          "internal_assessment",
          "title",
          {
            type: Sequelize.STRING,
            allowNull: true,
            comment: "Assessment title / name",
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
      const description = await queryInterface.describeTable(
        "internal_assessment",
        { transaction },
      );

      if (description.title) {
        await queryInterface.removeColumn("internal_assessment", "title", {
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
