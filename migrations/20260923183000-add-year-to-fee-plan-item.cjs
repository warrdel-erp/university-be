'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('fee_plan_item');
    if (!desc.year) {
      await queryInterface.addColumn('fee_plan_item', 'year', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Programme year level (1, 2, 3...)',
      });
    }
  },

  async down(queryInterface) {
    const desc = await queryInterface.describeTable('fee_plan_item');
    if (desc.year) {
      await queryInterface.removeColumn('fee_plan_item', 'year');
    }
  },
};
