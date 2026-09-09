"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const tables = await queryInterface.showAllTables();
      const normalized = tables.map((t) =>
        typeof t === "string" ? t.toLowerCase() : String(t).toLowerCase(),
      );

      if (!normalized.includes("answer_sheet_annotation")) {
        await queryInterface.createTable(
          "answer_sheet_annotation",
          {
            answer_sheet_annotation_id: {
              type: Sequelize.INTEGER,
              primaryKey: true,
              autoIncrement: true,
              allowNull: false,
            },
            answer_sheet_qr_id: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                model: "answer_sheet_qr",
                key: "id",
              },
              onUpdate: "CASCADE",
              onDelete: "CASCADE",
            },
            annotation_data: {
              type: Sequelize.JSON,
              allowNull: false,
            },
            version: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: 1,
            },
            status: {
              type: Sequelize.ENUM("draft", "saved", "submitted"),
              allowNull: false,
              defaultValue: "saved",
            },
            acedmic_year_id: {
              type: Sequelize.INTEGER,
              allowNull: true,
              references: {
                model: "acedmic_year",
                key: "acedmic_year_id",
              },
              onUpdate: "CASCADE",
              onDelete: "SET NULL",
            },
            institute_id: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                model: "institute",
                key: "institute_id",
              },
              onUpdate: "CASCADE",
              onDelete: "RESTRICT",
            },
            university_id: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                model: "university",
                key: "university_id",
              },
              onUpdate: "CASCADE",
              onDelete: "RESTRICT",
            },
            created_by: {
              type: Sequelize.INTEGER,
              allowNull: true,
              references: {
                model: "users",
                key: "user_id",
              },
              onUpdate: "CASCADE",
              onDelete: "SET NULL",
            },
            updated_by: {
              type: Sequelize.INTEGER,
              allowNull: true,
              references: {
                model: "users",
                key: "user_id",
              },
              onUpdate: "CASCADE",
              onDelete: "SET NULL",
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
          },
          { transaction },
        );

        await queryInterface.addIndex(
          "answer_sheet_annotation",
          ["answer_sheet_qr_id"],
          {
            name: "idx_answer_sheet_annotation_qr_id",
            transaction,
          },
        );

        await queryInterface.addIndex(
          "answer_sheet_annotation",
          ["answer_sheet_qr_id", "version"],
          {
            unique: true,
            name: "unique_answer_sheet_annotation_qr_version",
            transaction,
          },
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
      const tables = await queryInterface.showAllTables();
      const normalized = tables.map((t) =>
        typeof t === "string" ? t.toLowerCase() : String(t).toLowerCase(),
      );

      if (normalized.includes("answer_sheet_annotation")) {
        await queryInterface.dropTable("answer_sheet_annotation", {
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
