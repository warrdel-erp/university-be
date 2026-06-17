'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('time_table_structure', 'session_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'session',
        key: 'session_id',
      },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('time_table_structure', 'session_id');
  },
};
