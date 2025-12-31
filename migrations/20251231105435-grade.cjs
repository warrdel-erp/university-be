'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("grade", {
      grade_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },

      university_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "university",
          key: "university_id"
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },

      institute_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "institute",
          key: "institute_id"
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },

      scheme_name: {
        type: Sequelize.STRING,
        allowNull: false
      },

      regulation_code: {
        type: Sequelize.STRING,
        allowNull: true
      },

      grading_type: {
        type: Sequelize.STRING,
        allowNull: false
      },

      marks_system: {
        type: Sequelize.STRING,
        allowNull: false
      },

      gps_formula: {
        type: Sequelize.STRING,
        allowNull: false
      },

      decimal_precision: {
        type: Sequelize.STRING,
        allowNull: true
      },

      rounding_rule: {
        type: Sequelize.STRING,
        allowNull: true
      },

      include_failed_subject_in_gpa: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      },

      include_semester: {
        type: Sequelize.STRING,
        allowNull: true
      },

      grade_replacement_rule: {
        type: Sequelize.STRING,
        allowNull: false
      },

      max_attempts_allowed: {
        type: Sequelize.STRING,
        allowNull: false
      },

      improvement_allowed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },

      carry_internal_marks_in_backlogs: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },

      grade_marks_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },

      max_grace_per_subjects: {
        type: Sequelize.STRING,
        allowNull: false
      },

      max_grace_per_semester: {
        type: Sequelize.STRING,
        allowNull: false
      },

      apply_grace: {
        type: Sequelize.STRING,
        allowNull: false
      },

      moderation_type: {
        type: Sequelize.STRING,
        allowNull: false
      },

      moderation_value: {
        type: Sequelize.STRING,
        allowNull: false
      },

      minimum_attendance: {
        type: Sequelize.STRING,
        allowNull: true
      },

      condonation_allowed: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: true
      },

      condonation_limit: {
        type: Sequelize.INTEGER,
        allowNull: true
      },

      if_attendance_minimum: {
        type: Sequelize.STRING,
        allowNull: true
      },

      result_status: {
        type: Sequelize.STRING,
        allowNull: true
      },

      save_type: {
        type: Sequelize.ENUM("DRAFT", "FINAL"),
        allowNull: false
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
    // ENUM cleanup first (important for MySQL)
    await queryInterface.dropTable("grade");
    await queryInterface.sequelize.query(
      "DROP TYPE IF EXISTS enum_grade_save_type;"
    );
  }
};
