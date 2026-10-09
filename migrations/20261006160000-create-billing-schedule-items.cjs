"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      "billing_schedule_items",
      {
        billing_schedule_item_id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        fee_plan_item_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: "fee_plan_item",
            key: "fee_plan_item_id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        amount: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0.0,
        },
        due_date: {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        planned_date: {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        status: {
          type: Sequelize.STRING(50),
          allowNull: false,
          defaultValue: "pending",
          comment: "Status of the billing schedule item (e.g. pending, scheduled, billed, cancelled)",
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

    await queryInterface.addIndex("billing_schedule_items", ["fee_plan_item_id"], {
      name: "idx_billing_schedule_items_fee_plan_item_id",
    });

    await queryInterface.addIndex("billing_schedule_items", ["status"], {
      name: "idx_billing_schedule_items_status",
    });

    await queryInterface.addIndex("billing_schedule_items", ["due_date"], {
      name: "idx_billing_schedule_items_due_date",
    });

    await queryInterface.addIndex("billing_schedule_items", ["planned_date"], {
      name: "idx_billing_schedule_items_planned_date",
    });

    await queryInterface.addIndex("billing_schedule_items", ["university_id", "institute_id"], {
      name: "idx_billing_schedule_items_tenant",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("billing_schedule_items");
  },
};
