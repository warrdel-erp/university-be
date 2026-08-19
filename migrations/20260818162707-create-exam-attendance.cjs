"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.dropTable("exam_attendance", { force: true, cascade: true }).catch(() => {});

    await queryInterface.createTable("exam_attendance", {
      exam_attendance_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      exam_schedule_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "exam_schedule",
          key: "exam_schedule_id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      exam_schedule_room_capacity_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "exam_schedule_room_capacity",
          key: "exam_schedule_room_capacity_id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      student_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "students",
          key: "student_id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      student_exam_seat_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "student_exam_seat",
          key: "student_exam_seat_id"
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      attendance_status: {
        type: Sequelize.ENUM("PRESENT", "ABSENT"),
        allowNull: false
      },
      marked_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id"
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      marked_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      remarks: {
        type: Sequelize.TEXT,
        allowNull: true
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
      academic_year_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "acedmic_year",
          key: "acedmic_year_id"
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
        allowNull: true,
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
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("exam_attendance");
  }
};
