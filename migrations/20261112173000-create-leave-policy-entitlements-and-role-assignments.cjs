'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      const rawTables = await queryInterface.showAllTables({ transaction: t });
      const tables = rawTables.map((tbl) =>
        typeof tbl === 'string' ? tbl : tbl.tableName || tbl.name || String(tbl)
      );

      // 1. Extend leave_policies table with basic details fields from UI
      if (tables.includes('leave_policies')) {
        const leavePolicyDesc = await queryInterface.describeTable('leave_policies', { transaction: t });

        if (!leavePolicyDesc['policy_code']) {
          await queryInterface.addColumn(
            'leave_policies',
            'policy_code',
            {
              type: Sequelize.STRING(50),
              allowNull: true,
            },
            { transaction: t }
          );
        }

        if (!leavePolicyDesc['leave_year_type']) {
          await queryInterface.addColumn(
            'leave_policies',
            'leave_year_type',
            {
              type: Sequelize.STRING(100),
              allowNull: true,
              defaultValue: 'Academic Year',
            },
            { transaction: t }
          );
        }

        if (!leavePolicyDesc['description']) {
          await queryInterface.addColumn(
            'leave_policies',
            'description',
            {
              type: Sequelize.TEXT,
              allowNull: true,
            },
            { transaction: t }
          );
        }

        if (!leavePolicyDesc['effective_from']) {
          await queryInterface.addColumn(
            'leave_policies',
            'effective_from',
            {
              type: Sequelize.DATEONLY,
              allowNull: true,
            },
            { transaction: t }
          );
        }

        if (!leavePolicyDesc['effective_to']) {
          await queryInterface.addColumn(
            'leave_policies',
            'effective_to',
            {
              type: Sequelize.DATEONLY,
              allowNull: true,
            },
            { transaction: t }
          );
        }

        if (!leavePolicyDesc['status']) {
          await queryInterface.addColumn(
            'leave_policies',
            'status',
            {
              type: Sequelize.ENUM('Draft', 'Published', 'Archived'),
              allowNull: false,
              defaultValue: 'Draft',
            },
            { transaction: t }
          );
        }

        // Allow total_leaves_per_year to be optional since entitlements define the breakdown
        if (leavePolicyDesc['total_leaves_per_year']) {
          await queryInterface.changeColumn(
            'leave_policies',
            'total_leaves_per_year',
            {
              type: Sequelize.INTEGER,
              allowNull: true,
              defaultValue: 0,
            },
            { transaction: t }
          );
        }
      }

      // 2. Create leave_policy_entitlements table
      if (!tables.includes('leave_policy_entitlements')) {
        await queryInterface.createTable(
          'leave_policy_entitlements',
          {
            entitlement_id: {
              type: Sequelize.INTEGER,
              primaryKey: true,
              autoIncrement: true,
              allowNull: false,
            },
            policy_id: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                model: 'leave_policies',
                key: 'policy_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
            },
            leave_type: {
              type: Sequelize.STRING(100),
              allowNull: false,
            },
            leave_code: {
              type: Sequelize.STRING(20),
              allowNull: false,
            },
            entitlement_annual: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: 0,
            },
            credit_method: {
              type: Sequelize.ENUM('Monthly', 'Yearly', 'Quarterly'),
              allowNull: false,
              defaultValue: 'Monthly',
            },
            carry_forward: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: false,
            },
            max_carry_forward_days: {
              type: Sequelize.INTEGER,
              allowNull: true,
              defaultValue: 0,
            },
            maximum_consecutive_days: {
              type: Sequelize.INTEGER,
              allowNull: true,
            },
            key_rules: {
              type: Sequelize.JSON,
              allowNull: true,
            },
            status: {
              type: Sequelize.STRING(50),
              allowNull: false,
              defaultValue: 'Configured',
            },
            created_at: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            deleted_at: {
              type: Sequelize.DATE,
              allowNull: true,
            },
          },
          { transaction: t }
        );
      }

      // 3. Create leave_policy_roles table
      if (!tables.includes('leave_policy_roles')) {
        await queryInterface.createTable(
          'leave_policy_roles',
          {
            id: {
              type: Sequelize.INTEGER,
              primaryKey: true,
              autoIncrement: true,
              allowNull: false,
            },
            policy_id: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                model: 'leave_policies',
                key: 'policy_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
            },
            role_id: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                model: 'role',
                key: 'role_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
            },
            assignment_mode: {
              type: Sequelize.ENUM('ALL', 'SELECTED'),
              allowNull: false,
              defaultValue: 'ALL',
            },
            effective_from: {
              type: Sequelize.DATEONLY,
              allowNull: false,
            },
            effective_to: {
              type: Sequelize.DATEONLY,
              allowNull: true,
            },
            university_id: {
              type: Sequelize.INTEGER,
              allowNull: true,
            },
            institute_id: {
              type: Sequelize.INTEGER,
              allowNull: true,
            },
            campus_id: {
              type: Sequelize.INTEGER,
              allowNull: true,
            },
            created_at: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            deleted_at: {
              type: Sequelize.DATE,
              allowNull: true,
            },
          },
          { transaction: t }
        );
      }

      // 4. Create leave_policy_employees table
      if (!tables.includes('leave_policy_employees')) {
        await queryInterface.createTable(
          'leave_policy_employees',
          {
            id: {
              type: Sequelize.INTEGER,
              primaryKey: true,
              autoIncrement: true,
              allowNull: false,
            },
            policy_role_id: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                model: 'leave_policy_roles',
                key: 'id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
            },
            user_id: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                model: 'users',
                key: 'user_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
            },
            is_active: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: true,
            },
            created_at: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            deleted_at: {
              type: Sequelize.DATE,
              allowNull: true,
            },
          },
          { transaction: t }
        );
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.dropTable('leave_policy_employees', { transaction: t });
      await queryInterface.dropTable('leave_policy_roles', { transaction: t });
      await queryInterface.dropTable('leave_policy_entitlements', { transaction: t });
      // Clean up added columns in leave_policies
      const columns = ['policy_code', 'leave_year_type', 'description', 'effective_from', 'effective_to', 'status'];
      for (const col of columns) {
        try {
          await queryInterface.removeColumn('leave_policies', col, { transaction: t });
        } catch (e) {}
      }
    });
  },
};

