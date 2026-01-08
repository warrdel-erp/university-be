'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      UPDATE users u
      JOIN employee e 
          ON TRIM(LOWER(u.user_name)) = TRIM(LOWER(e.employee_name))
      JOIN employee_address ea 
          ON e.employee_id = ea.employee_id
      SET u.email = ea.offical_email_id
      WHERE u.role = 'teacher'
        AND (u.email IS NULL OR u.email = '' OR u.email = 'NULL')
        AND ea.offical_email_id IS NOT NULL 
        AND ea.offical_email_id != '';
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      UPDATE users u
      JOIN employee e 
          ON TRIM(LOWER(u.user_name)) = TRIM(LOWER(e.employee_name))
      JOIN employee_address ea 
          ON e.employee_id = ea.employee_id
      SET u.email = NULL
      WHERE u.role = 'teacher'
        AND u.email = ea.offical_email_id;
    `);
  }
};