"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("exam_room_material_bundle", {
      exam_room_material_bundle_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      exam_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
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
      status: {
        type: Sequelize.ENUM("PREPARING", "READY", "ISSUED", "RECEIVED", "VERIFIED", "CLOSED"),
        allowNull: false,
        defaultValue: "PREPARING"
      },
      issued_to: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id"
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      issued_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id"
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      issued_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      received_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id"
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      received_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      verified_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id"
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      verified_at: {
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

    await queryInterface.createTable("exam_room_material_item", {
      exam_room_material_item_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      exam_room_material_bundle_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "exam_room_material_bundle",
          key: "exam_room_material_bundle_id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      item_type: {
        type: Sequelize.ENUM("ANSWER_SHEET", "EXTRA_SHEET", "GRAPH_SHEET", "ROUGH_SHEET", "ATTENDANCE_SHEET", "ROOM_KIT"),
        allowNull: false
      },
      planned_quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      issued_quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      used_quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      unused_quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      returned_quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      damaged_quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      remarks: {
        type: Sequelize.TEXT,
        allowNull: true
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
    await queryInterface.dropTable("exam_room_material_item");
    await queryInterface.dropTable("exam_room_material_bundle");
  }
};
