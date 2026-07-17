'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      // 1. Create scopes table
      await queryInterface.createTable('scopes', {
        scope_id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        scope_key: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true
        },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        deleted_at: { type: Sequelize.DATE, allowNull: true }
      }, { transaction: t });

      // Seed default scopes
      await queryInterface.bulkInsert('scopes', [
        { scope_key: 'OWN', created_at: new Date(), updated_at: new Date() },
        { scope_key: 'CLASS', created_at: new Date(), updated_at: new Date() },
        { scope_key: 'DEPARTMENT', created_at: new Date(), updated_at: new Date() },
        { scope_key: 'INSTITUTE', created_at: new Date(), updated_at: new Date() }
      ], { transaction: t });

      // 2. Add is_default column to role table
      // First check if role table exists and has is_default. If not, add it.
      const roleTableDef = await queryInterface.describeTable('role').catch(() => null);
      if (roleTableDef && !roleTableDef.is_default) {
        await queryInterface.addColumn('role', 'is_default', {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          allowNull: false
        }, { transaction: t });
      }

      // 3. Create hod_departments table
      await queryInterface.createTable('hod_departments', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'user_id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        department_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'department', key: 'department_id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        deleted_at: { type: Sequelize.DATE, allowNull: true }
      }, { transaction: t });

      // 4. Create role_permissions table
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
      }, { transaction: t });

      // 5. Alter user_roles table to use role_id instead of role ENUM
      await queryInterface.dropTable('user_roles', { transaction: t }).catch(() => {});
      await queryInterface.createTable('user_roles', {
        user_role_id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'user_id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        role_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'role', key: 'role_id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        deleted_at: { type: Sequelize.DATE, allowNull: true }
      }, { transaction: t });

      // 6. Alter user_permissions table to use permissionId and scopeId
      await queryInterface.dropTable('user_permissions', { transaction: t }).catch(() => {});
      await queryInterface.createTable('user_permissions', {
        user_permission_id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'user_id' },
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
        is_allowed: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      }, { transaction: t });

    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.dropTable('user_permissions', { transaction: t });
      await queryInterface.dropTable('user_roles', { transaction: t });
      await queryInterface.dropTable('role_permissions', { transaction: t });
      await queryInterface.dropTable('hod_departments', { transaction: t });
      await queryInterface.removeColumn('role', 'is_default', { transaction: t }).catch(() => {});
      await queryInterface.dropTable('scopes', { transaction: t });
    });
  }
};
