'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('user_role_permission_scope', 'role_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Note: Reverting this might fail if there are records with role_id = NULL
    await queryInterface.changeColumn('user_role_permission_scope', 'role_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
  }
};
