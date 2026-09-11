"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const description = await queryInterface.describeTable("exam_setup_type", {
        transaction,
      });

      if (!description.managed_by) {
        await queryInterface.addColumn(
          "exam_setup_type",
          "managed_by",
          {
            type: Sequelize.ENUM("FACULTY", "COE"),
            allowNull: false,
            defaultValue: "COE",
          },
          { transaction },
        );

        // Continuous Assessment is faculty-managed
        await queryInterface.sequelize.query(
          `
          UPDATE exam_setup_type
          SET managed_by = 'FACULTY'
          WHERE exam_category = 'CONTINUOUS_ASSESSMENT'
          `,
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
      const description = await queryInterface.describeTable("exam_setup_type", {
        transaction,
      });

      if (description.managed_by) {
        await queryInterface.removeColumn("exam_setup_type", "managed_by", {
          transaction,
        });
      }

      // Drop leftover ENUM type if MySQL left it (no-op on MySQL for ENUM-in-column)
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
