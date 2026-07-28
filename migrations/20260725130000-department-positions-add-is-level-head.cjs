'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const description = await queryInterface.describeTable('department_positions');
    if (description.is_level_head) {
      return;
    }

    await queryInterface.addColumn('department_positions', 'is_level_head', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  async down(queryInterface) {
    const description = await queryInterface.describeTable('department_positions');
    if (!description.is_level_head) {
      return;
    }

    await queryInterface.removeColumn('department_positions', 'is_level_head');
  },
};
