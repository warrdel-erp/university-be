'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const definition = await queryInterface.describeTable('students');
    if (definition.fee_plan_profile_id) return;

    await queryInterface.addColumn('students', 'fee_plan_profile_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'fee_plan_profile', key: 'fee_plan_profile_id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface) {
    const definition = await queryInterface.describeTable('students');
    if (!definition.fee_plan_profile_id) return;

    await queryInterface.removeColumn('students', 'fee_plan_profile_id');
  },
};
