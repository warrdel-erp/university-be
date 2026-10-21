"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      const [cols] = await queryInterface.sequelize.query(
        "SHOW COLUMNS FROM `student_result`;",
        { transaction }
      );
      const colNames = new Set(cols.map((c) => c.Field));

      if (!colNames.has("z_score")) {
        await queryInterface.addColumn(
          "student_result",
          "z_score",
          {
            type: Sequelize.DECIMAL(6, 4),
            allowNull: true,
            comment: "Z-score calculated for relative grading",
          },
          { transaction }
        );
      }

      if (!colNames.has("grade")) {
        await queryInterface.addColumn(
          "student_result",
          "grade",
          {
            type: Sequelize.STRING(10),
            allowNull: true,
            comment: "Assigned grade e.g. O, A+, A, B, F",
          },
          { transaction }
        );
      }

      if (!colNames.has("grade_point")) {
        await queryInterface.addColumn(
          "student_result",
          "grade_point",
          {
            type: Sequelize.DECIMAL(4, 2),
            allowNull: true,
            comment: "Grade points e.g. 10.0, 9.0",
          },
          { transaction }
        );
      }

      if (!colNames.has("grading_id")) {
        await queryInterface.addColumn(
          "student_result",
          "grading_id",
          {
            type: Sequelize.BIGINT,
            allowNull: true,
            references: {
              model: "grading",
              key: "grading_id",
            },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          { transaction }
        );
      }
    });
  },

  async down(queryInterface) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      const [cols] = await queryInterface.sequelize.query(
        "SHOW COLUMNS FROM `student_result`;",
        { transaction }
      );
      const colNames = new Set(cols.map((c) => c.Field));

      if (colNames.has("grading_id")) {
        await queryInterface.removeColumn("student_result", "grading_id", { transaction });
      }
      if (colNames.has("grade_point")) {
        await queryInterface.removeColumn("student_result", "grade_point", { transaction });
      }
      if (colNames.has("grade")) {
        await queryInterface.removeColumn("student_result", "grade", { transaction });
      }
      if (colNames.has("z_score")) {
        await queryInterface.removeColumn("student_result", "z_score", { transaction });
      }
    });
  },
};
