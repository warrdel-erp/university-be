'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Drop the role_permission_mapping table if it exists
    const tables = await queryInterface.showAllTables();
    if (tables.includes('role_permission_mapping')) {
      await queryInterface.dropTable('role_permission_mapping');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Recreate the table if rolling back
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('role_permission_mapping')) {
      await queryInterface.createTable('role_permission_mapping', {
        role_permission_mapping_id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        role_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'role',
            key: 'role_id'
          }
        },
        permission_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        scope_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      });
    }
  }
};
