'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("grade_scale", {
      grade_scale_id: {
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

      grade: {
        type: Sequelize.STRING,
        allowNull: false
      },

      minimun: {
        type: Sequelize.INTEGER,
        allowNull: true
      },

      maximum: {
        type: Sequelize.INTEGER,
        allowNull: true
      },

      grade_point: {
        type: Sequelize.FLOAT,
        allowNull: false
      },

      result: {
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
    await queryInterface.dropTable("grade_scale");
  }
};
