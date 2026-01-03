'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("grade_pass_fail", {
      grade_pass_fail_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },

      grade_course_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "grade_course",
          key: "grade_course_id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },

      exam_setup_type_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "exam_setup_type",
          key: "exam_setup_type_id"
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },

      overall_minimum: {
        type: Sequelize.INTEGER,
        allowNull: true
      },

      theory_minimum: {
        type: Sequelize.INTEGER,
        allowNull: true
      },

      practical_minimum: {
        type: Sequelize.INTEGER,
        allowNull: true
      },

      minimum_passing_grade: {
        type: Sequelize.INTEGER,
        allowNull: true
      },

      component_wise_pass: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
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
    await queryInterface.dropTable("grade_pass_fail");
  }
};