'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const desc = await queryInterface.describeTable('students');
    if (desc.fee_plan_profile_id) {
      await queryInterface.removeColumn('students', 'fee_plan_profile_id');
    }
  },

  async down(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('students');
    if (!desc.fee_plan_profile_id) {
      await queryInterface.addColumn('students', 'fee_plan_profile_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
  },
};
