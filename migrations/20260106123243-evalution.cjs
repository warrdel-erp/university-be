'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("evalutions", {
      evalution_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
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

      subject_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "subject",
          key: "subject_id"
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },

      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "employee",
          key: "employee_id"
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },

      notes: {
        type: Sequelize.STRING,
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
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      },

      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("evalutions");
  }
};