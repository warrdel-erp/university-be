"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      "billing_schedule_sub_items",
      {
        billing_schedule_sub_item_id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        billing_schedule_item_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: "billing_schedule_items",
            key: "billing_schedule_item_id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        fee_plan_sub_item_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: "fee_plan_sub_items",
            key: "fee_plan_sub_item_id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        amount: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0.0,
        },
        university_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: "university",
            key: "university_id",
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        institute_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: "institute",
            key: "institute_id",
          },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT",
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
      },
      {
        charset: "latin1",
        collate: "latin1_swedish_ci",
      }
    );

    await queryInterface.addIndex("billing_schedule_sub_items", ["billing_schedule_item_id"], {
      name: "idx_billing_sched_sub_items_item_id",
    });

    await queryInterface.addIndex("billing_schedule_sub_items", ["fee_plan_sub_item_id"], {
      name: "idx_billing_sched_sub_items_plan_sub_id",
    });

    await queryInterface.addIndex(
      "billing_schedule_sub_items",
      ["university_id", "institute_id"],
      {
        name: "idx_billing_sched_sub_items_tenant",
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable("billing_schedule_sub_items");
  },
};
