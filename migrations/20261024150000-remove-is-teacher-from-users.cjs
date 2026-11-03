'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('users');
    if (tableInfo && tableInfo.is_teacher) {
      await queryInterface.removeColumn('users', 'is_teacher');
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('users');
    if (tableInfo && !tableInfo.is_teacher) {
      await queryInterface.addColumn('users', 'is_teacher', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }
  }
};
