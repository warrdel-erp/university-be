'use strict';

const { departmentTypes } = require('../constant.js');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('department');
    if (table.department_type) {
      return;
    }

    await queryInterface.addColumn('department', 'department_type', {
      type: Sequelize.ENUM(...departmentTypes),
      allowNull: false,
      defaultValue: 'Academic',
      after: 'department_code',
    });
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('department');
    if (!table.department_type) {
      return;
    }

    await queryInterface.removeColumn('department', 'department_type');
  },
};
