'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('billing_schedule_items', 'name', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Optional custom name for this specific billing schedule',
      after: 'fee_plan_item_id'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('billing_schedule_items', 'name');
  }
};
