'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Drop the old role_permissions table which used permission_id and scope_id FKs
    await queryInterface.dropTable('role_permissions');

    // Recreate the role_permissions table matching the rolePermissionMappingModel schema
    await queryInterface.createTable('role_permissions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      role_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'role', key: 'role_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      permission: {
        type: Sequelize.STRING,
        allowNull: false
      },
      scope: {
        type: Sequelize.ENUM('OWN', 'CLASS', 'DEPARTMENT', 'INSTITUTE', 'CAMPUS', 'UNIVERSITY'),
        allowNull: false,
        defaultValue: 'INSTITUTE'
      },
      resource_id: {
        type: Sequelize.INTEGER,
        allowNull: true
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
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });
  },

  async down (queryInterface, Sequelize) {
    // Revert to the old structure
    await queryInterface.dropTable('role_permissions');

    await queryInterface.createTable('role_permissions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      role_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'role', key: 'role_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      permission_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'permission', key: 'permission_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      scope_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'scopes', key: 'scope_id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });
  }
};
