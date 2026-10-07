'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Remove due_date and index from billing_schedule_items
    try {
      const bsiDesc = await queryInterface.describeTable('billing_schedule_items');
      if (bsiDesc.due_date) {
        try {
          await queryInterface.removeIndex('billing_schedule_items', 'idx_billing_schedule_items_due_date');
        } catch {
          // Index may not exist or may have different name
        }
        await queryInterface.removeColumn('billing_schedule_items', 'due_date');
      }
    } catch {
      // Table billing_schedule_items may not exist in some environments
    }

    // 2. Remove due_date and academic_period from fee_plan_item
    try {
      const fpiDesc = await queryInterface.describeTable('fee_plan_item');
      if (fpiDesc.due_date) {
        await queryInterface.removeColumn('fee_plan_item', 'due_date');
      }
      if (fpiDesc.academic_period) {
        await queryInterface.removeColumn('fee_plan_item', 'academic_period');
      }
    } catch {
      // Table fee_plan_item may not exist in some environments
    }
  },

  async down(queryInterface, Sequelize) {
    // Revert fee_plan_item columns
    try {
      const fpiDesc = await queryInterface.describeTable('fee_plan_item');
      if (!fpiDesc.due_date) {
        await queryInterface.addColumn('fee_plan_item', 'due_date', {
          type: Sequelize.DATEONLY,
          allowNull: true,
        });
      }
      if (!fpiDesc.academic_period) {
        await queryInterface.addColumn('fee_plan_item', 'academic_period', {
          type: Sequelize.STRING(100),
          allowNull: true,
          comment: 'Academic period tag (e.g. Semester I)',
        });
      }
    } catch {}

    // Revert billing_schedule_items columns
    try {
      const bsiDesc = await queryInterface.describeTable('billing_schedule_items');
      if (!bsiDesc.due_date) {
        await queryInterface.addColumn('billing_schedule_items', 'due_date', {
          type: Sequelize.DATEONLY,
          allowNull: true,
        });
        await queryInterface.addIndex('billing_schedule_items', ['due_date'], {
          name: 'idx_billing_schedule_items_due_date',
        });
      }
    } catch {}
  },
};
