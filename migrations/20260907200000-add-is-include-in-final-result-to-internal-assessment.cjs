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

      if (!description.is_include_in_final_result) {
        await queryInterface.addColumn(
          "internal_assessment",
          "is_include_in_final_result",
          {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: "Whether this assessment is included in final IA result",
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

      if (description.is_include_in_final_result) {
        await queryInterface.removeColumn(
          "internal_assessment",
          "is_include_in_final_result",
          { transaction },
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
