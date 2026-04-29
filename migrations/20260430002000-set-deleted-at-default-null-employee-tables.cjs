'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = [
      'employee',
      'employee_address',
      'employee_cor_address',
      'employee_office',
      'employee_rolls',
      'employee_skill',
      'employee_documents',
      'employee_qualification',
      'employee_experiance',
      'employee_achievements',
      'employee_ward',
      'employee_activity',
      'employee_reference',
      'employee_research',
      'employee_long_leave',
      'employee_meta_data',
      'employee_files'
    ];

    for (const tableName of tables) {
      const tableDef = await queryInterface.describeTable(tableName);
      if (!tableDef.deleted_at) continue;

      // Normalize legacy zero-date values first; strict SQL mode rejects
      // schema changes while invalid datetime values still exist.
      // Use a temporary valid timestamp in case the column is NOT NULL.
      await queryInterface.sequelize.query(
        `UPDATE \`${tableName}\`
         SET \`deleted_at\` = '1970-01-01 00:00:01'
         WHERE CAST(\`deleted_at\` AS CHAR) IN ('0000-00-00 00:00:00', '0000-00-00', '0', '000000000')`
      );

      await queryInterface.changeColumn(tableName, 'deleted_at', {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null
      });

      await queryInterface.sequelize.query(
        `UPDATE \`${tableName}\`
         SET \`deleted_at\` = NULL
         WHERE \`deleted_at\` = '1970-01-01 00:00:01'`
      );
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tables = [
      'employee',
      'employee_address',
      'employee_cor_address',
      'employee_office',
      'employee_rolls',
      'employee_skill',
      'employee_documents',
      'employee_qualification',
      'employee_experiance',
      'employee_achievements',
      'employee_ward',
      'employee_activity',
      'employee_reference',
      'employee_research',
      'employee_long_leave',
      'employee_meta_data',
      'employee_files'
    ];

    for (const tableName of tables) {
      const tableDef = await queryInterface.describeTable(tableName);
      if (!tableDef.deleted_at) continue;

      await queryInterface.changeColumn(tableName, 'deleted_at', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }
  }
};
