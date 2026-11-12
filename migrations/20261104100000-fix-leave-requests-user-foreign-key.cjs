'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Check if leave_requests table exists
    const [tables] = await queryInterface.sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'leave_requests'
    `);
    if (tables.length === 0) return;

    // 2. Find any foreign keys on leave_requests.user_id referencing employee table
    const [invalidFks] = await queryInterface.sequelize.query(`
      SELECT CONSTRAINT_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'leave_requests'
        AND COLUMN_NAME = 'user_id'
        AND (REFERENCED_TABLE_NAME = 'employee' OR CONSTRAINT_NAME = 'fk_leave_request_employee_id')
    `);

    for (const fk of invalidFks) {
      console.log(`Dropping invalid FK constraint on leave_requests: ${fk.CONSTRAINT_NAME}`);
      await queryInterface.sequelize.query(
        `ALTER TABLE \`leave_requests\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``
      );
    }

    // 3. Check if foreign key on leave_requests.user_id referencing users table already exists
    const [validFks] = await queryInterface.sequelize.query(`
      SELECT CONSTRAINT_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'leave_requests'
        AND COLUMN_NAME = 'user_id'
        AND REFERENCED_TABLE_NAME = 'users'
    `);

    if (validFks.length === 0) {
      console.log('Adding correct foreign key constraint (user_id -> users.user_id) on leave_requests...');
      await queryInterface.sequelize.query(`
        ALTER TABLE \`leave_requests\`
        ADD CONSTRAINT \`leave_requests_user_id_fk\`
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`user_id\`)
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
          AND TABLE_NAME = 'leave_requests'
          AND CONSTRAINT_NAME = 'leave_requests_user_id_fk'
      `);
      if (fks.length > 0) {
        await queryInterface.sequelize.query(
          `ALTER TABLE \`leave_requests\` DROP FOREIGN KEY \`leave_requests_user_id_fk\``
        );
      }
    } catch (err) {
      console.error('Error during rollback of leave_requests user foreign key:', err.message);
    }
  },
};
