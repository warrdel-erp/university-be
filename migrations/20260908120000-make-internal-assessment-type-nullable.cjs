"use strict";

/**
 * Production: internal_assessment.type is NOT NULL without default.
 * Subject-mapping auto-create omitted type → "Field 'type' doesn't have a default value".
 * Align column with model (nullable).
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const description = await queryInterface.describeTable(
        "internal_assessment",
        { transaction },
      );

      if (description.type && description.type.allowNull === false) {
        await queryInterface.changeColumn(
          "internal_assessment",
          "type",
          {
            type: Sequelize.STRING,
            allowNull: true,
            comment: "Subcategory like Assignment, Quiz",
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

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.sequelize.query(
        `
        UPDATE \`internal_assessment\`
        SET \`type\` = 'Continuous Assessment'
        WHERE \`type\` IS NULL
        `,
        { transaction },
      );

      await queryInterface.changeColumn(
        "internal_assessment",
        "type",
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
  },
};
