'use strict';

module.exports = {
  up: async (queryInterface) => {
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
      await queryInterface.sequelize.query(
        `UPDATE \`${tableName}\`
         SET \`deleted_at\` = NULL
         WHERE CAST(\`deleted_at\` AS CHAR) IN ('0000-00-00 00:00:00', '0000-00-00', '0', '000000000')`
      );
    }
  },

  down: async () => {
    // no-op: data normalization is intentionally irreversible
  }
};
