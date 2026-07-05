'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add institute_id column to role table
    await queryInterface.addColumn('role', 'institute_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Multi-tenant isolation for roles'
    });

    // Update ENUM for scope column in role_permissions table
    await queryInterface.changeColumn('role_permissions', 'scope', {
      type: Sequelize.ENUM('OWN', 'CLASS', 'DEPARTMENT', 'INSTITUTE', 'CAMPUS', 'UNIVERSITY'),
      allowNull: false,
      defaultValue: 'INSTITUTE',
      comment: 'Scope level from const/scopes.js'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove institute_id column
    await queryInterface.removeColumn('role', 'institute_id');

    // Revert ENUM for scope column (Optional depending on DB dialect constraints)
    await queryInterface.changeColumn('role_permissions', 'scope', {
      type: Sequelize.ENUM('OWN', 'CLASS', 'DEPARTMENT', 'INSTITUTE'),
      allowNull: false,
      defaultValue: 'INSTITUTE'
    });
  }
};
