'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('time_table_structure', 'starting_date', {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });
    await queryInterface.addColumn('time_table_structure', 'ending_date', {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('time_table_structure', 'ending_date');
    await queryInterface.removeColumn('time_table_structure', 'starting_date');
  },
};
