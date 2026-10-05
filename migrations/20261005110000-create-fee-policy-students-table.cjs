"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("fee_policy_students", {
      fee_policy_student_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      fee_policy_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "fee_policy",
          key: "fee_policy_id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      student_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "students",
          key: "student_id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      university_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      institute_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addIndex("fee_policy_students", ["fee_policy_id", "student_id"], {
      unique: true,
      name: "uq_fee_policy_student",
    });

    await queryInterface.addIndex("fee_policy_students", ["student_id"], {
      name: "idx_fee_policy_students_student_id",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("fee_policy_students");
  },
};
