'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // leave_requests schema
    const leaveRequestsSchema = {
      request_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'user_id' } },
      university_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'university', key: 'university_id' } },
      campus_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'campus', key: 'campus_id' } },
      institute_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'institute', key: 'institute_id' } },
      department_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'department', key: 'department_id' } },
      policy_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'leave_policies', key: 'policy_id' } },
      start_date: { type: Sequelize.DATEONLY, allowNull: false },
      end_date: { type: Sequelize.DATEONLY, allowNull: false },
      total_days: { type: Sequelize.INTEGER, allowNull: false },
      reason: { type: Sequelize.TEXT, allowNull: true },
      status: { type: Sequelize.ENUM('pending', 'approved', 'rejected', 'cancelled'), defaultValue: 'pending' },
      reviewed_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'user_id' } },
      reviewed_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    };

    // leave_balance schema
    const leaveBalanceSchema = {
      balance_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'user_id' } },
      policy_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'leave_policies', key: 'policy_id' } },
      year: { type: Sequelize.INTEGER, allowNull: false },
      total_allocated: { type: Sequelize.INTEGER, allowNull: false },
      used_leaves: { type: Sequelize.INTEGER, defaultValue: 0 },
      remaining_leaves: { type: Sequelize.INTEGER, allowNull: false }
    };

    const rawTables = await queryInterface.showAllTables();
    const tables = rawTables.map((t) => (typeof t === 'string' ? t : t.tableName || t.name || String(t)));

    // Helper to backfill and transition user_id from employee_id safely
    const ensureUserIdWithBackfill = async (tableName) => {
      const tableDesc = await queryInterface.describeTable(tableName);

      // 1. Add user_id as nullable without constraint first if missing
      if (!tableDesc['user_id']) {
        await queryInterface.addColumn(tableName, 'user_id', {
          type: Sequelize.INTEGER,
          allowNull: true
        });
      }

      // 2. Backfill user_id
      if (tableDesc['employee_id']) {
        // Backfill from employee table
        await queryInterface.sequelize.query(`
          UPDATE \`${tableName}\` t
          JOIN employee e ON e.employee_id = t.employee_id
          SET t.user_id = e.user_id
          WHERE t.user_id IS NULL AND e.user_id IS NOT NULL;
        `).catch((err) => console.warn(`Backfill from employee failed on ${tableName}:`, err.message));

        // Backfill if employee_id already matched a user_id
        await queryInterface.sequelize.query(`
          UPDATE \`${tableName}\` t
          JOIN users u ON u.user_id = t.employee_id
          SET t.user_id = u.user_id
          WHERE t.user_id IS NULL AND t.employee_id IS NOT NULL;
        `).catch((err) => console.warn(`Backfill from users failed on ${tableName}:`, err.message));
      }

      // 3. Remove orphan rows where user_id could not be resolved or doesn't exist in users table
      await queryInterface.sequelize.query(`
        DELETE FROM \`${tableName}\`
        WHERE user_id IS NULL OR user_id NOT IN (SELECT user_id FROM users);
      `).catch((err) => console.warn(`Orphan cleanup failed on ${tableName}:`, err.message));

      // 4. Clean up employee_id foreign keys and column if present
      if (tableDesc['employee_id']) {
        try {
          const refs = await queryInterface.getForeignKeyReferencesForTable(tableName);
          const employeeFk = refs.find((r) => r.columnName === 'employee_id');
          if (employeeFk) {
            await queryInterface.removeConstraint(tableName, employeeFk.constraintName);
          }
        } catch (e) {}

        const legacyFkNames = ['fk_leave_employee_id', 'fk_request_employee', 'fk_balance_employee'];
        for (const fkName of legacyFkNames) {
          try {
            await queryInterface.removeConstraint(tableName, fkName);
          } catch (e) {}
        }

        try {
          await queryInterface.removeColumn(tableName, 'employee_id');
        } catch (e) {}
      }

      // 5. Ensure user_id is NOT NULL
      await queryInterface.changeColumn(tableName, 'user_id', {
        type: Sequelize.INTEGER,
        allowNull: false
      });

      // 6. Ensure foreign key constraint on user_id exists
      const refs = await queryInterface.getForeignKeyReferencesForTable(tableName);
      const userFk = refs.find((r) => r.columnName === 'user_id');
      if (!userFk) {
        await queryInterface.addConstraint(tableName, {
          fields: ['user_id'],
          type: 'foreign key',
          name: `${tableName}_user_id_fk`,
          references: {
            table: 'users',
            field: 'user_id'
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        });
      }
    };

    // Ensure leave_requests table and its columns
    if (!tables.includes('leave_requests')) {
      await queryInterface.createTable('leave_requests', leaveRequestsSchema);
    } else {
      await ensureUserIdWithBackfill('leave_requests');

      const tableInfo = await queryInterface.describeTable('leave_requests');
      for (const [columnName, columnDef] of Object.entries(leaveRequestsSchema)) {
        if (columnName === 'user_id') continue;
        if (!tableInfo[columnName]) {
          await queryInterface.addColumn('leave_requests', columnName, columnDef);
        }
      }
    }

    // Ensure leave_balance table and its columns
    if (!tables.includes('leave_balance')) {
      await queryInterface.createTable('leave_balance', leaveBalanceSchema);
    } else {
      await ensureUserIdWithBackfill('leave_balance');

      const tableInfo = await queryInterface.describeTable('leave_balance');
      for (const [columnName, columnDef] of Object.entries(leaveBalanceSchema)) {
        if (columnName === 'user_id') continue;
        if (!tableInfo[columnName]) {
          await queryInterface.addColumn('leave_balance', columnName, columnDef);
        }
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // Optionally drop tables, but usually migrations like this are tricky to safely rollback.
    // We will just leave them or drop them if they exist.
    await queryInterface.dropTable('leave_requests');
    await queryInterface.dropTable('leave_balance');
  }
};
