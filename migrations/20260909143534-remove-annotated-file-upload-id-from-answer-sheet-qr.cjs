"use strict";

/**
 * Revert annotated_file_upload_id on answer_sheet_qr.
 * Annotated PDF linking is unused; annotations are stored as JSON instead.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const description = await queryInterface.describeTable("answer_sheet_qr", {
        transaction,
      });

      if (description.annotated_file_upload_id) {
        await queryInterface.removeColumn(
          "answer_sheet_qr",
          "annotated_file_upload_id",
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
      const description = await queryInterface.describeTable("answer_sheet_qr", {
        transaction,
      });

      if (!description.annotated_file_upload_id) {
        await queryInterface.addColumn(
          "answer_sheet_qr",
          "annotated_file_upload_id",
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: "s3_files",
              key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
            comment: "Annotated/marked PDF after evaluation",
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
};
