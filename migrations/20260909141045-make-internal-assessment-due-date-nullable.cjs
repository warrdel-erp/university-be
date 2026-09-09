"use strict";

/**
 * Production: internal_assessment.due_date is NOT NULL without default.
 * Subject-mapping auto-create omitted due_date →
 * "Field 'due_date' doesn't have a default value".
 * Align column with model (nullable placeholders until teacher sets dates).
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

      if (description.due_date && description.due_date.allowNull === false) {
        await queryInterface.changeColumn(
          "internal_assessment",
          "due_date",
          {
            type: Sequelize.DATE,
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

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.sequelize.query(
        `
        UPDATE \`internal_assessment\`
        SET \`due_date\` = CURRENT_TIMESTAMP
        WHERE \`due_date\` IS NULL
        `,
        { transaction },
      );

      await queryInterface.changeColumn(
        "internal_assessment",
        "due_date",
        {
          type: Sequelize.DATE,
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
