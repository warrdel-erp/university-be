'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableName = 'employee_office';

    // Remove the column
    await queryInterface.removeColumn(tableName, 'deleted_at');
  },

  down: async (queryInterface, Sequelize) => {
    const tableName = 'employee_office';

    await queryInterface.addColumn(tableName, 'deleted_at', {
      type: Sequelize.DATE,
      allowNull: true
    });
  }
};
