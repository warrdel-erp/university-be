"use strict";

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("answersheet_evalution_user_assignment", {
    assignment_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    university_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "university",
        key: "university_id",
      },
    },
    institute_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "institute",
        key: "institute_id",
      },
    },
    acedmic_year_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "acedmic_year",
        key: "acedmic_year_id",
      },
    },
    assigned_to_user_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
    },
    notes: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    timestamp: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    created_by: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
    },
    updated_by: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
  });

  await queryInterface.addColumn("answer_sheet_qr", "assignment_id", {
    type: Sequelize.INTEGER,
    allowNull: true,
    references: {
      model: "answersheet_evalution_user_assignment",
      key: "assignment_id",
    },
    after: "assigned_to_user",
  });
}

export async function down(queryInterface) {
  await queryInterface.removeColumn("answer_sheet_qr", "assignment_id");
  await queryInterface.dropTable("answersheet_evalution_user_assignment");
}
