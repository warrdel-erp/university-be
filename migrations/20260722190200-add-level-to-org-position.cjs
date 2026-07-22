'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('org_position');
    if (table.level) {
      return;
    }

    await queryInterface.addColumn('org_position', 'level', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    });
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('org_position');
    if (!table.level) {
      return;
    }

    await queryInterface.removeColumn('org_position', 'level');
  },
};
