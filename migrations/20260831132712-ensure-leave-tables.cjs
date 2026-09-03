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

    const tables = await queryInterface.showAllTables();

    // Ensure leave_requests table and its columns
    if (!tables.includes('leave_requests')) {
      await queryInterface.createTable('leave_requests', leaveRequestsSchema);
    } else {
      const tableInfo = await queryInterface.describeTable('leave_requests');
      for (const [columnName, columnDef] of Object.entries(leaveRequestsSchema)) {
        if (!tableInfo[columnName]) {
          await queryInterface.addColumn('leave_requests', columnName, columnDef);
        }
      }
    }

    // Ensure leave_balance table and its columns
    if (!tables.includes('leave_balance')) {
      await queryInterface.createTable('leave_balance', leaveBalanceSchema);
    } else {
      const tableInfo = await queryInterface.describeTable('leave_balance');
      for (const [columnName, columnDef] of Object.entries(leaveBalanceSchema)) {
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
