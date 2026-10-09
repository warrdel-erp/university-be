"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      "billing_schedule_payment_terms",
      {
        billing_schedule_payment_terms_id: {
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
        installment: {
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
      },
      {
        charset: "latin1",
        collate: "latin1_swedish_ci",
      }
    );

    await queryInterface.addIndex("billing_schedule_payment_terms", ["billing_schedule_item_id"], {
      name: "idx_billing_sched_payment_terms_item_id",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("billing_schedule_payment_terms");
  },
};
