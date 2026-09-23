'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('fee_plan_item');
    if (!desc.name) {
      await queryInterface.addColumn('fee_plan_item', 'name', {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Planned fee receipt label',
      });
    }
    if (!desc.academic_period) {
      await queryInterface.addColumn('fee_plan_item', 'academic_period', {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Academic period tag (e.g. Semester I)',
      });
    }
  },

  async down(queryInterface) {
    const desc = await queryInterface.describeTable('fee_plan_item');
    if (desc.academic_period) {
      await queryInterface.removeColumn('fee_plan_item', 'academic_period');
    }
    if (desc.name) {
      await queryInterface.removeColumn('fee_plan_item', 'name');
    }
  },
};
