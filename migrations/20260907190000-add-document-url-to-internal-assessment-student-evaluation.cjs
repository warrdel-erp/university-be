"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const description = await queryInterface.describeTable(
        "internal_assessment_student_evaluation",
        { transaction },
      );

      if (!description.document_url) {
        await queryInterface.addColumn(
          "internal_assessment_student_evaluation",
          "document_url",
          {
            type: Sequelize.STRING,
            allowNull: true,
            comment: "Student submission document URL",
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
        "internal_assessment_student_evaluation",
        { transaction },
      );

      if (description.document_url) {
        await queryInterface.removeColumn(
          "internal_assessment_student_evaluation",
          "document_url",
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
