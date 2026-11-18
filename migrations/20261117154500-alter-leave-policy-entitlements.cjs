'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      const rawTables = await queryInterface.showAllTables({ transaction: t });
      const tableNames = rawTables.map((tbl) =>
        typeof tbl === 'string' ? tbl : tbl.tableName || tbl.name || String(tbl)
      );

      if (!tableNames.includes('leave_policy_entitlements')) {
        return;
      }

      const tableDesc = await queryInterface.describeTable('leave_policy_entitlements', { transaction: t });
      const hasLeaveTypes = tableNames.includes('leave_types');

      // 1. Rename primary key entitlement_id -> id if present
      if (tableDesc['entitlement_id'] && !tableDesc['id']) {
        await queryInterface.renameColumn('leave_policy_entitlements', 'entitlement_id', 'id', { transaction: t });
        await queryInterface.sequelize.query(
          'ALTER TABLE `leave_policy_entitlements` MODIFY COLUMN `id` INT NOT NULL AUTO_INCREMENT',
          { transaction: t }
        );
      }

      // 2. Add new columns from proposed schema
      if (!tableDesc['leave_type_id']) {
        const leaveTypeIdDef = {
          type: Sequelize.INTEGER,
          allowNull: true,
        };
        if (hasLeaveTypes) {
          leaveTypeIdDef.references = {
            model: 'leave_types',
            key: 'id',
          };
          leaveTypeIdDef.onUpdate = 'CASCADE';
          leaveTypeIdDef.onDelete = 'SET NULL';
        }
        await queryInterface.addColumn('leave_policy_entitlements', 'leave_type_id', leaveTypeIdDef, { transaction: t });
      }

      if (!tableDesc['custom_leave_name']) {
        await queryInterface.addColumn(
          'leave_policy_entitlements',
          'custom_leave_name',
          {
            type: Sequelize.STRING(100),
            allowNull: true,
          },
          { transaction: t }
        );
      }

      if (!tableDesc['annual_entitlement']) {
        await queryInterface.addColumn(
          'leave_policy_entitlements',
          'annual_entitlement',
          {
            type: Sequelize.DECIMAL(5, 2),
            allowNull: true,
          },
          { transaction: t }
        );
      }

      if (!tableDesc['entitlement_unit']) {
        await queryInterface.addColumn(
          'leave_policy_entitlements',
          'entitlement_unit',
          {
            type: Sequelize.STRING(20),
            allowNull: true,
            defaultValue: 'Days',
          },
          { transaction: t }
        );
      }

      if (!tableDesc['on_joining_rule']) {
        await queryInterface.addColumn(
          'leave_policy_entitlements',
          'on_joining_rule',
          {
            type: Sequelize.STRING(100),
            allowNull: true,
          },
          { transaction: t }
        );
      }

      if (!tableDesc['on_separation_rule']) {
        await queryInterface.addColumn(
          'leave_policy_entitlements',
          'on_separation_rule',
          {
            type: Sequelize.STRING(100),
            allowNull: true,
          },
          { transaction: t }
        );
      }

      if (!tableDesc['rounding_rule']) {
        await queryInterface.addColumn(
          'leave_policy_entitlements',
          'rounding_rule',
          {
            type: Sequelize.STRING(50),
            allowNull: true,
          },
          { transaction: t }
        );
      }

      if (!tableDesc['distribution_frequency']) {
        await queryInterface.addColumn(
          'leave_policy_entitlements',
          'distribution_frequency',
          {
            type: Sequelize.STRING(50),
            allowNull: true,
          },
          { transaction: t }
        );
      }

      if (!tableDesc['distribution_method']) {
        await queryInterface.addColumn(
          'leave_policy_entitlements',
          'distribution_method',
          {
            type: Sequelize.STRING(50),
            allowNull: true,
          },
          { transaction: t }
        );
      }

      // 3. Backfill data from old columns before dropping them
      if (tableDesc['leave_type']) {
        await queryInterface.sequelize.query(
          'UPDATE `leave_policy_entitlements` SET `custom_leave_name` = `leave_type` WHERE `custom_leave_name` IS NULL',
          { transaction: t }
        );
      }
      if (tableDesc['entitlement_annual']) {
        await queryInterface.sequelize.query(
          'UPDATE `leave_policy_entitlements` SET `annual_entitlement` = `entitlement_annual` WHERE `annual_entitlement` IS NULL',
          { transaction: t }
        );
      }
      if (tableDesc['credit_method']) {
        await queryInterface.sequelize.query(
          'UPDATE `leave_policy_entitlements` SET `distribution_frequency` = `credit_method` WHERE `distribution_frequency` IS NULL',
          { transaction: t }
        );
      }

      // Ensure non-null values for required fields
      await queryInterface.sequelize.query(
        "UPDATE `leave_policy_entitlements` SET `custom_leave_name` = 'Leave' WHERE `custom_leave_name` IS NULL",
        { transaction: t }
      );
      await queryInterface.sequelize.query(
        "UPDATE `leave_policy_entitlements` SET `annual_entitlement` = 0 WHERE `annual_entitlement` IS NULL",
        { transaction: t }
      );

      await queryInterface.changeColumn(
        'leave_policy_entitlements',
        'custom_leave_name',
        {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        { transaction: t }
      );

      await queryInterface.changeColumn(
        'leave_policy_entitlements',
        'annual_entitlement',
        {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: false,
        },
        { transaction: t }
      );

      // 4. Remove old columns that are not in the proposed schema
      const oldColumns = [
        'leave_type',
        'leave_code',
        'entitlement_annual',
        'credit_method',
        'carry_forward',
        'max_carry_forward_days',
        'maximum_consecutive_days',
        'key_rules',
        'status',
      ];

      for (const col of oldColumns) {
        if (tableDesc[col]) {
          await queryInterface.removeColumn('leave_policy_entitlements', col, { transaction: t });
        }
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      const rawTables = await queryInterface.showAllTables({ transaction: t });
      const tableNames = rawTables.map((tbl) =>
        typeof tbl === 'string' ? tbl : tbl.tableName || tbl.name || String(tbl)
      );

      if (!tableNames.includes('leave_policy_entitlements')) {
        return;
      }

      const tableDesc = await queryInterface.describeTable('leave_policy_entitlements', { transaction: t });

      // 1. Re-add old columns
      if (!tableDesc['leave_type']) {
        await queryInterface.addColumn(
          'leave_policy_entitlements',
          'leave_type',
          {
            type: Sequelize.STRING(100),
            allowNull: true,
          },
          { transaction: t }
        );
      }

      if (!tableDesc['leave_code']) {
        await queryInterface.addColumn(
          'leave_policy_entitlements',
          'leave_code',
          {
            type: Sequelize.STRING(20),
            allowNull: true,
            defaultValue: 'LV',
          },
          { transaction: t }
        );
      }

      if (!tableDesc['entitlement_annual']) {
        await queryInterface.addColumn(
          'leave_policy_entitlements',
          'entitlement_annual',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            defaultValue: 0,
          },
          { transaction: t }
        );
      }

      if (!tableDesc['credit_method']) {
        await queryInterface.addColumn(
          'leave_policy_entitlements',
          'credit_method',
          {
            type: Sequelize.ENUM('Monthly', 'Yearly', 'Quarterly'),
            allowNull: true,
            defaultValue: 'Monthly',
          },
          { transaction: t }
        );
      }

      if (!tableDesc['carry_forward']) {
        await queryInterface.addColumn(
          'leave_policy_entitlements',
          'carry_forward',
          {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          { transaction: t }
        );
      }

      if (!tableDesc['max_carry_forward_days']) {
        await queryInterface.addColumn(
          'leave_policy_entitlements',
          'max_carry_forward_days',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            defaultValue: 0,
          },
          { transaction: t }
        );
      }

      if (!tableDesc['maximum_consecutive_days']) {
        await queryInterface.addColumn(
          'leave_policy_entitlements',
          'maximum_consecutive_days',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          { transaction: t }
        );
      }

      if (!tableDesc['key_rules']) {
        await queryInterface.addColumn(
          'leave_policy_entitlements',
          'key_rules',
          {
            type: Sequelize.JSON,
            allowNull: true,
          },
          { transaction: t }
        );
      }

      if (!tableDesc['status']) {
        await queryInterface.addColumn(
          'leave_policy_entitlements',
          'status',
          {
            type: Sequelize.STRING(50),
            allowNull: false,
            defaultValue: 'Configured',
          },
          { transaction: t }
        );
      }

      // 2. Re-populate data back
      if (tableDesc['custom_leave_name']) {
        await queryInterface.sequelize.query(
          'UPDATE `leave_policy_entitlements` SET `leave_type` = `custom_leave_name` WHERE `leave_type` IS NULL',
          { transaction: t }
        );
      }
      if (tableDesc['annual_entitlement']) {
        await queryInterface.sequelize.query(
          'UPDATE `leave_policy_entitlements` SET `entitlement_annual` = ROUND(`annual_entitlement`) WHERE `entitlement_annual` IS NULL',
          { transaction: t }
        );
      }
      if (tableDesc['distribution_frequency']) {
        await queryInterface.sequelize.query(
          "UPDATE `leave_policy_entitlements` SET `credit_method` = CASE WHEN `distribution_frequency` IN ('Monthly', 'Yearly', 'Quarterly') THEN `distribution_frequency` ELSE 'Monthly' END WHERE `credit_method` IS NULL",
          { transaction: t }
        );
      }

      // Rename id -> entitlement_id
      if (tableDesc['id'] && !tableDesc['entitlement_id']) {
        await queryInterface.renameColumn('leave_policy_entitlements', 'id', 'entitlement_id', { transaction: t });
        await queryInterface.sequelize.query(
          'ALTER TABLE `leave_policy_entitlements` MODIFY COLUMN `entitlement_id` INT NOT NULL AUTO_INCREMENT',
          { transaction: t }
        );
      }

      // 3. Remove new columns
      const newColumns = [
        'leave_type_id',
        'custom_leave_name',
        'annual_entitlement',
        'entitlement_unit',
        'on_joining_rule',
        'on_separation_rule',
        'rounding_rule',
        'distribution_frequency',
        'distribution_method',
      ];

      for (const col of newColumns) {
        if (tableDesc[col]) {
          await queryInterface.removeColumn('leave_policy_entitlements', col, { transaction: t });
        }
      }
    });
  },
};
