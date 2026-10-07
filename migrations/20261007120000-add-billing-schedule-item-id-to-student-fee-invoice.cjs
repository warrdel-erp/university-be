"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable("student_fee_invoice");

    if (!desc.billing_schedule_item_id) {
      await queryInterface.addColumn("student_fee_invoice", "billing_schedule_item_id", {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "billing_schedule_items",
          key: "billing_schedule_item_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });

      await queryInterface.addIndex("student_fee_invoice", ["billing_schedule_item_id"], {
        name: "idx_student_fee_invoice_billing_sched_item_id",
      });
    }
  },

  async down(queryInterface) {
    const desc = await queryInterface.describeTable("student_fee_invoice");
    if (desc.billing_schedule_item_id) {
      try {
        await queryInterface.removeIndex(
          "student_fee_invoice",
          "idx_student_fee_invoice_billing_sched_item_id"
        );
      } catch (e) {
        // ignore if index doesn't exist
      }
      await queryInterface.removeColumn("student_fee_invoice", "billing_schedule_item_id");
    }
  },
};
