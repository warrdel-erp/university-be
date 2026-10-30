"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // 1. Table `grading`
      const [gradingCols] = await queryInterface.sequelize.query(
        "SHOW COLUMNS FROM `grading`;",
        { transaction }
      );
      const gradingColNames = new Set(gradingCols.map((c) => c.Field));

      if (!gradingColNames.has("distribution_method")) {
        await queryInterface.addColumn(
          "grading",
          "distribution_method",
          {
            type: Sequelize.ENUM(
              "PERCENTILE",
              "BELL_CURVE",
              "Z_SCORE",
              "MANUAL_DISTRIBUTION"
            ),
            allowNull: true,
          },
          { transaction }
        );
      }

      if (!gradingColNames.has("relative_config")) {
        await queryInterface.addColumn(
          "grading",
          "relative_config",
          {
            type: Sequelize.JSON,
            allowNull: true,
          },
          { transaction }
        );
      }

      // 2. Table `grading_grade`
      const [gradeCols] = await queryInterface.sequelize.query(
        "SHOW COLUMNS FROM `grading_grade`;",
        { transaction }
      );
      const gradeColNames = new Set(gradeCols.map((c) => c.Field));

      // Make min_percentage and max_percentage nullable to accommodate relative schemas
      if (gradeColNames.has("min_percentage")) {
        await queryInterface.changeColumn(
          "grading_grade",
          "min_percentage",
          {
            type: Sequelize.DECIMAL(5, 2),
            allowNull: true,
          },
          { transaction }
        );
      }

      if (gradeColNames.has("max_percentage")) {
        await queryInterface.changeColumn(
          "grading_grade",
          "max_percentage",
          {
            type: Sequelize.DECIMAL(5, 2),
            allowNull: true,
          },
          { transaction }
        );
      }

      if (!gradeColNames.has("lower_bound")) {
        await queryInterface.addColumn(
          "grading_grade",
          "lower_bound",
          {
            type: Sequelize.DECIMAL(5, 2),
            allowNull: true,
          },
          { transaction }
        );
      }

      if (!gradeColNames.has("upper_bound")) {
        await queryInterface.addColumn(
          "grading_grade",
          "upper_bound",
          {
            type: Sequelize.DECIMAL(5, 2),
            allowNull: true,
          },
          { transaction }
        );
      }

      if (!gradeColNames.has("expected_students_percentage")) {
        await queryInterface.addColumn(
          "grading_grade",
          "expected_students_percentage",
          {
            type: Sequelize.DECIMAL(5, 2),
            allowNull: true,
          },
          { transaction }
        );
      }

      if (!gradeColNames.has("is_rule_based")) {
        await queryInterface.addColumn(
          "grading_grade",
          "is_rule_based",
          {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          { transaction }
        );
      }
    });
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // 1. Table `grading`
      const [gradingCols] = await queryInterface.sequelize.query(
        "SHOW COLUMNS FROM `grading`;",
        { transaction }
      );
      const gradingColNames = new Set(gradingCols.map((c) => c.Field));

      if (gradingColNames.has("relative_config")) {
        await queryInterface.removeColumn("grading", "relative_config", {
          transaction,
        });
      }
      if (gradingColNames.has("distribution_method")) {
        await queryInterface.removeColumn("grading", "distribution_method", {
          transaction,
        });
      }

      // 2. Table `grading_grade`
      const [gradeCols] = await queryInterface.sequelize.query(
        "SHOW COLUMNS FROM `grading_grade`;",
        { transaction }
      );
      const gradeColNames = new Set(gradeCols.map((c) => c.Field));

      if (gradeColNames.has("is_rule_based")) {
        await queryInterface.removeColumn("grading_grade", "is_rule_based", {
          transaction,
        });
      }
      if (gradeColNames.has("expected_students_percentage")) {
        await queryInterface.removeColumn(
          "grading_grade",
          "expected_students_percentage",
          { transaction }
        );
      }
      if (gradeColNames.has("upper_bound")) {
        await queryInterface.removeColumn("grading_grade", "upper_bound", {
          transaction,
        });
      }
      if (gradeColNames.has("lower_bound")) {
        await queryInterface.removeColumn("grading_grade", "lower_bound", {
          transaction,
        });
      }
    });
  },
};
