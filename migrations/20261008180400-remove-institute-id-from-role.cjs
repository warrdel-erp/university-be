'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if the column exists before dropping it to prevent errors
    const tableDescription = await queryInterface.describeTable('role');
    if (tableDescription.institute_id) {
      await queryInterface.removeColumn('role', 'institute_id');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Re-add the column if we rollback
    const tableDescription = await queryInterface.describeTable('role');
    if (!tableDescription.institute_id) {
      await queryInterface.addColumn('role', 'institute_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Multi-tenant isolation for roles'
      });
    }
  }
};
