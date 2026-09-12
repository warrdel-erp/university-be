'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableName = 'employee_office';
    const table = await queryInterface.describeTable(tableName);

    if (table.deleted_at) {
      await queryInterface.removeColumn(tableName, 'deleted_at');
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableName = 'employee_office';
    const table = await queryInterface.describeTable(tableName);

    if (!table.deleted_at) {
      await queryInterface.addColumn(tableName, 'deleted_at', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }
  }
};
