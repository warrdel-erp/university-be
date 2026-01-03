'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("grade_course", {
      grade_course_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },

      grade_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "grade",
          key: "grade_id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },

      acedmic_year_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "acedmic_year",
          key: "acedmic_year_id"
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },

      course_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "course",
          key: "course_id"
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },

      session_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "session",
          key: "session_id"
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },

      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "user_id"
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },

      updated_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "user_id"
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      },

      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      },

      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("grade_course");
  }
};
