"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("exam_invigilator_assignment", {
      exam_invigilator_assignment_id: {
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
      examination_session_slot_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: "examination_session_slot",
          key: "examination_session_slot_id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      exam_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      class_room_section_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "class_room_section",
          key: "class_room_section_id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "user_id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      role: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      assigned_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "user_id"
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
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("exam_invigilator_assignment");
  }
};
