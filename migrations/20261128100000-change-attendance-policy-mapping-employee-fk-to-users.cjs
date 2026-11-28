'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Check if attendance_policy_mappings table exists
    const [tables] = await queryInterface.sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attendance_policy_mappings'
    `);
    if (tables.length === 0) return;

    // 2. Drop any foreign key constraint on employee_id referencing employee table
    const [invalidFks] = await queryInterface.sequelize.query(`
      SELECT CONSTRAINT_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'attendance_policy_mappings'
        AND COLUMN_NAME = 'employee_id'
        AND REFERENCED_TABLE_NAME = 'employee'
    `);

    for (const fk of invalidFks) {
      console.log(`Dropping FK on attendance_policy_mappings: ${fk.CONSTRAINT_NAME}`);
      await queryInterface.sequelize.query(
        `ALTER TABLE \`attendance_policy_mappings\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``
      );
    }

    // 3. Add foreign key referencing users table (user_id) if not already present
    const [validFks] = await queryInterface.sequelize.query(`
      SELECT CONSTRAINT_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'attendance_policy_mappings'
        AND COLUMN_NAME = 'employee_id'
        AND REFERENCED_TABLE_NAME = 'users'
    `);

    if (validFks.length === 0) {
      console.log('Adding foreign key constraint (employee_id -> users.user_id) on attendance_policy_mappings...');
      await queryInterface.sequelize.query(`
        ALTER TABLE \`attendance_policy_mappings\`
        ADD CONSTRAINT \`attendance_policy_mappings_user_id_fk\`
        FOREIGN KEY (\`employee_id\`) REFERENCES \`users\` (\`user_id\`)
        ON DELETE CASCADE ON UPDATE CASCADE
      `);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      const [fks] = await queryInterface.sequelize.query(`
        SELECT CONSTRAINT_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'attendance_policy_mappings'
          AND COLUMN_NAME = 'employee_id'
          AND REFERENCED_TABLE_NAME = 'users'
      `);

      for (const fk of fks) {
        await queryInterface.sequelize.query(
          `ALTER TABLE \`attendance_policy_mappings\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``
        );
      }

      // Re-add FK to employee
      await queryInterface.sequelize.query(`
        ALTER TABLE \`attendance_policy_mappings\`
        ADD CONSTRAINT \`attendance_policy_mappings_employee_id_fk\`
        FOREIGN KEY (\`employee_id\`) REFERENCES \`employee\` (\`employee_id\`)
        ON DELETE CASCADE ON UPDATE CASCADE
      `);
    } catch (err) {
      console.error('Error during rollback of attendance_policy_mappings foreign key:', err.message);
    }
  },
};
