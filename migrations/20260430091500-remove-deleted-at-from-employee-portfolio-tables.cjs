'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = [
      'employee_skill',
      'employee_documents',
      'employee_qualification',
      'employee_experiance',
      'employee_achievements',
      'employee_ward',
      'employee_activity',
      'employee_reference',
      'employee_research',
      'employee_long_leave'
    ];

    for (const tableName of tables) {
      await queryInterface.bulkDelete(tableName, {
        deleted_at: {
          [Sequelize.Op.ne]: null
        }
      });

      await queryInterface.removeColumn(tableName, 'deleted_at');
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tables = [
      'employee_skill',
      'employee_documents',
      'employee_qualification',
      'employee_experiance',
      'employee_achievements',
      'employee_ward',
      'employee_activity',
      'employee_reference',
      'employee_research',
      'employee_long_leave'
    ];

    for (const tableName of tables) {
      await queryInterface.addColumn(tableName, 'deleted_at', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }
  }
};
