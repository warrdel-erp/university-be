'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add institute_id column to role table if it doesn't exist
    const roleTableDef = await queryInterface.describeTable('role').catch(() => null);
    if (roleTableDef && !roleTableDef.institute_id) {
      await queryInterface.addColumn('role', 'institute_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Multi-tenant isolation for roles'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove institute_id column
    await queryInterface.removeColumn('role', 'institute_id').catch(() => {});
  }
};
