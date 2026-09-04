"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.createTable(
        "student_result",
        {
          student_result_id: {
            type: Sequelize.BIGINT,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          examination_session_id: {
            type: Sequelize.BIGINT,
            allowNull: false,
            references: {
              model: "examination_session",
              key: "examination_session_id",
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          student_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: "students",
              key: "student_id",
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          course_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: "course",
              key: "course_id",
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          session_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: "session",
              key: "session_id",
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          term: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          total_credits: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
          },
          earned_credits: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
          },
          total_marks: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
          },
          obtained_marks: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
          },
          percentage: {
            type: Sequelize.DECIMAL(5, 2),
            allowNull: true,
          },
          sgpa: {
            type: Sequelize.DECIMAL(4, 2),
            allowNull: true,
          },
          cgpa: {
            type: Sequelize.DECIMAL(4, 2),
            allowNull: true,
          },
          result_status: {
            type: Sequelize.STRING(50),
            allowNull: true,
          },
          university_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: "university",
              key: "university_id",
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          institute_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: "institute",
              key: "institute_id",
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          acedmic_year_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: "acedmic_year",
              key: "acedmic_year_id",
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
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
        "student_result",
        ["examination_session_id", "student_id"],
        {
          name: "idx_student_result_session_student",
          transaction,
        },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.dropTable("student_result", { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
