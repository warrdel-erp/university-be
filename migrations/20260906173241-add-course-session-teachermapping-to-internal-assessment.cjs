"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn(
        "internal_assessment",
        "session_id",
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: "session",
            key: "session_id",
          },
        },
        { transaction },
      );

      await queryInterface.addColumn(
        "internal_assessment",
        "class_section_term_id",
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: "class_section_term",
            key: "class_section_term_id",
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        { transaction },
      );

      await queryInterface.addColumn(
        "internal_assessment",
        "type",
        {
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Subcategory like Assignment, Quiz",
        },
        { transaction },
      );

      await queryInterface.addColumn(
        "internal_assessment",
        "maximum_marks",
        {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        { transaction },
      );

      await queryInterface.addColumn(
        "internal_assessment",
        "issue_date",
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction },
      );

      await queryInterface.addColumn(
        "internal_assessment",
        "due_date",
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction },
      );

      await queryInterface.addColumn(
        "internal_assessment",
        "document_url",
        {
          type: Sequelize.STRING,
          allowNull: true,
          comment: "URL for the saved PDF document",
        },
        { transaction },
      );

      await queryInterface.addColumn(
        "internal_assessment",
        "mode",
        {
          type: Sequelize.ENUM("online", "offline"),
          allowNull: true,
        },
        { transaction },
      );

      await queryInterface.addColumn(
        "internal_assessment",
        "weightage_percentage",
        {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: true,
        },
        { transaction },
      );

      await queryInterface.addColumn(
        "internal_assessment",
        "normalized_max_marks",
        {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: true,
        },
        { transaction },
      );

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn("internal_assessment", "session_id", {
        transaction,
      });
      await queryInterface.removeColumn(
        "internal_assessment",
        "class_section_term_id",
        { transaction },
      );
      await queryInterface.removeColumn("internal_assessment", "type", {
        transaction,
      });
      await queryInterface.removeColumn(
        "internal_assessment",
        "maximum_marks",
        { transaction },
      );
      await queryInterface.removeColumn("internal_assessment", "issue_date", {
        transaction,
      });
      await queryInterface.removeColumn("internal_assessment", "due_date", {
        transaction,
      });
      await queryInterface.removeColumn("internal_assessment", "document_url", {
        transaction,
      });
      await queryInterface.removeColumn("internal_assessment", "mode", {
        transaction,
      });
      await queryInterface.removeColumn(
        "internal_assessment",
        "weightage_percentage",
        { transaction },
      );
      await queryInterface.removeColumn(
        "internal_assessment",
        "normalized_max_marks",
        { transaction },
      );
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
